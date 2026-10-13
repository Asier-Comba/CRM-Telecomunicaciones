# W2 integration clock and selected-customer readiness — 2026-10-09

Owner: W2. Base: composition PR #38 at `e6ca5dc7875d5552d12ef2da72039608e74890e7`, tree `3fd60c7e68b8f927dde6ef7e01cc234590426f19`.

## Actual failed source

Supabase run 37861869713/job 113599260301 executed virtual merge `1eceba59a09e9ee6c6088bd4f8f77a0009b99f29` with that identical tree. Auth was 200, all 73 migrations applied, backend checks 3468+227 and history backend/API/browser passed, teardown passed. W2 UI was **104/107**. Document command and Storage upload journeys passed. Quality run 37861869673/job 113599259989 passed lint, types, 411+482 tests and build; full audit still failed with five HIGH findings (#29). Skipped dependent gates are not PASS.

The proposal-date assertion used a UTC `day` captured earlier in the long browser suite. The failed screenshot shows issue date 2026-10-09 and due date 2026-10-24, whereas the earlier oracle was 2026-10-08. Capture the independent UTC proposal day at the start of this existing journey; keep exact date, price, unchecked review and zero SQL creation assertions. Product date semantics are unchanged.

The next journey reached its save assertion with the client-side error “Selecciona un cliente de la muestra.” It never reached the intentional Storage failure. Source inspection shows the URL customer id enables a new draft before the separate authorized customer response supplies its selectable name. Guard draft creation and proposal availability with that loaded customer. The exact timing of the earlier failure is not proven by its screenshot alone; the new existing financial journey deliberately holds the real customer response and asserts disabled/unavailable actions, then releases it and requires the actual authorized name and enabled draft. No substituted response, removed validation or private read is introduced.

The mobile shell screenshot is on Automations. Its failed substep was previously unknown. Add fixed route ordinal/stage and logout stage diagnostics only. Keep its original route, Escape/focus, DOM and real cookie logout assertions and time budgets. **No mobile-shell fix or whole-suite success is claimed yet.**

No business backend, RLS, CAS, idempotency, migration, provider, W3 kernel or W4/W5 owned infrastructure changes. Retain 107 browser journeys. Local syntax, changed-file lint and types are required; the actual disposable Supabase run is pending. Windows has approximately 2.6 GiB free of 15.7 GiB, so local Docker/app/browser remains resource-blocked.

Next: collect exact-source full CI; use shell stage evidence for any remaining failure; compose independently accepted W2 #46/#47/#48 only after reviewing their deltas and re-run the resulting source. #10 business AI writes and independent W4 approval remain blocked. PUBLIC repository remains a critical governance risk; recommend PRIVATE without changing visibility.
