# W2 — current private invoice PDF state

The actual PrivateInvoicePdf component retained its old successful reference while the invoice version or product repository changed. If the next reference read was denied, it set an alert but left the old download control visible. The protected server still checks authorization and bytes: this reproduction establishes stale UI state, not an authorized download bypass.

The reference is now bound to the exact invoice ID, invoice version, local read revision and repository identity. A render outside that binding exposes neither download nor conservation controls. A denied read clears the reference and retains only the existing safe alert. A short loading status explains the pending read. The existing disposal guard rejects late previous reads. No additional reads, commands, retries, stored authority, server route changes or permission relaxation are introduced.

Exact pending conservation intent, command ID and both version comparisons are unchanged. A lost conservation response still retries the same command. A current authoritative not-found reference still permits conservation; it does not invent a stored copy. Existing frozen fiscal bytes, integrity verification, archival denial and server-generated numbering remain required.

Local evidence:

- Four regression cases execute the compiled actual component at a controlled hook seam. Three fail in source158 (version change, repository change, denied read); the existing late-disposal case passes. The corrected component passes all six new cases, including exact uncertain conservation retry and current not-found behavior. Together with six existing artifact/PDF regressions: twelve PASS. Lint of component and test PASS.
- A single lightweight Chromium comparison uses actual PrivateInvoicePdf, React production and a loopback HTTP reference fixture. The three failures reproduce in the before component and disappear in the corrected component: six cases, twelve reads, zero commands and zero browser errors. The fixture provider supplies closed synthetic reference data; it does not establish Auth, principal membership, database, full billing shell or successful private downloads.
- Three loading-state captures at1440/768/390 were actually reviewed: title, explanation, loading message and refresh control are complete and no global overflow occurs. Download/conservation controls are absent while the current read is held. Existing compiled Tailwind/Geist CSS is used; the fixture supplies its own simple control class. These are component-layout observations, not full-product visual acceptance.
- The browser starts only after observing2.01GiB free RAM and is closed afterwards. No Docker, full build, second browser instance or personal-process change is made. Lower memory after the probe blocks further heavy local work.

Development dependency: PR110 source `7ab25740ea1a3a0f01bf9d1f6e12a833ac97b5d4`, with its own functional/native CI and six real Playwright transport regressions closed, while its separate107/55QA remains pending. This dependency is confined to an isolated development branch; canonical PR38 stays at independently closed158. This new tree needs its own full CI, Supabase107 and fresh55 product/history visual review; no evidence is transferred from158 or110. Original PR108 failure remains immutable.

Issue29 five HIGH audit findings, issue10 physical durable implementation, independent W4 and local stack readiness remain open. Business AI effects remain OFF.
