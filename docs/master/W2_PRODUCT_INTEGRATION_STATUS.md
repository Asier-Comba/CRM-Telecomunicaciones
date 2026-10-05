# W2 product integration v2

Base: W2 2878687. W1 merged: 488647d. Draft PR30 targets w2/product-rebuild-v1.

I1 complete: merge preserves both histories; no migration, security manifest or backend policy edits.
I2 implemented: closed typed repository, explicit loopback local mode, real-cookie authentication and active server membership. Production and hosted URLs refused. Four client/mode safety tests pass.
I3 partial: customer create/edit/archive/restore and contact create/edit/primary in mounted drawers. Every write captures one command UUID with exact retry input and uses editor CAS. Contact data remains in mounted component memory only. Search is capped at five companies; complete customer collection, assignment and remaining 360 families are pending.

Actual Supabase product UI journeys NOT_RUN. Inherited W1 522 checks are backend evidence, not W2 UI evidence. No parity row is promoted yet. Baseline 244-row scores remain 47.4% old parity, 54.8% telecom, 51.6% interaction, 52.2% AI UI; measured W2 wiring and actual local writes remain 0 pending product browser proof.

Configuration: use next dev with PRODUCT_LOCAL_INTEGRATION=true, PRODUCT_LOCAL_SYNTHETIC=true, PRODUCT_V1_ENABLED=true, PRODUCT_V1_ORIGIN=http://127.0.0.1:3109 and NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 plus local anon key. The authenticated identity must use @example.invalid. Do not enable demo or offline bypass flags. Misconfiguration displays unavailable and never falls back to fixtures. Next production runtime rejects integrated UI even on loopback.

Pending: actual Supabase/browser customer journeys; complete Customer360; calendar; opportunity; portfolio; dashboard/search shell; billing; team/docs; W3 UI contract; screenshots and behavioral parity refresh. Issue29 is open; full audit remains enforced. No staging/production readiness or external effects.
