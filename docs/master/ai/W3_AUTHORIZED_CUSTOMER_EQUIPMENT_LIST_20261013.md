# Authorized registered equipment list

The assistant adds `crm.equipment.list` using the existing W1 cookie-scoped
EquipmentServiceV1 and roles owner/admin/member/viewer. Only equipment.list can
reach scope/RPC; get/history/create/assign/return/replace/cancel are rejected
before any query. The selected customer is required. Default and maximum20 rows,
kind/status filters and private internal cursor are bounded by existing W1 input
validation. Private association/source/text filters are not admitted.

The whole current W1 page is validated before projecting id internally, kind,
registered state, assignment/return/replacement/cancellation dates and origin.
Manufacturer/model/free text/purchase/commitment/relations/replacement IDs/version
are discarded. User-facing facts omit all IDs, retain sources and partiality,
and use existing readonly response semantics. A registered equipment status does
not prove physical installation, connectivity, ownership, price or total inventory.
Failure/revocation never becomes an empty page or an absence claim.

This source has35 local executable reads/216 authored cases/220 unique registry
entries, without SIM. The prior215 authored lines and219 other registry entries
are retained. Future composition with Root SIM requires36/217/220. Local focused
checks cover scope/roles, private fields, whole DTO/lifecycle/filter/keyset,
revocation, accessor/Proxy admission, missing reader and runtime readonly seam.

The prepared actual-CI grounding creates one owned prepared router using ordinary
W1 outside IA turns, with synthetic private manufacturer/model/description. It
checks owner assistant facts, viewer cookie projection, foreign reference without
equipment query, revocation403/discarded facts and unchanged row/events snapshot.
The exact history must be38/22/16 here,43/25/18 with SIM composed later. These
actual Auth/DB checks are NOT_RUN until this source is published and executes.

Cleanup v2 reuses unchanged Case+invoice cleanup v1, independently attempts the
new owned equipment cleanup, and retains every status plus the primary enum.
It cancels only the exact prepared manual fixture via equipment.cancel/version1,
after owner/workspace/customer/private fixture labels/no associations/one-event
guards. The date is read from the same disposable database's Madrid clock.
Append-only equipment events and Case notes/triggers are retained, never deleted.
Missing handles are NO_OWNED_HANDLE, not proven absence. The approved existing
history artifact contains the closed six-field cleanup v2 summary; no raw errors,
IDs, SQL or cookies. Independent controlled tests preserve all three attempts.

New own SHA controls are required. Native85/320/audit13+operation2+positive
synthetic effect+connection remain16/21 partial fields, no full23/restart/absence
or W5 resource substitute. RAG Auth-Storage/index/live model/durable quota and
W4 independent security remain pending. IA writes OFF; release NOT_ACCEPTED;
five HIGH remain unresolved. No new backend migration, permission or paid API.
