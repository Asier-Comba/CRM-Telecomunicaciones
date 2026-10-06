# Customer360 bounded pages

Candidate task.list/meeting.list close the gap left by date-bound calendar.list: undated tasks, complete status history, stable UUID keysets and customer filters. All four current product roles. Existing canonical work writes/get unchanged. No unbounded combined response.

| Domain | Operation | Customer scope | Role |
|---|---|---|---|
| Contacts | contact.list | customer_id | All four |
| Contracts | contract.list | customer_id | All four |
| Services | service.list | customer_id | All four |
| Lines | line.list | customer_id, optional parent | All four |
| Renewals | renewal.list | customer_id | All four |
| Permanences | permanence.list | customer_id | All four |
| Opportunities | opportunity.list | customer_id | All four |
| Tasks | task.list candidate | customer_id, opportunity/assignee/status/priority/date optional | All four |
| Meetings | meeting.list candidate | customer_id, opportunity/assignee/status/date optional | All four |
| Cases | case.list | customer_id | All four |
| Documents | document.list | target_kind/target_id; bounded ancestry pages for customer and individual descendants | Owner/admin |
| Billing | invoice.list | customer_id | Owner/admin |
| Activity | activity.list | customer_id | All four |

Summary customer360.summary has exact role-gated counts only; member/viewer document/billing counts are null, not fabricated zero. Document pages are target-bound: clients must request separately scoped customer/contract/service/line/case/opportunity targets when showing descendant documents; summary count includes all those ancestries. It does not falsely claim a single customer-document collection. Workspace-global search is not a collection. Case private note_list retains its stricter member-or-above role.

All collection pages bounded <=100 and UUID keyset (documents/invoices included). Task default page includes due_at/due_on null; date filter excludes undated naturally. Dates derive in Europe/Madrid; paired date_from/date_to <=366days, optional. Meeting starts_on derived; ends_at/timezone validation strict. IDs and safe titles/status/context only, no notes/contact fields/raw protected identifier. Normal human write authority and source policies preserved. Exact candidate acceptance pending native fresh/restore, real Supabase cookies/valid JWT, viewer and historical/undated/pagination coverage. W2 consumption not inferred.

Optional FINAL7 equipment page: equipment.list with customer_id through /api/telecom/equipment/v1, UUID keyset limit1..100/after_id. Candidate exact proof pending. This is separate from the existing thirteen core pages and fifteen-counter summary; no new summary count or broader billing/document permission is claimed.
