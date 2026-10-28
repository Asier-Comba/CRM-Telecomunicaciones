# Private staging channel — preparation, not acceptance

Owner addendum28/10 keeps Documentos active and conditionally authorizes only
`crm-inmobiliario/crm-telecom-staging`. Existing `crm-staging`, real-estate CRM,
n8n, global networks, credentials and volumes remain outside this scope.
W5 confirms no conflicting CLAIM and ACKs additive new files only. No shared
Dockerfile, entrypoint, deployment policy, migration or application file changed.

## Checkpoint preserved before this branch

Documentos202 SOURCE785decebdbc2185946c0ea6169bf6f84f2a7a024,
TREEca1699f63ceb1b61f343258d815f2d2cadd74cca; clean checkout and remote ref verified.
W4/W5 exact limited static ACK closes the observation findings, without security
or release acceptance. One exact-SHA opt-in starts run40714047550/job122906772159.
Actual checkout is785dece. Result FAIL after98PASS; role/browser/stack cleanupPASS.
Late authorized response after role revocation remains unresolved. The closed
report lacks a completed late observation: do not invent whether this is a
product regression or a harness observation failure. Membership revocation and
Storage outage were not reached. No physical rerun occurred.

Proven in that attempt: actual login,123 exact unique documents/seven global
reads/no target fanout, safe search/combined filters/order/history/readback,
owner/admin/tenantB/empty positives, member/viewer/foreign denials, cursor
binding/tamper/expiry, closed input, loaded390/768/1440 and focus/Tab/Escape,
committed archive with lost response/exact replay/one effect, restore and CAS.
These partial PASS checks do not make the complete acceptance PASS.
Safe artifact12827098386 SHA2569d8542405cd1296463e991421419c16463722bf5d10ef4983fe11d2e201dcbf7;
synthetic UI12828105721 SHA25647426061b9701e499be9a5dee3b9e0bed022aa15b67724039641bb06cce6c0e0.

## Refreshed prior infrastructure proposals

All open Draft/unmerged, not selected into this source:

| PR | Exact source | Actual boundary |
| --- | --- | --- |
|186|1b2567611870e9ca984bed075485efe3a1943b27|Empty App; old descriptor is historical, not current configuration|
|188|398591f1dbe5c6d81cd2d46342144d654975eb81|Swarm lab22PASS; hosted isolation and real Traefik unproven|
|189|ae10544da76da1a77fcc13c7bd5f3c23cd22deeb|Runtime policy PROPOSED, reviews PENDING, originnull|
|190|b1334a5e5ed06659b319986ffa6ea443e29d9957|Public build/runtime binding proposed, not adopted|

Read186 plan/audit and190 policy at these immutable refs. Current candidate
Dockerfile remains the existing standalone nonroot65532 distroless/Node24 image,
port3000/liveness. Its entrypoint still rejects STAGING/PROD, and admission still
pins the Netlify origin. Neither changing APP_ENV nor direct server.js execution
is allowed. No accepted successor was found by W5.

## Actual read-only hosted observations28/10

EasyPanelHTTPS authenticated, version2.38.0, exact new App still init/source.
GitHub repository/branch fields empty. Docker Image tab exposes image, username
and password fields; all remain empty. No Save/Deploy pressed and no credentials
read. Image-source preparation cannot invent a digest. Private source selection
is feasible in UI, but resource/privacy/network controls remain unverified.

Supabase connector lists only the expected telecom staging project healthy,
PG17.11. Migration ledger read returns88 entries: first86 imported names carry
historical timestamps inside names; business_conflict_non_retryable is entry87,
Storage20261021090000_document_object_read_server_fetch is entry88. D1
20261027154155_documents_library_v2 is absent. Local candidate is BASE87_PLUS_D1,
also88 files; that count is NOT compatibility. This ledger read proves names and
provider versions only, not SQL byte equality, effective privileges or Auth/RLS.
No reset, fixture, schema mutation or connection binding occurred. Unit62's
Storage compatibility evidence remains separate; D1 needs a reviewed forward-only
composition/profile and disposable tests, never substitute one88 for another.

## Implemented additive preparation

`tools/asier_staging_channel/contract.mjs` binds full source and full public-config
hash to an image tag, validates closed immutable OCI manifest receipts against
source/tree/lockfile/Dockerfile/configuration, and distinguishes config-image ID
from registry manifest digest. Only three public build inputs are accepted;
unknown/alias/private key input fails. No values enter the receipt/logs.
The readiness report cannot authorize publication/deployment even with synthetic
accepted inputs; existing promotion and protected-environment approval still apply.

The new workflow runs only contract tests on PRs. Manual build job is explicitly
inert (`if:false`), has contents-read only, reuses the existing Dockerfile and
existing promotion gate. No registry login/push/package-write/VPS token or webhook.
This is NOT a completed publication pipeline: missing independently reviewed
security/scan/provenance and private-package inspection are explicit blockers,
as is a source-bound protected promotion record. The existing promotion gate
also unconditionally blocks current hosted runtime. Do not fabricate candidate.json
or a preliminary digest to satisfy it. No packager is created; Unit60's archive
remains a LOCAL unconfigured Windows artifact, not this Linux staging image.

Local tests initially3PASS/1FAIL because a draft test matched ubuntu-latest as
an image tag. Corrected tag boundary keeps the actual forbidden :latest check.
Final focused results and exact source CI are recorded with the PR checkpoint.

GitHub currently documents Container Registry image storage/bandwidth as free:
[official billing](https://docs.github.com/en/billing/concepts/product-billing/github-packages).
This does not approve paid Actions runners, artifact overage or other services.
Use only existing public-repository standard runners; account budget/capacity and
private package state must be checked before enabling publication. Registry
authentication uses scoped Actions GITHUB_TOKEN; EasyPanel pull access would
need a separate read-only package credential through its secure store, never Git.
No credential is created or copied by this unit.

## State and rollback

CODE_PUSHED is bound to this unit's PR checkpoint.
PIPELINE_READY=false; IMAGE_BUILT=false; image/manifest digestnull;
STAGING_DEPLOYED=false; STAGING_ACCEPTED=false; PRODUCTION_NOT_APPROVED.
No private verified CRM URL exists. No environment secrets or provider costs added.
Document library/content/maintenance, live AI/writes and integrations remain OFF.
Repository PUBLIC owner decision remains pending; visibility unchanged.

There is no new runtime to roll back. Future rollback must select the previous
approved manifest digest PLUS matching public build/runtime configuration and
compatible schema in only the new App, then repeat smoke. Database migrations
are forward-only; never roll them back with the container. If no previous
accepted image exists, stop only the new App and withdraw only its new route.
Do not stop, restart, remove or reconfigure any existing service/network/volume.

Next three executable units:
1. Diagnose the exact late-response observation failure, retain the first FAIL,
   prove any causal correction and obtain W4/W5 review before further Auth.
2. Review this additive channel source; agree accepted runtime/binding/origin,
   private access and network design without changing global infrastructure.
3. Complete source-bound CI/scan/provenance/private GHCR publisher only after those
   gates; then exact schema preflight, protected promotion and hosted smoke.
   No App launch while any critical gate remains unresolved.
