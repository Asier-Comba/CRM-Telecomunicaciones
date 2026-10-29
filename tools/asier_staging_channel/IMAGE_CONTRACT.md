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

## 4. Protected publication job (`staging-image-publish.yml`, INACTIVE)

The job exists but is unreachable (`if: false`). Removing that line is a
separately reviewed change after W4+W5 review of the exact SHA and owner
promotion permission. Even when active it runs only if ALL of these hold:
manual `workflow_dispatch` on a GitHub-hosted runner in this repository;
`github.sha == inputs.reviewed_source_sha` (dispatch at the reviewed ref, so the
Sigstore certificate's source digest IS the built source); and the protected
environment `staging-image-publish` variable `STAGING_IMAGE_APPROVED_SOURCE`
equals that SHA (second key). Workflow-level `permissions: {}`; the job alone
has `contents: read, packages: write, id-token: write, attestations: write`.

Steps (code in `publish-candidate.mjs`, shared build code in `candidate-build.mjs`):
1. Checkout the SHA without persisted credentials; pinned trivy 0.75.0 and crane
   0.22.1 (sha256 checked); `npm audit --omit=dev --audit-level=high`.
2. `build` phase: the same `buildCandidateLayoutV1` the lab ran (existing
   Dockerfile, five labels, existing scan gate, `docker image save` OCI layout,
   `verifyOciLayoutV1`). The scan must PASS before anything is attested.
3. `actions/attest-build-provenance@4d10147…` (v4.2.2) on
   `ghcr.io/asier-comba/crm-telecom-staging` + layout manifest digest,
   `push-to-registry: false`. Public repo ⇒ public Sigstore/Rekor entry (repo,
   workflow, commit, digest; no values). The owner must accept that.
4. `publish` phase: re-verify the layout (digest unchanged since attestation),
   then `publishCandidateV1` with real ports:
   - `verifyEvidence` = `scanResultV1` (pinned scanner, exact image/source, zero
     findings) + `ghAttestationVerifyV1` (`gh attestation verify <manifest blob>
     --bundle --repo --signer-workflow --source-digest --predicate-type
     --deny-self-hosted-runners`, then `provenanceResultV1` re-checks subject
     name+digest, signer workflow, hosted runner, dispatch trigger, source SHA);
   - publisher = `ghcr-read-transport` + `createCraneSession` (digest-preserving).
   The receipt exists only if the registry manifest = attested subject and
   credential cleanup PASS.
5. Privacy: package API `visibility: private` AND authenticated 200 for the
   digest AND anonymous token/manifest denied (`privacyResultV1`).
6. Temporary pull by digest: `prefetchComposeImageV1` with real ports (owned 0700
   config, stdin login, Id = config digest, logout + removal proven).
7. Artifacts: `staging-image-publication.safe.json` (always) and
   `staging-image-receipt.json` (only on full PASS), 90 days.

## 5. Evidence classes: never mix them

- SIMULATED: all `*.test.mjs` (doubles for registry, credentials, Sigstore,
  verifier). Includes the negative matrix: different manifest, same
  config/different manifest, modified layer, mutable tag, expired credential,
  network error, partial publish, cleanup failure, non-private package,
  package turning public, unknown provenance, provenance for another subject;
  and verifier truth tables for provenance, scan, privacy and the publish gate.
- REAL LAB: Actions run 40863379096 on `fce0e99` (contracts + `oci-lab`
  success). Docker 28.0.4/overlay2, crane 0.22.1; config
  `sha256:24d3a9d7…19bd5`, manifest `sha256:46efb1ec…8bd12`, 32 uncompressed
  layers (~222 MB); trivy PASS, 0 HIGH/CRITICAL, 0 secrets; loopback push digest
  preserved, overwrite guard, pull by digest, cleanup true. Synthetic public
  key: not promotable. Artifact `staging-image-channel-lab-safe` zip digest
  `sha256:af782bfd…48c9`; JSON sha256 `0bb43db0…37eb`.
- REAL LAB re-runs: `ed7b2d7` run 40865966928 (config `sha256:10c2b698…`,
  manifest `sha256:f2c80173…`) and `cf9293f` run 40866321392 (config
  `sha256:d1ddd193…`, manifest `sha256:69fec6b7…`, 222418432 bytes): both PASS
  with 0 HIGH/CRITICAL, 0 secrets, digest preserved, pull by digest, cleanup.
  Digests differ per SHA because the source labels differ.
- NOT DONE: W4 historical-literal layer scan, including the ten UNKNOWN-
  provenance fingerprints. W4's scanner (`ff2d4f4`, WIP, unpublished) and its
  contract are not available to W5; nothing is classified here.
- REAL REGISTRY (read-only observation, 29/10): anonymous GHCR token for
  `asier-comba/crm-telecom-staging` → 403 (repository absent); a public image →
  200/200. Nothing was written.
- REAL PUBLICATION: none. No digest exists in GHCR.

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

## 7. Known limits / open findings (blockers before first publish)

- Activation prerequisites (owner): create environment `staging-image-publish`
  with required reviewer and a deployment-branch policy limited to reviewed
  refs; set `STAGING_IMAGE_APPROVED_SOURCE` per candidate; the workflow file must
  exist on the default branch for dispatch, then dispatch with `--ref` at the
  reviewed branch whose head is the reviewed SHA.
- The publisher requires an existing private package linked to this repo. First
  creation is the inactive `bootstrap` job (`mode: bootstrap`, `bootstrap-transport.mjs`):
  absence must be proven by BOTH an authenticated package-API 404 and an
  authenticated registry `tags/list` 404 (403/unknown = unproven); then only the
  pinned public seed (`bootstrapSeedV1`, the existing Dockerfile build base) is
  copied digest-preserving to `:bootstrap-<sha>`; then private + repo-linked +
  anonymous denial are required. Separate owner key
  `STAGING_IMAGE_BOOTSTRAP_APPROVED_SOURCE`; no CRM code, receipt or attestation.
  Owner should confirm the new package is private and linked before candidate.
- `GITHUB_TOKEN` may get 403 on the user package API (`readPackage`): the job then
  fails closed. If so a fine-grained read token is an owner decision.
- GHCR has no tag immutability: the absent-tag preflight cannot exclude a race
  with another package writer. Single environment-gated writer; digests only.
- Anonymous denial alone cannot distinguish private from absent; privacy PASS
  always requires the authenticated read of the same digest.
- Layers are uncompressed (~222 MB per candidate on the lab). GHCR quota/cost
  NOT verified; confirm 0 EUR before the first publish.
- `docker-session.mjs` (existing, unchanged) stays usable after a failed
  cleanup; `crane-session.mjs` closes first. Low; for W4/W5.
- W4's historical literal layer scanner is not yet delivered; trivy's secret
  scan covers final layers only and does not replace it or the git-history
  audit. All-ref audit: 28 inherited findings (base 467 refs/1753 commits =
  28; `fce0e99` 468/1754 = 28; this branch adds none). Not resolved here.
