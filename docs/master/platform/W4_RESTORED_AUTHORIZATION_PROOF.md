# W4 restored authorization proof

This audit unit starts at W5 composition d365b818e27ec3190474a4aed8ad5010b6ce21e7, PR70. It strengthens the actual disposable recovery assertions without editing domain, Auth, RLS, grants or product implementations. Previous W5 recovery evidence remains source-specific.

After reconstruction, each of ownerA, ownerB, removedA and suspendedA is checked through a fresh password login and its retained pre-reconstruction JWT. Workspace scope/revocation must remain correct. Authorized Storage download requires200; denied access requires the known private-object-not-found response. The raw assistant table requires authenticated permission denial403/42501. Server failures, expired/authentication failures, missing routes, malformed responses and unexpectedly broadened ACLs cannot pass these assertions.

Evidence records only synthetic actor labels, session category and outcomes. No passwords, JWTs, object bodies or error details are emitted. Unit controls exercise positive and adversarial response classifications; they do not substitute for native recovery CI. Fresh native evidence is required on this branch. This remains W4 test execution by the same executor, not independent final approval of W5. Existing signed-ticket lifecycle, hosted Auth portability, offsite proof and production remain separate pending gates.

NEXT3: run exact-source disposable recovery; retain native results and any failure without broadening accepted responses; obtain true independent review before adoption. Issues22/10 remain open.
