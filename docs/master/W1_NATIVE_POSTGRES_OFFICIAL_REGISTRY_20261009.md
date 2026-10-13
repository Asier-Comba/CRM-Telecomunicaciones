# Native PostgreSQL image download recovery

Scope: W1 disposable CI database evidence; proposed independently of W5 deployment/enterprise recovery. Base PR38 source `52f9f0d226664b32f94d0fb732b32ffcbdf1dd5a`, tree `900225e2d6a76fd244bf83ddc31d0fc3b0fa8703`. No production or provider account operation.

## Observed failure

CI run `37990750532`, original native job `114023972625`, failed before the PostgreSQL service started. Docker Hub returned `toomanyrequests` on all three runner pull attempts. One explicit repeat of that job and its dependencies, attempt2/job `114027230729`, failed with the same message before database creation. Neither attempt provides zero-to-head, restore or concurrency evidence. Both original logs remain retained; no further same-input repeat is planned.

Quality job `114023972411` completed lint/types, 434 bootstrap and 485 assistant tests, and build66; its conclusion remains FAILURE because the unsuppressed five-HIGH dependency audit is still open (#29). Supabase107 and fresh55 screenshots on this base are separate gates, pending when this proposal was prepared.

## Exact official image

Read-only OCI requests on 2026-10-09 compared `docker.io/library/postgres:16` and `public.ecr.aws/docker/library/postgres:16`. Both returned HTTP200 and the identical OCI index digest:

`sha256:ca0bd484cb98bf4b24eb1010e73fb3fcbd6714d240fbc1a10eea5b7dbecb641d`

Both indexes select Linux/amd64 manifest `sha256:75adc2a65806c96bc0e59030230bfe3f1c1b0d6d8f8181a8913e2b8b53bdc166`. This is a Docker Official Images mirror, not a different PostgreSQL implementation. See [AWS publisher announcement](https://aws.amazon.com/blogs/containers/docker-official-images-now-available-on-amazon-elastic-container-registry-public/) and [ECR Public pull documentation](https://docs.aws.amazon.com/AmazonECR/latest/public/docker-pull-ecr-image.html). Temporary anonymous read tokens were not logged or saved.

The CI service now requests the immutable index from ECR Public. A shared image predicate is consumed by the shell drill and both independent-process race scripts. It admits only that exact registry/namespace/digest or the existing exact local `postgres:16` reference, rejecting the former wildcard's arbitrary suffixes. New bootstrap regressions exercise admission, untrusted registry/publisher/digest/version substitutions, and the actual shell CLI's closed failure without echoing input.

The drill's database names, disposable container-ID guard, migration/SQL fixtures, ACL-loss negative control, fresh/restored privilege equality and role calls, synthetic dump/restore, race assertions, timeouts and teardown are unchanged. No SQL, package, Supabase Auth/Storage, provider configuration, W5 branch or business IA activation changes. This does not resolve issue10 or provide independent W4 acceptance.

## Acceptance and coordination

Local verification before publishing: three image-boundary tests PASS, lint of all four changed JavaScript files PASS, shell syntax PASS using the installed Git Bash executable, diff whitespace PASS. Actual native PostgreSQL startup, complete drill and races must then pass on the new exact source/executed tree in GitHub; local Windows Docker remains stopped under the observed memory constraint. Until those logs close, this is a recovery candidate, not accepted database evidence. W5 receives the scoped proposal and exact PR/SHA via the existing GitHub coordination checkpoint; its enterprise/production infrastructure is not adopted or rewritten.
