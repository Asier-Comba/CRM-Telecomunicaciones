# Customer360 and commercial report reads v1

Accepted at0c67c3a40f67d3ed6591773d5083f425466c1908. All10 readers individually cookie-observed;2669 real checks PASS, native fresh/restore and browser boundary PASS. Full workflow remains blocked by the unsuppressed six-HIGH audit. No new writes or AI registration.

POST `/api/telecom/reads/v1` uses the current SSR cookie user, active workspace membership, the existing default-off PRODUCT_V1_ENABLED flag and exact PRODUCT_V1_ORIGIN. Envelope `{operation,input}`; no caller workspace, SQL, arbitrary grouping or requested raw columns. Responses are closed, no-store DTOs. Backend codes remain English; W2 renders Spanish product labels.

| Operation | Input filters | Result |
|---|---|---|
| customer360.summary | required customer_id | exact 15 domain counters plus customer ID; no names, notes or identifiers |
| report.operator_portfolio | customer_id,operator_id,limit,after_id | operator ID; distinct contract customers; all-status contract/service/line counts |
| report.services_by_kind | customer_id,operator_id | all five service kinds, including zero counts, split by five operational statuses |
| report.lines_by_status | customer_id,operator_id | all five line statuses, including zero counts |
| report.renewals_by_month | required from_month,to_month; customer_id | target-month cohorts, split by current renewal status |
| report.permanences_by_month | required from_month,to_month; customer_id | end-month cohorts, split by current administrative status |
| report.portabilities_by_status | customer_id | all seven closed workflow statuses |
| report.cases_by_priority_status | customer_id | all 28 closed priority/status combinations |
| report.pipeline_by_stage | customer_id,stage_id,owner_user_id,limit,after_id | actual stage IDs with open/won/lost/cancelled counts |
| report.commercial_owner_counts | customer_id,owner_user_id,limit,after_id | actual assigned user IDs with draft/active contracts, open opportunities, pending/in-progress tasks and four active case statuses; separate unassigned_counts |

All active product roles can consume these safe reads. Existing document and billing authorization remains owner/admin only: summary documents/billing counters are null for member/viewer, never guessed zero. Owner/admin counters include all statuses, and document ancestry covers customer, contract, service, line, case and opportunity targets. The remaining counters include all statuses and historical resources, rather than pretending to represent only active portfolio. No free-form fields or financial amounts are projected. Protected notes, identifiers and fiscal data are excluded.

The summary is one SQL statement, so all counters share its statement snapshot. Owner rows and unassigned counts also share one statement snapshot. Each report is authorized by current membership before execution; workspace suspension or membership revocation denies the same still-valid Auth JWT. There is no global unbounded mega-response or raw table access.

Operator/stage/owner reports use UUID ascending keyset after_id; limit defaults50, maximum100. next_id is the last returned UUID only when another row exists. Pagination guarantees complete traversal without duplicates on a stable dataset; concurrent updates can change aggregate counts. Owner rows include actual historical assignee IDs even if the user is no longer active; resolve display labels through safe product reads. Unassigned counts are workspace/customer scoped, unaffected by cursor; an explicit owner filter yields zero unassigned counts.

Calendar reports require canonical first-of-month dates within2000..2100, ordered inclusive month range, maximum24 months; every month is returned, including zero rows. These are cohorts by stored target/end date classified by CURRENT state at as_of (Madrid date). They are not historical month-end balances or reconstructed prior statuses. No currencies are summed or monetary pipeline estimates inferred.

Local evidence: 290 Node tests, lint/types/build, 62-migration embedded fresh/restore, 271-function manifest and SQL fixtures. Native fresh/restore and real disposable Auth/PostgREST/Storage/application tests are committed; their candidate status remains until exact-source runs pass. Real acceptance individually observes all ten operations, exact synthetic counts, category completeness, cursor traversal, viewer/foreign scope, notes privacy, month bounds and valid-JWT revocation at both application and direct RPC layers.

Attention, composed dense line DTOs, billing monthly/top-customer analytics, richer service facts, protected imports and equipment assessment remain separate outstanding TEL5 requirements. Existing billing/document readers remain the authorized bounded detail paths; a counter does not grant access to those domains.

Exact proof:docs/master/W1_TEL5_REPORT_ACCEPTANCE.json. Historical candidate statements above describe fixture preparation;actual platform acceptance is now recorded at0c67c3a. W2 consumption is unproven.
