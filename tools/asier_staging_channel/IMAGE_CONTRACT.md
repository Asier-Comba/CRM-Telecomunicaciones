# Staging image contract and promotion procedure (W5, preparation only)

Status: PROPOSED. Nothing here publishes, writes packages, creates credentials or
deploys. `deploying_authorized` is always `false`; Work owns EasyPanel/VPS/Compose.

## 1. Why the push must preserve digests (review of PR #209 `07a2a6b`)

`07a2a6b` (byte-identical in #206 `6564dac`) withholds the receipt when the
registry manifest differs from `proof.subjects.manifest_digest`. That guard is
correct and is kept. But the existing `docker-session.mjs` publishes with
`docker image tag` + `docker push`, and Docker produces the registry manifest
(and recompresses the layers) **at push time**. So any manifest digest attested
before the push would not normally match the pushed one: with that session a
real run would publish and then always withhold the receipt (failing closed,
but never producing a candidate). The simulated tests cannot show this because
their doubles return the expected bytes.

Fix (new files, existing publisher/driver unchanged):
`oci-layout.mjs` verifies a local OCI layout (index → single linux/amd64
manifest, every blob hash/size, every layer's diff_id against `rootfs`, then
the shared `registryImageEvidence` runtime/label checks). `crane-session.mjs`
implements the same `{login,push,cleanup}` session as `dockerSessionActions`
but uploads **those exact layout bytes** (`crane push <layout>`) and requires
crane to report `repository@<verified manifest digest>`. The provenance subject,
scan subject (config digest = image ID) and registry digest then coincide by
construction. The `image-channel-lab` workflow job proves this on a real runner
against a loopback registry (no GHCR); see §5 for what counts as real.

## 2. Image identity (all must match; mismatch = BLOCKED)

| Field | Source of truth |
|---|---|
| `source` | 40-hex commit checked out; `git status` clean |
| `tree` | `git rev-parse HEAD^{tree}` |
| `lockfile_sha256` | sha256 of `package-lock.json` bytes at that tree |
| `dockerfile_sha256` | sha256 of `infra/deployment/Dockerfile` (existing; no new packager) |
| `public_build_sha256` | `publicBuildIdentity` of the 3 browser-public values (fingerprint only) |
| `image_config_digest` | built image ID = scanned image (`trivy` Metadata.ImageID) |
| `manifest_digest` | layout `index.json` descriptor = provenance subject = registry digest |

The five source fields are also image labels (`--label` at build), checked by
`registryImageEvidence`. Labels bind evidence; they never prove authenticity.

## 3. Receipt consumed by Compose preflight

`staging.image.receipt.v1` exactly as `contract.validateReceipt` defines it:
`version, source, tree, lockfile_sha256, dockerfile_sha256, public_build_sha256,
image_config_digest, manifest_digest, image_reference
(ghcr.io/asier-comba/crm-telecom-staging@<manifest_digest>), visibility:"private"`.
`composePreflightV1` requires every service `image` to equal `image_reference`
and `pull_policy: never`, so the digest must be prefetched first with
`compose-pull-session.mjs` (pull by digest, owned 0700 config, cleanup).
The lab emits `staging.image.lab-receipt.v1`, which `validateReceipt` rejects by
shape; it can never reach Compose.

## 4. Proposed protected publication job (NOT in any workflow)

Add only after W4+W5 review of the exact workflow SHA and owner promotion
permission. Trigger `workflow_dispatch` on the default branch with input
`reviewed_source_sha`; `environment: staging-image-publish` with required
reviewer; job permissions exactly `contents: read, packages: write,
id-token: write, attestations: write`; no other job gets them.

1. Checkout `reviewed_source_sha`, `persist-credentials: false`; assert HEAD and
   clean tree; compute §2 identity with the real public values (`vars.*`, never
   secrets).
2. Same path as the lab: `docker build --provenance=false --sbom=false` with the
   five labels → `docker image save` → `verifyOciLayoutV1`.
3. Gates, each recorded, none waivable: `image-scan.mjs` (trivy 0.75.0 vuln +
   secret on the built image), `npm audit --omit=dev --audit-level=high`, and W4's
   historical-literal layer scanner once delivered (until then: BLOCKED).
4. `actions/attest-build-provenance@4d101475d8b20a2381f78447822ac1eab6504dd8`
   (v4.2.2), `subject-name: ghcr.io/asier-comba/crm-telecom-staging`,
   `subject-digest: <layout manifest digest>`, `push-to-registry: false`.
   The repo is public, so this writes a public Sigstore/Rekor entry (repo,
   workflow, commit, digest; no secrets or values). Owner must accept that.
5. `verifyEvidence` port = `gh attestation verify <layout manifest blob> --bundle
   <bundle> --repo Asier-Comba/CRM-Telecomunicaciones --signer-workflow
   .../staging-image-channel.yml` plus the scan JSON subject check.
6. `publishCandidateV1` with `ghcr-read-transport` (package/tag/manifest reads)
   and `createCraneSession({repository: ghcr})` as `publisher.createSession`.
   Preconditions it enforces: package exists, private, linked to this repo
   (before and after); tag `sha-<source>-config-<public>` absent (only a 404
   counts); push; raw readback; receipt only if manifest = attested subject and
   credential cleanup PASS.
7. Privacy check: anonymous token request for the repository must be denied.
8. Temporary pull by digest on the runner via `prefetchComposeImageV1`; Id must
   equal `image_config_digest`; config dir removed and proven absent.
9. Upload receipt JSON (digests only) as artifact; post SHA/tree/digest to #67.

## 5. Evidence classes: never mix them

- SIMULATED: all `*.test.mjs` (doubles for registry, credentials, verifier).
  Includes the negative matrix: different manifest, same config/different
  manifest, modified layer, mutable tag, expired credential, network error,
  partial publish, cleanup failure, non-private package, package turning
  public, unknown provenance, provenance for another subject.
- REAL LAB: `oci-lab` job: real build of the existing Dockerfile with
  synthetic public bindings, real trivy, real layout verification, real
  digest-preserving push/readback/pull on a loopback registry. Not GHCR, not
  private, not provenance, not promotable.
- REAL REGISTRY: none yet. Requires §4 approved and run.

## 6. Rollback by previous digest (Work executes; W5 provides inputs)

1. Take the previous receipt `R_prev` from the #67 ledger / its workflow
   artifact. Never use a tag, and never retag or delete the bad version: keep
   it for forensics.
2. `R_prev.public_build_sha256` must equal the runtime binding in use.
   Otherwise rollback is BLOCKED: rebuild instead.
3. Image rollback does not roll back the schema. `R_prev`'s migration head must
   be compatible with the current database, or rollback is BLOCKED.
4. Run `composePreflightV1` with `R_prev` and its own expected identity until it
   returns `CONFIGURATION_CHECKED`.
5. `prefetchComposeImageV1(R_prev)` until `VERIFIED_LOCAL_DIGEST`.
6. Work switches the Compose `image` to `R_prev.image_reference` and redeploys
   under its own gates; record both digests in #67.

## 7. Known limits / open findings

- GHCR has no tag immutability: the absent-tag preflight cannot exclude a
  race with another writer that holds package write. Mitigation: a single
  environment-gated writer; consumers use digests only.
- The publisher requires an existing private package. First creation (the
  bootstrap seed in `bootstrap-private-package.mjs`) still has no reviewed
  transport, and this is the next blocker. `crane copy` of the pinned seed is
  the proposed transport.
- On the classic Docker store, `docker image save` layers are uncompressed
  (larger). GHCR private storage/transfer quota and cost are NOT verified, so
  confirm 0 EUR before the first publish.
- `docker-session.mjs` (existing, unchanged) stays usable after a failed
  cleanup: `cleaned` is set only on success. `crane-session.mjs` closes the
  session first. Low severity; for W4/W5 to decide.
- W4 historical findings remain open. Trivy's secret scan inspects the final
  layers only; it does not replace W4's historical-literal layer scan or the
  git-history audit.
