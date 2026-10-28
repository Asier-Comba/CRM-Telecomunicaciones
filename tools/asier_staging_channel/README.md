# Private staging image channel — inactive preparation

Target only `crm-inmobiliario/crm-telecom-staging`, internal3000. No source,
image, secret, network or runtime is configured in EasyPanel by these modules.
Existing Dockerfile/Unit60 packaging contract is reused; no new packager.

`contract.mjs` validates closed source/tree/lockfile/Dockerfile/public-config
identities and immutable manifest receipts. `oci-evidence.mjs` verifies raw
manifest/config hashes, structural linkage and bounded expected runtime fields.
Labels and these checks do not establish source authenticity, complete OCI/layer
conformance, private access, vulnerability safety or a successful runtime.

`publisher.mjs` is a capability-injected controller: exact successful build/scan
bindings; existing private package linked to the exact repository before/after;
reject any existing tag; login; push; real raw manifest/config readback; compare
the pushed config to the inspected local image; emit a private manifest receipt;
always clean credentials. No create, visibility update, deletion, rollback or
EasyPanel mutation exists. Remote publication may occur before failed readback;
the report preserves NOT_ATTEMPTED/OUTCOME_UNKNOWN/PUSH_SUCCEEDED_NOT_YET_VERIFIED/
VERIFIED_PRIVATE_DIGEST instead of inventing a rollback or false updated state.
Cleanup failure prevents PASS even after successful publication.

`ghcr-read-transport.mjs` supplies only GET/HEAD to fixed GitHub/GHCR endpoints.
Credential headers stay at their intended API/registry origin. Blob redirects
permit only HTTPS pkg-containers.githubusercontent.com, with no Authorization
header and no additional redirect. Unsupported hosts/indexes/formats fail closed.
Only a definitive404 means a tag is absent;403/errors never admit overwrite.
Raw response buffers are bounded1MiB, errors/report fields never contain payloads,
tokens, signed URLs, CLI output or arbitrary exception text.

`docker-session.mjs` is the live local CLI adapter, **not invoked by the workflow**.
It rejects ordinary/nonmanual/non-Linux/nonrepository execution before filesystem
or Docker effects. A future protected manual CI driver may create an owned700
temporary DOCKER_CONFIG under RUNNER_TEMP. Token is supplied through stdin, never
argv or logs; only PATH/HOME/that config reach Docker. Before tagging/pushing,
the current immutable local image ID must match the verified build; tagging uses
that ID, and destination ID is rechecked before push. A mutable local alias cannot
select different bytes. This does not make tags globally atomic against another
authorized writer. Cleanup attempts logout
and removes/verifies only that owned directory, even when logout fails; unexpected
filesystem errors cannot count as removal. A crashed job is not cleanup proof.
The pure command protocol allows injected login/push/logout/removal failures.

The controller accepts ports for testability; **those ports and JSON evidence are
not authorization**. A future independently reviewed protected driver must supply
actual source-bound CI/security/scan evidence, official base signature checks,
public-build/runtime correspondence, current free capacity and package metadata.
GitHub environment protection and promotion authority must be inspected before
enabling any package-write token. No environment variable or receipt can replace
that review. The existing platform promotion gate still blocks hosted runtime.
No live driver is wired while those contracts remain unaccepted.

There are no top-level effects. Current workflow has contents-read only and an
explicitly false image-job condition; no registry token, package-write permission,
publisher call or deployment hook. Enabling/wiring this client needs an exact
source review and separate approval gates. Missing private package is a blocker,
not permission to bootstrap a package or make it public. Pre/post checks cannot
eliminate a race with another authorized writer; promotion must use the verified
manifest digest, never a tag. Source authenticity/signature and real layer/scan/
smoke evidence remain separate from the structural proof.

Validation: `node --test tools/asier_staging_channel/*.test.mjs`.
Tests use doubles for every HTTP/CLI action and never supply live credentials or
contact a registry. The ordinary-execution test cannot create an auth directory.
29 checks cover private/foreign/missing packages, tag preexistence/denial, raw-byte
tampering, config mismatch, post-push privacy drift, partial outcomes, arbitrary
error redaction, stdin/cleanup, logout/removal failures and redirect/header limits.
No actual image or registry privacy is accepted by those tests. W4's review of
15fc254 found a mutable local-alias race between inspect/tag. Two controls against
that published adapter fail (27PASS/2FAIL); using immutable imageConfigDigest and
checking the destination before push closes both (29PASS). Prior attempts retained.

Official contracts checked28/10:
[GHCR authentication/linking](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry),
[package API](https://docs.github.com/en/rest/packages/packages?apiVersion=2022-11-28#get-a-package-for-a-user),
[OCI1.1.1 config](https://github.com/opencontainers/image-spec/blob/v1.1.1/config.md).
The package API may require account/package permissions unavailable to a given
Actions token;403 blocks publication, and no broader token is created automatically.

State: CODE_PUSHED is bound in the PR/issue checkpoint; PIPELINE_READY=false,
IMAGE_BUILT=false, STAGING_DEPLOYED=false, STAGING_ACCEPTED=false,
PRODUCTION_NOT_APPROVED. Actual hosted source/runtime/security remain blocked.
