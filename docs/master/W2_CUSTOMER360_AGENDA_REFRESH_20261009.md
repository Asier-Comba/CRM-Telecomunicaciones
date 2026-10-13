# W2 — Refresh Customer360 after committed agenda writes

Owner: W2 calendar/customer presentation and existing real browser consumer.

## Verified code gap and behavior

Agenda is embedded in the customer detail, but successful WorkEditor writes previously notified only its calendar/list reload. Customer360's summary and attention remained mounted with earlier reads. This gap is verified in code; no pre-fix immediate screenshot/reproduction is claimed.

IntegratedCalendar and WorkEditor gain an optional onCommitted callback. It runs only after the existing command execution resolves with its validated receipt; CustomerIntegratedPanels passes the already existing summary invalidator. Only the summary/attention remount, preserving the Agenda tab, calendar range/filter and child state. The conflict button's close/reload path does not call onCommitted. Failed/uncertain commands do not notify; retry intent, command UUID, CAS, permissions and normal global-calendar behavior remain. Successful task/meeting edits/lifecycle writes also refresh current attention. Portfolio deadline writes are outside this unit.

## Actual consumer acceptance required

The existing calendar_customer_association_persist journey retains its original global-linked-task save, SQL association, reload and linked-editor assertion. It additionally opens Customer360 Agenda and creates a linked task and meeting through actual ordinary-cookie product commands. Before each save a fixture-only observer requires the displayed summary count to match actual SQL, then checks HTTP200 summary for the same customer, one-row SQL increase, server count equal SQL, rendered text count, preserved Agenda tab and one scoped receipt UUID. Its two table names are a closed allowlist; UUIDs are checked before SQL observation. No response/count is fabricated. The command envelope is receipt (verified against the existing repository), not data.

Current summary RPC counts all customer tasks/calendar_events, including history, and authorizes workspace/role before reads; this UI change does not alter it. Existing calendar cursor105 fixtures, other manual lifecycle/CAS/revocation/privacy checks, all107 literal product check names and prior screenshots remain. New actual customer360-agenda-created-1440 capture follows both confirmed saves; next journey restores its normal route.

Local lint four files, two syntax checks, types, diff check and literal107-name equivalence against accepted54 PASS. Full exact-source107/Auth/history/context/grounding/teardown, remote quality/build and actual image review PENDING; no source green is inherited from54@671. No heavy Windows stack/build starts (15.7GiB/2.62GiB available).

## Remaining gates

No API/RPC/schema/dependency/AI kernel or W4/W5 infrastructure change. #29 full audit fiveHIGH remains enforced; #10 physical AI business durability and independent W4 approval remain pending, AI writes disabled. PUBLIC critical risk/PRIVATE recommendation unchanged. Persistent installation remains resource-blocked; real disposable CI is not installation acceptance. VPS/production/providers untouched.

Next three: collect this exact source gates; review actual summary-after-agenda capture; normally compose only accepted sources and require the new canonical source whole gate.
