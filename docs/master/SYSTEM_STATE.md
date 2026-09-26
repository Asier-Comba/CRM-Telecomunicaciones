# CRM Telecom — system state

Verified 2026-09-26 UTC. No accepted canonical base; no main creation or merge authorization.

| Area | Current verified state | Gate |
|---|---|---|
| W1 PR14 | 32f0112 real app; quality22/22/build pass; SQL onboarding42702 fails | Correct SQL and rerun identity/RLS; history scan acceptance pending |
| W1 PR15 | e65f1e8 nine migrations apply; domain trigger42703 fails | Domain SQL and nested READ output boundary |
| W2 PR8 | db8ab41;179 official tests;7 W4 probes | Fix expiry/revocation; READ/bootstrap may continue |
| W3 PR9 | 91b4b3e;173 official tests;6 W4 probes | Reflection fixed; Issue10 durable evidence, audit delivery and capability result schema remain |
| W4 | baseline5cb872c preserved; PR16 b595249 CI132 green | No promotion directly to main; synthetic snapshot/restore only |
| Staging | Unprovisioned | No staging/restore acceptance |
| Production | Untouched | No deployment, data, DNS or infrastructure change |

Reproduction tests assert defects, not secure outcomes. SQL uses disposable PostgreSQL18.3/PGlite, not remote Supabase or multiprocess.
Detailed evidence and fixed findings: agents/W4_STATUS.md.
PR14 CI109 secret scan passed. Local-only SQL fix candidates pass identity/domain fixtures; published W1 heads still fail. Import terminal INSERT bypass independently reproduced on unchanged PR15; browser writes remain revoked.
Executable gate source: .security/release-gates.json.
