# W3 bounded entity-choice contract v2

Candidate module: `src/assistant/product-entity-resolution-v2.ts`. Consumes the existing W2 `GlobalSearchInputV1` / `GlobalSearchV1` closed contracts and revalidates both. No SQL, new schema, RPC/URL chosen by the planner, write or recursive model loop. Not registered in the30 executable capabilities; no current route/UI integration or persisted selection claim. Foundation Supabase gate remains red, so this independent seam is inert.

The semantic planner may extract only `{kind, query}`. Allowed kinds: customer, contract, service, line, opportunity. Unknown fields (including actor/workspace/IDs), contacts/invoices, invalid length, getters and credential-shaped input reject before search. Server port owns current membership, fixed registered search service, fresh point-read authorization including customer ancestry, and scoped reference issuance. All ancestry checks precede any issuance. Authority is checked around every await, including actor/workspace/role/epoch, cancellation and a monotonic five-minute maximum reference expiry. Failure returns constant status and no candidates; no provider payload/query is reflected.

| Status | Consumable structure | Meaning |
| --- | --- | --- |
| `needs_selection` | `source:global.search`, `trust:untrusted_crm_data`, `partial:true`, `asOf:null`, `selectionRequired:true`, `candidates:[{kind,reference,label}]` | One to five freshly authorized choices, even when there is one exact label. Never auto-select. |
| `no_match_in_bounded_search` | Same metadata, empty candidates | No match in this bounded substring search. Does **not** prove nonexistence; no typo/fuzzy-search claim. |
| `invalid_input` | Empty candidates | Closed extracted query/kind rejected; no search executed. |
| `access_changed` | Empty candidates | Revocation/scope/role/epoch/ancestry/expiry failure. Does not expose hidden resource existence. |
| `unavailable` | Empty candidates | Transport, malformed output, unsafe labels or reference-issuer failure. Never render as “no customers”. |

Reference is server-issued `ref_` plus32 base64url characters. Raw entity/customer/actor/workspace IDs never leave this result. Issuer MUST bind current actor/workspace/session/epoch/kind/resource/ancestry and expiry; future selected reads MUST freshly authorize again. A handle is not authority and this module does not verify or implement durable reference storage. Revocation after issuance discards all output; any unused issued reference must still be unusable under a revoked scope in the eventual adapter.

Search has no complete-set or as-of attestation. The backend currently caps each kind at five matching records; a unique exact label is not proof of global uniqueness. Contact/invoice and unrelated-kind rows are excluded before AI choices. Labels remain untrusted CRM data, never planner instructions, navigation URLs or factual-summary evidence. Navigation/persisted selection must resolve the opaque reference through the future authorized adapter, not derive a path from the label.

Eight focused deterministic tests cover ambiguity, bounded emptiness versus outage, forged input, prompt injection, private/unknown/malformed output, accessors, cross-actor/tenant/role/epoch, ancestry denial, late revocation, expiry/clock rollback, abort and forged/duplicate references. They prove the seam, not live model accuracy, actual name-search integration or database durability. W2 can review this structure now; registration/route integration waits for exact foundation acceptance. W4 independent review remains required.
