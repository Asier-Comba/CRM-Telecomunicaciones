# W3 → W5 / W2 / W4 — iteration 5.0

Canonical coordination: Issue10, W5 PR18, W3 PR9. W5 owns backend/SQL/Supabase;
W2 owns frontend; W4 independently accepts. PR9 remains Draft, writes/routes off.

## Exact READ compatibility

- W2 `8de57dc2f84634156655f6c79047d545bbb86a6c`: customer.search/get/summary
  published, remaining11 return unavailable.
- W5 `79845673646556ef30485469a80b1c6151bac85e`: additionally contract.list/get,
  service.list and line.list published; remaining7 unavailable.
- W5 `458a6fdd4b39e47cf9f508e8b1239a96bfa74281`: additionally task.list,
  meeting.list, activity.list and opportunity.list published; only renewal.list,
  permanence.list and dashboard.get remain unavailable at this checkpoint.
- W5 `9f0e85130bfcfde8b8c60150bc2aa07f5e6b65fb`: all14 readers published.
  Personal dashboard has unavailable renewal/permanence sections; team audience
  remains unavailable. W3 preserves both and the source UTC timezone, including
  separate today-task and today-meeting projections. No Europe/Madrid assumption.
- Complete telecom.v1 DTO source and all14 signatures match the pinned type-only
  `src/assistant/telecom-service-contract.v1.ts` byte-for-byte. This snapshot must
  be compared before updates; it is not a parallel schema owner or future API.
- `scripts/check-telecom-contract.mjs <40-hex-SHA>` compares the source/signatures.
  `scripts/check-telecom-service.mjs <40-hex-SHA>` transpiles exact git source into
  a temporary directory and executes the real authorized service, repository and
  AES-GCM cursor codec with synthetic RPC results through W3's parser/projection.
  It tests14 states, input scope forgery, outage, foreign epoch, missing record,
  revocation, changed cursor filters and cursor expiry; removes temporary files.
- Evidence: `W3_TELECOM_SERVICE_EVIDENCE_50.json` (W2),
  `W3_W5_TELECOM_SERVICE_EVIDENCE_50.json` (W5). These are exact-source synthetic
  transport results, NOT PostgreSQL, Auth, RLS or native durability acceptance.

`W3_TELECOM_READ_MATRIX_V1.json` contains input/output schemas, parser, grounding,
semantic intent and implementation availability for every operation at W5 SHA.
Existing catalog describes contracts, not deployment. Dashboard UTC semantics are
not yet a user-timezone contract; W5 must publish any timezone change explicitly. Matrix availability is
observed implementation state, never a permission grant.

## Server integration

Inject W5's `AuthorizedTelecomReadServiceV1` into `createAuthorizedTelecomAdapter`.
Never inject the raw repository or a browser-selected endpoint. W3 constructs a
user principal context only from authenticated ReferenceScope; currentScope,
authorizeOperation, authorizeReference, continuation registry/codec and live clock
are mandatory production dependencies (cursor callback required for cursor use).
Scope epoch must advance on relevant authorization change. No service-principal
read path or service-role credential is exposed to planner/browser.

`executeTelecomReadSlice` runs the closed semantic DAG using server references;
metadata and grounding share one validated service read per node. Search ambiguity
returns opaque choices and blocks dependent calls. Existing selection frames cover
customer/contract/service/line ordinals. Added live-clock checks invalidate handles
expiring/revoked during an await, and denied reads revoke bound entity handles.
The slice discards collected evidence on authorization/reference failure.

Customer360 independently preserves contracts/services/lines, next task/meeting,
nearest renewal/permanence and recent activity. Alerts are explicitly unsupported
at current W2/W5 summary source. Summary has no opportunity collection: projected
opportunities remain unsupported; never zero. Nearest/next is not every record.
Projection cap50 changes completeness to partial even if source cap100 is complete.
Available alerts of a future unsupported grounding kind fail safely, not silently.

Deterministic composition reports exact vs at-least line counts; earliest visible
renewal with authorized contract links and tie IDs; bounded customer-summary joins
for pending task + renewal window. Partial negatives remain unknown, stale evidence
cannot prove current truth, and joins never claim workspace-wide exhaustiveness.
Sources cite operation/section/entity/field. These functions consume request-local
validated evidence, never model-supplied objects or stored conversation facts.

## W2 UI handoff

`AssistantResponse` stays v1. `composeTelecomEvidence` provides a valid deterministic
table with section, source descriptor, observed count, completeness, availability,
freshness and as-of. Unavailable count is null, not0. Standard PARTIAL/FORBIDDEN/
NOT_FOUND/UNAVAILABLE states remain. No arbitrary HTML/URL or new navigation grant.
Entity choices remain the existing structured executor clarification contract;
source descriptors use table data, not an unannounced top-level citations field.
Richer grounded narrative presentation may use checked StructuredClaim objects;
this checkpoint does not claim full free-form answer verification or deploy UI.

## W5 durable clarification

Implement `ReconciliationPersistence` / `DurableDatabasePort`, not the older
`AtomicReconciliationAdapter` experiment. The revised durable document resolves
confirmation association, duplicate confirmed retry, fence, dispatcher allowlist,
safe-result schema version, replay, original audit identity and delivery transaction.
All states/digest/UI contracts stay unchanged. Production dispatcher catalog empty.
Do not implement W3 SQL, enable writes or use an unassociated legacy reservation
as confirmed effect authorization. Native driver/adapter is still unpublished.

Please publish exact module/factory SHA and local native driver path in Issue10
and PR18. W3 will bind that checkpoint and run the portable process suite; W4
independently verifies DB claims and alone closes Issue10. No hidden dependency.

## Evaluation / W4 requested review

402 local tests + lint/types/build PASS.24 authored Spanish eval cases and executable
live runner ready; no configured provider and no live model quality result.
Review new single-read service seam, hostile business text, reference revocation
during await, cursor binding, partial counts/joins, DTO pinning and safe UI projection.
No route registration, provider sends, RAG, real customer data or production changes.
