# W4 independent reconciliation — 2026-09-30

Exact heads and decisions: `.security/reviews/iteration-6.json`. Review comments:
PR21/5917126784, PR19/5917128725, PR18/5917130943,
Issue10/5917145162, Issue12/5917147006. All PRs remain Draft.

## Evidence and limits

| Evidence | Independently verified result | Limit |
|---|---|---|
| PR21 clean checkout | npm ci;128/128 Node tests;lint;types;build PASS | No live provider or real customer data |
| Preview HTTP | W4 development33 and production17 assertions PASS | Loopback synthetic only |
| Semantic denials |7 attacks deny with zero repository calls; ambiguity/partiality PASS | Scripted planner, not LLM evaluation |
| Browser | CI252 artifact11090996803 report4/4 expected,0 unexpected/flaky/skipped; desktop and Pixel7 projects; zero retries; screenshots inspected | W3 CI execution independently audited, not W4 local browser execution |
| Local Playwright | API2/2 PASS; journeys fail before page launch because executable absent | Official browser archive download truncated; do not label a product failure |
| W5 exact final schema |24 verbatim migrations; domain, all-reader fixture, A-B seed, durable relational and embedded restore PASS | PGlite0.5.8 with synthetic auth/storage stubs |
| C2 effective schema |25 migrations; both exact absence codes round-trip; repeated lease stable; explicit NULL rejected | Same schema at PR19 and PR21; no durable process conformance |
| Storage policies | Owner/admin see own linked object; foreign/orphan/quarantine hidden; member/suspended workspace/anon denied; archived metadata revokes | SQL stub only, not Storage API/file acceptance |
| Native PostgreSQL | CI216/223/252 service postgres:16; psql migrations/fixtures; pg_dump/checksum; new DB pg_restore; rows/forced RLS/scoped reader checks PASS | Upstream CI inspected; no local Docker/psql available |

Browser artifact SHA256:
`f02c7d5282f9d1b258f0534b7fffed6b4acc9cbd1f272e05ceba2a8149495918`.
Dedicated preview browser PASS is separate from skipped general Critical Playwright.
Dependency Review is skipped, not passed: repository owner must enable Dependency
Graph and `DEPENDENCY_REVIEW_ENABLED=true`, then execute review/negative control.

## Boundaries reviewed

Preview pipeline: route accepts only text → server-owned scope → scripted planner
→ validated semantic plan → W3 typed READ runtime → W2 authorized telecom.v1
service → synthetic repository → closed DTO → grounded UI. SQL/URL/tool/workspace
authority never comes from the model/caller. Seven denied attacks execute zero
repository calls. No write dispatcher, provider or external effect is registered.
Date-only display uses UTC, instants Madrid; fixed synthetic as-of is explicit.
Amounts use integer minor units and EUR fixture formatting; no user currency input.
Unknown/foreign/encoded/oversized customer paths reach notFound, without first-row
fallback. Next streamed notFound may retain HTTP200; the error boundary is checked.
Production can echo a requested ID in RSC router metadata; fixture values remain closed.

The browser journey asserts complete navigation, Customer360 relations, grounded
answers, denials, one H1, no visible legacy vocabulary, no mutation controls,
no overflow, no console/page/request errors and no non-loopback requests.
Active Settings/Topbar/Sidebar also have no legacy vertical labels. Inherited inactive
routes/modules remain historical; this is not blanket removal of the legacy tree.
Real service-role values were not provisioned: no browser/model wiring from this
preview. A credential-name label in inherited settings is not a credential value.
All14 privileged READ functions use active actor/workspace DB reauthorization,
bounded projections and server-only grants. Raw domain access remains closed;
global service_role can still impersonate valid caller-supplied actors if a future
HTTP factory is unsafe. Prefer JWT/auth.uid() execution where viable; verify the
actual factory before real-data acceptance. Current application wiring is absent.

## P1 RESTORE-ACL-001 (Issue22) — privilege recovery

Native script passes `--no-acl` to pg_restore, omitting GRANT/REVOKE restoration.
Its restored readers execute as postgres and only a raw-table SELECT privilege is
checked. Default PUBLIC function EXECUTE can therefore reopen server-only definers.
W4 `restore-acl-v6.sql` proves pristine anon execution denied, then models missing
REVOKE and reproduces anonymous reading with a forged valid actor/workspace pair.
This is a source/embedded-model finding, NOT a native restored-DB reproduction.
Official semantics: https://www.postgresql.org/docs/16/app-pgrestore.html and
https://www.postgresql.org/docs/16/ddl-priv.html. Preserve ACLs or restore audited
role mappings before exposure; compare all server-reader grants and execute denied
anon/authenticated plus scoped service-role calls after restoring. The new
`restored_privilege_matrix` evidence is mandatory for recovery.restore. Genuine
synthetic dump/checksum/schema/row evidence remains valid; secure privilege recovery
is not accepted. No composition/preview blocker and no production change.

## Remaining gates

Issue10 P0 is narrowly physical durable adapter/factory/dispatcher, schema-versioned
safe results, atomic transition+original audit intent+delivery outbox, native v2
driver,20 independent-backend races,restart/SIGKILL,lease fencing,one effect,
lost ACK/reconciliation and revoked/cross-actor/workspace evidence. C2 fixes code
storage and leases only; reserved state does not authorize an effect.

Issue12 P1: actual Supabase Auth/JWT/PostgREST/Storage and scoped principal/config
acceptance. Local config PG15 vs CI PG16 needs explicit compatibility validation.
INFRASTRUCTURE_PORTABILITY.md and ENTERPRISE_IDENTITY_AND_SECRETS.md are absent.
Two admins/2FA/rotation, production SMTP/redirects/password/recovery/MFA and
SPF/DKIM/DMARC remain configuration evidence, not inferred from TOML.

Storage signed-access expiry, revocation, listing restriction, object binding and
orphan cleanup remain API gates. ZIP is a private bucket only: no validator,
extraction or scanner seam; zip-slip/symlink/bomb/nesting/MIME defenses unproven.
Real ZIP/files remain blocked. Native synthetic DB restore is accepted evidence;
encrypted offsite production DB and object/Auth/config/n8n recovery is not proven.

Old sensitive expiry/absorbing revocation/queued reveal/generation/timestamp/ABA/NaN
findings are INACTIVE/FUTURE in this fixture UI, not fixed. P2 before wider exposure:
request.text buffers a full chunked body before rejecting size; client reply parsing
checks outer shape only. Duplicate text keys use JSON last-value semantics without
adding authority. No new synthetic-preview P0/P1 reproduced.

## Reproduce W4 probes

Use Node24 and the exact detached PR21 checkout. Start only a loopback development
or built production server with explicit demo flag; port must be31xx. W4 probe:
`node scripts/security/review-preview-http.mjs development 3107` (production mode
against a separately started local production build); semantic probe:
`node --experimental-transform-types scripts/security/review-preview-semantic.mjs <product-checkout>`.

Install locked W4 embedded runner. `run.mjs <product> <SQL> <injected-SQL>` applies
verbatim migrations and optional synthetic Storage stub. Inject storage-policy-v6.sql
into telecom-domain-rls.sql. For C2 concatenate synthetic_portfolio.sql with
assistant-durable-foundation.sql in scratch and inject durable-c2-v6.sql before its
rollback. Never run these fixtures against hosted/production infrastructure.

Human preview: `npm ci`; `npm run preview:dev`; http://127.0.0.1:3107/login →
**Ver demo telecom**. Synthetic/read-only only. CAN_TEST_SYNTHETIC_PREVIEW YES;
CAN_INTEGRATE YES; CAN_STAGE NO; CAN_PRODUCE NO. No merge/deployment performed.
