# Commercial SIM/eSIM v1

Accepted at b654b1d / 2479 real checks. POST `/api/sims/v1`: current authenticated cookies, same-origin, no-store, `PRODUCT_V1_ENABLED`/`PRODUCT_V1_ORIGIN`. Owner/admin/member perform normal writes; viewer consumes mask-only reads. No carrier API, network provisioning, stock ERP, PIN, PUK, credentials or AI write registration.

The SIM is a customer-bound commercial resource reserved before assignment. Its workspace/customer/operator/kind/source/creator identity is frozen. Prepared is not general warehouse availability. Physical SIM and eSIM profiles use the same bounded model, with optional EID only for eSIM. Dates record CRM confirmation/replacement/deactivation time; they do not fabricate provider telemetry.

| Operation | Meaning |
|---|---|
| sim.create | prepare customer/operator-bound physical/eSIM resource |
| sim.assign | prepared -> assigned on mobile/data-connectivity line; SIM and line CAS |
| sim.activate | assigned -> active, explicit manual confirmed_active acknowledgement |
| sim.replace | close old association; mark old SIM replaced; open new prepared SIM association atomically |
| sim.deactivate | assigned/active -> inactive, closing association |
| sim.cancel | unused prepared -> cancelled |
| sim.list/get | safe resource fields and masks; current assigned line only |
| sim.history | bounded historical associations for one line, captured identifier pointers retained |

The normalized protected identifier table adds entity_kind=sim and kinds iccid/eid through forward migration, preserving all previous identifier rows and privileges. ICCID is canonical digits with prefix89 and total18–22digits; EID is exactly32digits. No formatting rewrite or blind country/provider inference. Requested human fields authorize raw reveal separately through existing `sensitive.get` with telecom_identifier/canonical_value. Safe list/get/history return deterministic last3 masks only. No raw values in audit, receipts, activity, generic search, URLs or browser storage.

ICCID is unique for a workspace across active/retired identity history. EID identifies an eUICC that can hold several eSIM profiles; shared EID is valid and no incorrect uniqueness is imposed. Physical SIM cannot carry EID. ICCID is required before assignment/replacement. Prepared identity correction retires the old protected row and creates another; once assigned/active/replaced/inactive/cancelled, identifier retirement/reassignment is denied. Historical association captures original ICCID/EID identifier IDs so replacement never overwrites old identity.

Only one open SIM association per line and one open line per SIM. Assignment locks portfolio ancestors and checks tenant/customer/operator, line CAS, commercial service kind, active parent state and manual business origin. Replacement locks old/new SIMs in UUID order after contract -> service -> line, checks both resource CAS versions and line CAS, closes old association and creates a new one in one transaction. The replacement may be assigned without provider activation claim, or active with explicit confirmed_active manual acknowledgement. Neither command activates or modifies the line or carrier network. Stale versions/uniqueness conflicts return conflict with no partial mutation or guessed success. Exact HMAC receipts recover the original effect after subsequent replacement/deactivation.

`src/lib/contracts/sim-v1.ts` defines exact inputs/rows/receipts/pages/history. List filters customer/operator/current line/kind/status/source, UUID ascending keysets, limit1–100/default50. History requires line_id and keyset limit1–100; foreign line yields not_found. Current line filtering does not list ended associations; use history for replaced/inactive SIMs. No arbitrary raw identifier filter. Imported/integration SIM facts and their identities are read-only.

All9operations have local SQL fresh/restore fixtures and seven Node tests; native independent-process suites exercise20create receipts/20assignmentCAS/20distinct prepared replacements/20replacement replays, ensuring one winner and preserved history. The real Auth/cookie suite individually observes the nine operations plus SIM-specific protected create/get/list/reveal, physical EID denial, shared eUICC EID, lifetime ICCID uniqueness, source preservation and same valid JWT after suspension. Candidate status persists until published exact-source platform proof passes.

Limits: no stock procurement, reuse of terminal SIMs, bulk provider synchronization or assignment onto external immutable line business. Prepared resource labels remain immutable in this first bounded resource family. Provider outcomes are manual human records. W2 consumption is unproven; no AI reads/writes are registered by this change.

Accepted source b654b1dd02bf9f8a8213fda5a75eac476559c5cf:61 migrations/269 privilege functions/283 Node tests/2479 real Supabase checks. All nine SIM operations individually observed. Native112249260785 fresh/restore/races, browser112249259883 and real Supabase112249259768 PASS. Forward association snapshot CAS repair preserves exact receipts and denial after revocation. Six-HIGH audit remains unsuppressed; full workflow is not green. See W1_TEL5_SIM_ACCEPTANCE.json.
