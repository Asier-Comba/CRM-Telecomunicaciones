# Effect transaction boundary and recovery matrix

This is an offline adapter acceptance specification. No production adapter,
database migration, external business effect or W1 schema change is implemented.
`durable-mapping-manifest.ts` exhaustively maps W3 record keys with TypeScript
`satisfies Record<keyof ...>` checks. Proposed W1 relation names are preserved;
physical column names remain null because W1 has not published that schema.

`DurableIdempotencyRecord.result` cannot be stored directly as W1's proposed
safe result reference. A capability-schema-validated projection and scoped
result-reference reader are required. The phrase `safe_result_ref` is a semantic
storage requirement, not an invented migration or asserted SQL column.

## Transaction and interruption points

| Point | Required persistence/effect invariant | Allowed recovery | Existing evidence |
| --- | --- | --- | --- |
| Before reserve | No reservation, no business effect | Retry scoped reserve | Reference conformance reserve-outage case |
| After reserve before execution | One bound reservation, zero effects | Lease policy and CAS; never parallel execute | Reference reserve race/lease cases |
| Before outbox commit | Operation transition and effect-command enqueue both absent or both present | Transaction rollback | Contract requirement; real adapter absent |
| After outbox commit before worker claim | One immutable allowlisted command, zero effects | Workspace-scoped version+lease claim | Reference outbox claim race |
| Before external effect | Durable execution/dispatch ownership established | Retry only with verified no-effect evidence or provider idempotency | Reference pre-effect failure; real provider contract absent |
| After external effect before receipt | External outcome may exist with no local proof | `reconciliation_required`; independent verification; no blind replay | Reference uncertainty semantics only |
| Before receipt persistence | Effect already happened or is uncertain | Preserve uncertainty; no new effect | Real provider/DB fault evidence required |
| After receipt before complete | Verified effect exists; completion may be missing | Reconcile from opaque receipt/read-after-write; do not invoke effect again | Reference post-effect completion outage |
| Before completion commit | Result reference, state and required audit all roll back together | Transaction retry without effect replay | Atomic candidate applies to reconciliation only |
| After complete before response | Completed state and safe result reference committed | Scoped exact-binding replay | Reference restart/replay semantics |
| Before audit delivery | Original immutable event and pending audit-outbox entry committed | At-least-once delivery using original event reference | Atomic candidate simulation |
| After sink acceptance before acknowledgement | Sink may have event; local outbox still pending | Retry original event to idempotent sink; never create replacement event | Atomic candidate simulation |
| Before reconciliation transaction | Independent authorization/verification/schema validation done | Recheck tenant/binding/version inside transaction | Reconciliation core tests plus candidate contract |
| After reconciliation transition staged | Neither transition nor audit durable until commit | Roll back both on interruption | Atomic candidate staged-transition fault |
| After reconciliation commit before response | Terminal state, original audit and delivery item coexist | Exact command replay; never repeat business effect | Atomic candidate post-commit fault |

## Evidence limits and production gates

Existing reference tests exercise in-process state machines, synthetic failures,
and map-backed restart models. The atomic candidate's seven crash points cover
reconciliation plus audit delivery; they do not constitute a full business-effect
transaction implementation. Missing rows above are intentionally explicit instead
of filled with another simulation that would appear to prove real durability.

A real adapter must pass this matrix with independent database connections,
process termination at each point, database restart, forced RLS, anonymous/removed
member/suspended tenant attacks, tenant A/B isolation, and backup/restore. Each
provider needs a documented effect lookup/idempotency strategy; there is no general
exactly-once promise for arbitrary external effects. Uncertain effects always
require reconciliation, even when a local retry would be convenient.

Reservation/confirmation CAS, business outbox transaction ownership, safe-result
projection and transactional append-only audit remain production gates. Current
standalone reconciliation service still writes its audit separately; the candidate
interface is not wired into that service and does not close W4's audit-loss finding.
