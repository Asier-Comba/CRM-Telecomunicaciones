# Current document metadata selection

Owner: W2 normal product. Base: reviewed source396 of own PR38. No change to metadata DTOs, Auth/RLS, Storage, commands, CAS, maintenance receipts or private download tickets.

Reproduced five failures on the actual IntegratedDocuments component and production React using controlled loopback HTTP responses: late first success replaced the latest metadata; late first failure contaminated the latest selection; late success reopened a closed drawer; a previous target's response opened after changing company; a response received while the viewer role was active resurfaced after returning to owner. These are presentation lifetime failures, not evidence of backend authorization bypass.

The selection hook associates results and safe errors with the current actor/workspace/role/target scope and a per-read generation. Closing, selecting another record, changing scope/repository or unmounting invalidates preceding callbacks. Scope changes clear retained state. No automatic metadata reads, retries or command calls are introduced. Every read still uses the existing repository's requested-ID validator and backend authority.

Integrity refresh retains the selected metadata when its reread fails and propagates the failure to the existing DocumentIntegrity caller. That caller keeps the confirmed maintenance receipt and exact retry material; this patch does not consume or reconstruct those command identifiers. The successful refresh replaces metadata normally.

Focused browser coverage uses eight scenarios in desktop/mobile, the actual component and hook, production React and delayed HTTP responses. The repository, presentation wrappers and integrity callback are disposable fixtures; they do not prove real Auth, private Storage, native drawer focus or command execution. The five original failures are retained as pre-change evidence. Existing document boundary tests and full exact-source CI/Supabase acceptance remain separate required evidence.

The source remains an unconsumed Draft until its own closed gates and actual screenshot review. Business AI stays OFF; issue10 physical driver, independent W4 acceptance, five HIGH findings, model activation, persistent Windows installation and release remain pending. No main, W4/W5 source, production, accounts, providers or real data changes.
