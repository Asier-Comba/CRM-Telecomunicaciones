# CRM Telecom — system state

Verified 2026-09-26 UTC. No accepted canonical base; no main creation or merge authorization.

| Area | Current verified state | Gate |
|---|---|---|
| W1 PR14 | 32f0112 real app; quality22/22/build pass; SQL onboarding42702 fails | Correct SQL and rerun identity/RLS; history scan acceptance pending |
| W1 PR15 | e65f1e8 nine migrations apply; domain trigger42703 fails | Domain SQL and nested READ output boundary |
| W2 PR8 | db8ab41;179 official tests;7 W4 probes | Fix expiry/revocation; READ/bootstrap may continue |
| W3 PR9 | c6e869e;62 official tests;5 W4 probes | Issue10 durable mutation evidence; reflection/audit P1 |
| W4 | baseline5cb872c preserved; night-shift-v3 review/harness | No promotion directly to main |
| Staging | Unprovisioned | No staging/restore acceptance |
| Production | Untouched | No deployment, data, DNS or infrastructure change |

Reproduction tests assert defects, not secure outcomes. SQL uses disposable PostgreSQL18.3/PGlite, not remote Supabase or multiprocess.
Detailed evidence and fixed findings: agents/W4_STATUS.md.
Executable gate source: .security/release-gates.json.
