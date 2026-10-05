# W2 product integration v2

Base: W2 2878687. W1 merged: 488647d. Draft PR30 targets w2/product-rebuild-v1.

I1 complete: merge preserves both histories; no migration, security manifest or backend policy edits.
I2 implemented: closed typed repository, explicit loopback local mode, real-cookie authentication and active server membership. Production and hosted URLs refused. Four client/mode safety tests pass.
I3 partial: customer create/edit/archive/restore and contact create/edit/primary in mounted drawers. Every write captures one command UUID with exact retry input and uses editor CAS. Contact data remains in mounted component memory only. Search is capped at five companies; complete customer collection, assignment and remaining 360 families are pending.

Actual Supabase product UI journeys NOT_RUN. Inherited W1 522 checks are backend evidence, not W2 UI evidence. No parity row is promoted yet. Baseline 244-row scores remain 47.4% old parity, 54.8% telecom, 51.6% interaction, 52.2% AI UI; measured W2 wiring and actual local writes remain 0 pending product browser proof.

Configuration: use next dev with PRODUCT_LOCAL_INTEGRATION=true, PRODUCT_LOCAL_SYNTHETIC=true, PRODUCT_V1_ENABLED=true, PRODUCT_V1_ORIGIN=http://127.0.0.1:3109 and NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 plus local anon key. The authenticated identity must use @example.invalid. Do not enable demo or offline bypass flags. Misconfiguration displays unavailable and never falls back to fixtures. Next production runtime rejects integrated UI even on loopback.

Pending: actual Supabase/browser customer journeys; complete Customer360; calendar; opportunity; portfolio; dashboard/search shell; billing; team/docs; W3 UI contract; screenshots and behavioral parity refresh. Issue29 is open; full audit remains enforced. No staging/production readiness or external effects.

I4 partial: existing calendar widget consumes calendar.list with 93-day bound and explicit first-100 partiality. Task create/update/complete/cancel and meeting create/reschedule/complete/cancel use work.get CAS editor and command receipts. No dragging or deadline mutations. Task/meeting creation currently has no customer assignment control.

I7 partial: real my/workspace dashboard with period/snapshot separation, native-currency financial authorization, unavailable team state and coded recent activity. Topbar and Ctrl/Cmd-K consume the seven-kind bounded global search. Invoice navigation is preparatory; billing integration is still pending.

Validation: 225 Node tests, typecheck, lint and production build PASS at the earlier client checkpoint. First UI run37304343398 failed before customer creation because preceding backend workspace-revocation test intentionally suspended Synthetic A. UI harness now reactivates only that synthetic workspace after proving backend denial. New run pending. No product browser PASS or parity promotion yet.

I9 implemented pending browser: protected team roster/invite intention/role/suspend/resume/remove/cancel intention, preserving owner and hiding self-management. Document list/get_metadata/archive/restore scoped by selected customer; upload/content preview/download unavailable.
I10 partial: W3 typed presentation handoff, thread search and contextual invoice shell, with sending disabled in integrated mode pending W3 and Issue10. No semantic/provider implementation.

Run30 still failed customer_create after workspace restoration and handler warmup. Native fetch was invoked with a repository receiver; client now binds to globalThis and a receiver regression test passes. New harness retains safe passed-check names and HTTP path/status diagnostics only. No full product journey PASS claimed. Billing typed adapter/editor support exists but billing module activation remains pending.

I8 implemented pending actual billing browser: same invoice editor in local integrated mode, exact minor-unit adapter, normalized text/audio invoice.propose review with saved=false, real draft create/update, issuer/customer fiscal setup, explicit issue/payment/reverse/trash/restore confirmation and authorized streamed PDF. Production disabled. Collection pagination/status/customer filter/native currencies wired. Financial totals displayed from server receipts/reads. W3 entry remains disabled. Invoice summaries are used by list and full invoice.get by detail; separate invoice.summary is typed but not consumed yet. New links, FX/fiscal series configuration ergonomics and complete invoice rendering remain partial.

At f60ed1a / Supabase run37306983974 the browser proved six positive journeys: real password-cookie login, customer create, customer edit/reload, primary contact create/reload, customer archive/restore/reload and contact PII absence from local/session storage and URL. Native browser also confirmed unbound fetch requires global receiver; corrected binding worked. Full suite failed later because search expectation used legal name while the W1 canonical label is trade name. Expectation corrected to the observed backend contract. CAS/revocation/viewer/calendar and billing not yet credited.

I5 partial: canonical stage UUID catalog and existing list/board; bounded search → work.get → create/update/change_stage/win/lose/reopen/archive with CAS. Current currencies preserved; expected close/next action and bounded coded history. No fake stage names/IDs, optimistic commits or localStorage. Assignment, new portfolio links, complete collection and dragging pending.

Run35 / bd7b6e1 verified contact.update with actual primary replacement and dashboard/global search after prior positive customer journeys. Next failure was a strict test selector matching both sidebar and drawer Type controls before task creation. Test now scopes Type to the active dialog. CI314 Node228/lint/types/build pass; native PostgreSQL/embedded/secret/migration/guardrails/synthetic browser/production fixture closure/Windows launcher pass. Only full dependency audit Issue29 fails the quality job; dependent Critical Playwright/dependency review are skipped. Product Supabase UI remains incomplete, not a full PASS.

## I6 — portfolio and W1 content continuation

Normal merge of W1 42176c7 (executable eff8022): 42 migrations /177 manifested functions and actual 568-check Auth/Storage acceptance. Metadata shapes and UI_SAFE remain unchanged. W2 adds portfolio.get, manual contract activation/cancel, service/line creation/labels/transitions and manual renewal/permanence commands, source-preserving read-only imported facts, civil dates and exact mounted CAS/command retry. Renewal/permanence editors are also reached from calendar. Full inventory, operator/plan selection and assignment remain PARTIAL; no raw-ID forms or unchecked RPC authorization.

Protected local document content UI now requires PRODUCT_DOCUMENT_CONTENT_ENABLED as well as integrated-local gates. Prepare/upload/explicit finalize are distinct steps, same File bytes and command IDs survive retries only in mounted memory. Thirty-second proxy download rechecks actor/document/membership; no Storage URL or path reaches UI. Scanner/hash attestation, preview and orphan cleanup remain unavailable. W2 browser verification pending; W1 evidence alone does not promote consumer safety.

At merged 77da0b, CI316: 232 Node tests/types/lint/build, embedded/native/restore/preview/production closure/secret checks PASS; audit remains sole quality failure (Issue29,5 high). Supabase37 backend568 checks completed, eight W2 positive journeys passed, calendar selector label blocked further UI coverage. Explicit select accessible label added. Acceptance now records failed independent journeys and continues remaining families, while any failure keeps the suite FAIL; it never retries failed tests. Screenshots are captured per failed journey and for desktop/tablet/mobile.
