# W2 consumer foundation gate

Accepted W1 source: e09ddf222b22e72150e7c27bf0d1b68f9ae4dd63. Published normal merge: 2b9804c4b883a70ad86e174c839328b95678f29d, parents a8c116d and e09ddf2. Draft PR30 remains the integration target. The user explicitly approved publication of the reviewed merged acceptance script on 2026-10-06.

Exact consumer Supabase run37434070031: 55 migrations; 18 ordinary collection reads PASS with actual cookie/filter/keyset/privacy/revocation checks. All 68 product browser groups executed: 66 PASS, 2 FAIL. Teardown PASS. The old pre-browser cleanup blocker is gone. Customer creation, detail navigation, edit and reload PASS on this merge. No new collection UI/mobile/visual completion is claimed.

The two failures stop before the retry click in document cleanup and invitation reissue. Inspected synthetic screenshots show the transport-uncertain error visibly rendered; ConfirmDialog omitted role=alert, which both journeys require. The correction exposes the existing error as an accessible alert without changing authorization or command identity.

This checkpoint also requires a fresh authorized customer read before closing/navigating after save. A confirmed receipt stays in mounted memory if the read fails; retry reads again without creating another customer. The typed adapter consumes the 18 closed collection contracts, preserves bigint money strings, validates cursor order and rejects private DTO additions. These adapter checks do not certify UI integration.

Merge CI: lint/types/287 Node/build, native PostgreSQL, PGlite, migration guard, secrets, private browser bundle and synthetic browser preview PASS. Quality job fails only npm audit: six high vulnerabilities, including the newly reported source-map-js advisory, under Issue29. Dependency review and critical Playwright are SKIPPED, not PASS.

Local correction: 293 Node tests PASS; types/lint/build checked before publication. One inherited lint warning remains. Exact CI/Supabase for the correction must pass before major UI expansion. No production deployment, main merge, live provider call or W3 assistant write is included.

NEXT: publish the correction and run exact consumer acceptance; once green apart from Issue29, integrate customer collections, ordinary assignees, Customer360 inventories, catalog/version history, portfolio, opportunities and activity. Keep each completion claim tied to actual browser, mobile and visual evidence.

## Follow-up exact evidence

Correction source b333b03741e8c7d30395354abbc8e1c95ff27e41, Supabase run37435781710: all68 groups executed,66PASS/2FAIL,teardownPASS. Both cleanup and invitation exact retries now PASS. Customer fresh-read/save flow PASS. The two remaining private-download denial checks encounter duplicate accessible alerts in the page and its active confirmation dialog. The follow-up suppresses the background duplicate while the dialog owns the error; it retains the denial and exact retry behavior. Exact acceptance remains required. The integration manifest now contains only18 product component mappings and references earlier detailed reviews in Git; the minimal version was accepted for publication.
