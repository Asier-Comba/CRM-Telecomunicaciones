# billing.v1 human application contract

Source audit: historical ad3c06e invoice-repo/service/calc/PDF/parser/summary/state;
W2 PR27@2878687 billing model/parse/PDF/editor/list. Old line semantics preserved:
round quantity×price, round discount on gross, round VAT and withholding on net
base, then sum per-line values. Browser float calculations are previews.
Historical reservation is replaced by one indivisible issue transaction.

## Exact fields and role policy

Owner/admin only for issuer/customer fiscal configuration and all billing reads
and writes. Member/viewer are denied; commercial product grants do not imply
financial authority. USER JWT/auth.uid(), active membership/workspace rechecked
and held through commit/replay. Raw tables/helpers/service-role remain closed.

`src/lib/contracts/billing-v1.ts` is authoritative. quantity_milli = quantity×1000;
unit_price_minor = price×100; discount_bps/tax_bps/withholding_bps = percentage×100.
All integers. Lines1..50, descriptions<=300, qty1..100000000, price0..1000000000,
rates0..10000, invoice totals0..1000000000000. Positive half-up rounding per stage.
DB numeric is final authority; independent BigInt calculator validates previews.
No caller totals, fiscal snapshot, status or invoice number is accepted.
EUR/USD/GBP native currency summaries remain separate. Foreign currency requires
positive fx_rate_micros, fx_on and fx_source; no unverified EUR conversion/growth.

W2 semantic mapping (use exact decimal text when converting form inputs):

| Local field | Server field | Scale |
|---|---|---|
| clientId | customer_id | UUID |
| issueDate / dueDate | issue_on / due_on | Strict Gregorian date, no timezone |
| opportunityId / contractId / serviceId | corresponding *_id | Same customer/contract enforced |
| quantity | quantity_milli | 1000 |
| unitPrice | unit_price_minor | 100 |
| discountRate / taxRate / withholdingRate | corresponding *_bps | 100 |
| exchangeRateToEur | fx_rate_micros | 1000000; metadata required |
| items | lines | Stable input order; server computes totals |

Issuer/fiscal profile has legal_name,tax_id,address,postal_code,city,region,country.
Issuer adds currency/default_series. Configuration setters replace full bounded
profile and use expected_version0 for first creation, then positive CAS.
Protected profiles are never added to generic telecom/customer/search DTOs.

## Lifecycle and transaction

issuer.set; customer_fiscal.set; invoice.create_draft/update_draft/issue/mark_paid/
reverse_payment/trash/restore. Draft update replaces financial fields/lines;
customer is immutable. All edits/transitions use command_id and expected_version.
Same key+same operation/input returns original receipt; changed key payload40001.

Issue locks draft, rechecks customer/issuer/fiscal profile, recalculates stored
lines, allocates unique workspace+series+issue-year sequence in the SAME transaction,
freezes complete issuer/customer snapshots, records issued state, safe coded audit
and replay receipt. Audit failure rolls back row/lines/counter/ledger. Committed
numbers are never recycled. Issued financial fields/lines/number/snapshots are
immutable, including after payment reversal. Issued invoices cannot enter trash.
Only draft trash/restore is supported; no deletion of issued business records.
Overdue is derived from unpaid issued state and Madrid current date, never stored.
Coded audit: invoice.draft_created/draft_updated/issued/paid/payment_reversed/
trashed/restored; no fiscal blobs or PII before/after dumps.

## Reads and transport

invoice.get({id}) returns owner/admin protected editing/PDF source projection;
invoice.summary({id}) excludes fiscal snapshots/lines;
invoice.list has status/customer/date pair/series, limit1..100(default20), UUID
keyset after_id. Date ranges `[from,to)` max366 days. Overdue filter is derived.
invoice.financial_summary supports month/quarter/semester/year/all: separate
native currencies, issued/paid/outstanding/overdue counts and minor units from
persisted issued/paid invoices. Draft/trashed excluded. Period groups by issue_on;
paid is current collection state for invoices issued in the selected period.
configuration.get optionally selects protected customer_id.

POST /api/billing/v1/{commands,queries}, closed {operation,input}; same session,
Origin/Fetch-Site/JSON/no-store protections as product transport; streaming64KiB,
command input32KiB and read input8KiB. PRODUCT_V1_ENABLED default unavailable.
Safe errors400/403/404/409/500/503; backend never echoes provider/fiscal values.

## Evidence and explicit open work

Combined176 Node tests,33 fresh migrations, fiscal/foreign/role/CAS/replay/issued
immutability/payment/trash/cutpoint SQL,200 deterministic SQL-vs-BigInt vectors,
126-function manifest and embedded restore PASS. Native actual20-process numbering,
same-issue replay/CAS and restored SQL are authored; actual Supabase Auth/JWT and
Next cookie billing acceptance authored. Their final exact-head CI is pending.

PDF private object/capability storage, durable invoice text/audio proposals and
advanced monthly/top-customer analytics remain OPEN. No PDF storage implementation
is implied by invoice.get snapshot availability. No UI/assistant/provider/production
writes were enabled. Review-only proposals must use this closed contract; Issue10
continues to block assistant actions.

## Authoritative PDF and dashboard financial facts

POST /api/billing/v1/pdf accepts only invoice.pdf({id}). Owner/admin authority,
active membership and protected invoice.get run before deterministic PDF rendering.
Fiscal data and issued lines come from frozen server snapshots; caller fiscal fields,
HTML, logo URLs and totals are rejected. Drafts are clearly labelled without a fiscal
number. Output is authenticated application/pdf with no-store; 50 lines paginate.
Private object persistence and opaque document capability remain OPEN; this endpoint
is a protected binary download, not completion of the private Storage workflow.

Forward migration 20261004175000 adds actual issued/paid/outstanding/overdue native
currency facts to product.dashboard.v2 for owner/admin. My scope filters invoice
creator; workspace scope includes that workspace. Member/viewer financial state stays
unavailable. Period filtering uses issue_on; current payment state is not historical
revenue recognition. No FX sum or speculative forecast is reported.
