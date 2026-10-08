# Currency-separated billing cohorts

Candidates `billing.monthly_series` and `billing.top_customers`, POST `/api/billing/analytics/v1`. Owner/admin only, current membership and default-off Product v1 transport boundaries. No AI registration.

Required explicit currency EUR/USD/GBP and first-day from_month/to_month; inclusive maximum24 months. Optional customer_id; top limit1..25(default10). Series includes every month, including zero rows. Top customers sort by issued amount descending, UUID ascending for ties. No names/fiscal data.

Basis `issue_month_cohort_current_status` is mandatory in every result. Issued includes currently issued+paid invoices with stored issue_on in the cohort. Paid includes currently paid invoice totals in that same cohort; outstanding includes currently issued totals; overdue includes outstanding with due_on before current Madrid as_of date. Draft/trashed excluded. All sums are exact nonnegative minor-unit decimal strings, validated with BigInt; issued=paid+outstanding, overdue<=outstanding. Single requested currency enforced by SQL and DTO, never conversion or currency mixing.

These are current-state cohorts of historical issue months. They are not prior month-end balances, partial payment collections, cash receipts by paid_at, credit notes or accounting ledger analytics. Existing full manual paid/reverse-payment semantics remain canonical; no fabricated financial events or provider exchange rates.

Exact native fresh/restore, zero/paid/outstanding/overdue/draft isolation, fixed money equations, tie order/bounds, owner/admin policy, foreign-tenant hiding, real Auth/HTTP, same valid JWT revocation and private-browser proof required. Production not touched. No raw table access. Candidate exact acceptance pending.
