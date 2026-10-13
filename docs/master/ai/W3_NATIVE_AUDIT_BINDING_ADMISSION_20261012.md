# Native audit inspector: binding admission

The readonly audit inspector now uses the same existing five-field descriptor
snapshot as the operation inspector and the durable baseline. The binding must
be admitted before preparing SQL. Accessor fields are rejected without executing
getters; a Proxy get result cannot replace an invalid descriptor; malformed or
extra fields fail with the closed `NATIVE_AUDIT_INSPECTION_UNAVAILABLE` enum.

Three controlled negative tests on parent
`3d0e9348d62478a58041408004052ffa91e3b40b` failed because the old object spread
admitted those inputs. A fourth valid-binding test passes and retains the fixed
scope, all original ledger entries, pending delivery and immutable observation.
These are controlled SQL transports, not an Auth/DB exploit demonstration.

The complete-ledger query, baseline fingerprint, delivery LEFT JOIN, original
intent accounting and native fixtures remain the existing implementation. No
business counter, absence, quiescence, full inspectScenario method, full23,
restart or W5 resource is inferred. The next published source needs its own
quality, browser, native ledger, connection, operation and Supabase controls;
parent results do not transfer to this correction.

IA writes OFF. Live model NOT_RUN. W4 independent review and W5 owned native
resource remain pending. Release NOT_ACCEPTED, with five HIGH alerts retained.
