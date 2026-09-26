# W3 telecom.v1 integration boundary

Source: W1 `w1/telecom-domain-v1@e65f1e802fbcb63f9a1636689b85eb2aa135c592`,
`src/lib/contracts/telecom-v1.ts`, `src/lib/server/telecom-read-service-v1.ts`
and `docs/master/W1_W3_DURABLE_DATA_MAPPING.md`. W1 canonical candidate is
`w1/canonical-v3@32f0112`. Neither branch is merged by W3.

## Implemented versus enabled

| Component | Implemented offline | Not enabled / required gate |
| --- | --- | --- |
| Catalog | Exact 14 W1 READs, source DTO references | Executable adapters and W4-accepted base |
| Input validation | Closed fields, integer limits, Gregorian dates | Resource existence, permission and RLS |
| Entity references | 192-bit random handle, kind/provenance/expiry, exact server scope | Authenticated issuance and fresh reader resolution |
| Continuation | Fresh-only issue, digest of exact sorted filters and page size | Reader-issued cursor and result authorization |
| Grounding | 50-row maximum, bounded text, masked protected fields, freshness | Full W1 DTO parser upstream and answer evidence verification |
| Durable mapping | Pinned W1 table candidates and explicit compatibility gaps | Atomic DB transactions, scoped lookups and real concurrency/RLS evidence |

Descriptors use `crm.<W1 operation>` names; input property names preserve W1
contracts exactly. `customer.search/get/summary`, `contract.list/get`,
`service.list`, `line.list`, `renewal.list`, `permanence.list`, `task.list`,
`meeting.list`, `activity.list`, `opportunity.list`, `dashboard.get` are the
only 14 operations. No standalone plan/operator/write operation is invented.

The catalog input schema extends the older runtime's generic schema with integer
and nullable pagination rules. It is not silently registered into that runtime.
A future adapter must invoke `validateTelecomInput` and validate its full output
before projection. Shape-valid IDs remain untrusted until the scoped reader
authorizes them. Raw continuation strings are valid only at the trusted reader
boundary, not as model-authorized tokens.

## Reference lifecycle

Issue references only after an authenticated, authorized, validated read. The
server constructs actor, workspace, session, epoch, clock and turn provenance.
Store only entity kind/ID/provenance or page cursor/filter digest, never CRM
business values. Resolve opaque handles against current server context. Changed
workspace, actor, session, epoch, kind, filters, operation or expiry fails closed.
Logout/access loss purges the session; current permissions are rechecked on the
next read. A valid reference is not an authorization grant.

The in-memory store intentionally loses references on restart. Do not replicate
it as authoritative cross-process memory. Allocate per session or add per-scope
quotas before a shared singleton; current capacity is per store instance.

## Grounded responses

`CollectionEvidence` is a model-facing projection, not an addition to W2's v1 UI
contract. CRM strings are labelled `untrusted_crm_data`; they cannot add tools,
instructions or permissions. No raw cursor, reveal capability, scope ID or
provider error is projected. Row fields are allowlisted and bounded. A long
collection becomes partial when projected; projected_count is not total_count.

Only fresh authorized complete empty evidence permits “no records.” Unsupported,
unavailable, not-authorized, error and stale data must not be rewritten as empty.
Customer360/Attention composition must preserve each section's state and timestamp
independently. Protected fields remain hidden/not-available/masked. This helper
does not validate every nested W1 field, resolve relative dates or prove an LLM's
final claims; those are separate adapter/planner/presentation test gates.

## Evaluation accounting

Existing 63 semantic scenarios remain a dataset, not measured model success.
85 new Spanish-prompt structured-input fixtures execute deterministic accepted/
rejected argument assertions (37/48) across the 14 operations. Combined inventory:
148 scenarios, but these two sets measure different things and must not be merged
into a fabricated semantic success rate. Full unit suite: 173 tests passing.
Model latency, tokens/cost, entity resolution and grounded answer quality still
need real provider runs with permission-safe synthetic or authorized data.

## Remaining release boundaries

W4 acceptance of the canonical workspace/auth boundary; full runtime W1 DTO
parsing; per-audience dashboard authorization; server-bound semantic plan refs;
durable confirmation CAS; atomic operation/outbox transaction; redacted safe
result references; workspace-scoped operation lookup; atomic append-only audit;
real PostgreSQL/RLS/restart/backup evidence. Writes, integrations and production
remain disabled. No n8n workflow or provider call is enabled by this document.
