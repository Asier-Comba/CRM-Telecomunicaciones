# W2 — Customer360 manual renewal tracking creation, 9 October 2026

Owner: W2 product consumer. Base6b5df7a4a029a59dcc52e02dec745dd0dfd8af31/tree741dd648cae75be4957417aa0f214136dc45f0ab is the published canonical composition whose own whole gate is pending at development time. Accepted component evidence does not transfer to this new source.

## Behavior and existing authority

The active customer's Renovaciones tab exposes Nueva renovación manual to non-viewer effective roles. Its ordinary paginated contract picker is customer-scoped. A normal `portfolio.get` must confirm the exact selected contract belongs to this customer, is manual and draft/active before presenting the existing Creator in an optional renewal-only mode. Other consumers retain their existing choices.

Creation uses the existing `contract.record_renewal` human command with a fresh command_id, selected contract_id, target_on and null opens_on/closes_on. This is date tracking with no additional window; it does not renew a provider contract or change sold conditions. Target dates are constrained by the selected contract start date in the form and by the existing backend parser/RPC rules. No new API, schema, migration, authority, service_role use or assistant tool.

The validated command receipt remains in Creator across failed reads. Before closing, the consumer checks operation/manual origin, reads the actual renewal by receipt UUID, checks parent/manual/version, and reads its contract again to verify the current customer relationship. The renewal's portfolio DTO has no customer_id; identity is established through its normal contract read. Unknown delivery retains exactly the original command_id/input; after a confirmed receipt, Consultar renovación registrada only re-reads. Current-cookie/getUser/membership/RLS/commit/replay/tenant/role/CAS authority stays in the existing backend.

Only after these reads does the wrapper refresh its independent inventory and invoke the existing Customer360 summary/attention refresh callback. The Renovaciones tab stays selected, combined renewal/permanence KPI is fetched normally, and the receipt UUID gets an explicit detail link. No optimistic count.

## Required exact-tree evidence

The existing portfolio_manual_service_line_renewal_source journey retains its global service/line/renewal/import assertions and original capture, then extends it with actual Customer360 creation. A contract imported under the same customer is refused with zero renewal writes. A real first command commits, its response is intentionally aborted, and the exact retry returns the real receipt. An injected503 renewal read leaves the form locked and the previous KPI untouched. Detaching failure handlers and retrying the confirmed read must produce no third command, one persisted open/manual/version1 row under the exact workspace/contract/customer, original date and null window, and actual summary HTTP counts matching SQL+1 with unchanged permanence count. Permanences are stored in telecom_commitments; renewals are scoped through a contract join.

An ordinary filtered renewal.list and bounded original cursor traversal must find the receipt UUID before strict complete-record captures at1440/768/390. Each visible field must fit at ratio1 and the page must not overflow horizontally. The existing viewer ancestry journey retains its original ordinary-identity/no-privileged-editor checks, then confirms customer-scoped renewal HTTP200 and no creation button. No successful HTTP response is fabricated; only explicit failure responses are injected. Original named cases, waits, timeouts, SQL/privacy/CAS/revocation and calendar update/resolve/dismiss journeys remain. No whole107, visual or premium acceptance is claimed before this source's own remote gate.

AI business writes remain OFF pending issue10 and independent W4. Issue29 full audit remains enforced. Persistent Windows stack/physical business durability/live semantic quality remain unverified. Production/VPS/DNS/providers/W5 infrastructure unchanged, no main merge or force push.
