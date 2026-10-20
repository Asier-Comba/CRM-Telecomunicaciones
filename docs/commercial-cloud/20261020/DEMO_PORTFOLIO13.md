# Cartera — visible pending search feedback

CLAIM6294980728. Independent proposal froma9e; not a causal repair of100bf.
The original search disables its button and clears results while awaiting HTTP,
without telling the user that it is consulting data. Reproduced at390/768/1440:
three failures of the visible-status assertion after an intentionally held read.
This controlled hold is not a claim about the original Supabase timeout.

Only two markup insertions in IntegratedPortfolio.tsx, byte-normalized comparison
verified againsta9e: a polite status above the search form and a named busy results
region. Status is outside the busy region to avoid deferring its announcement.
Transport, commands, epochs, errors, selectors, search limits and permissions stay
identical. No SQL, platform or shared contract change.

First implementatione033 passed9behavior checks, but visual review found the
mobile message below the viewport. Retained rather than counted as visual PASS.
Final source960d2d8c874c06c425ac90e8c9f49f88a28dff92 places it above the form.
Final own9browser checks pass: pending→success, pending→403 and retry after403 at
all three widths, including actual viewport visibility, error clearing, result
readback, preserved query, settled busy state and no commands. Existing6selection/
closed-reference regressions also pass on that source. No retries/skips/flakies.
Targeted lint and default production build/TypeScript44pages pass on that source.
Earlier attempts/results remain separate; not cumulative across SHAs.

[Evidence and hashes](portfolio13/acceptance.safe.json) contains three visually
reviewed pending-panel captures. They show real compiled components with controlled
HTTP and synthetic data, not Netlify/Auth/DB or hosted module acceptance. Independent
cloud162 still requires W5's already-requested exact deploy/private window/A/B.
Original100bf failure, fiveHIGH, platform/Storage/security dependencies remain.
Business AI writesOFF; voice/modelNOT_RUN; releaseNOT_ACCEPTED.
