# SIM association snapshot CAS repair

Source e8cd8057a6b7b4db9a39b298fd8f337bdb837311 is not accepted. Supabase run 37456586259 / job 112245583928 passed 2479 checks; browser job 112245583701 passed. Native job 112245583398 failed the replacement loser assertion at product-command-races.mjs:227: exactly one replacement committed, but only 18 of 19 losing commands returned SQLSTATE 40001. One returned the constant invalid-input error.

Under READ COMMITTED, a contender can read the old SIM version and subsequently read no open association after the winner closes it. Migration 20261006123000 locks and checks the current SIM version in that no-association branch. A stale contender receives 40001; a current-version invalid transition still fails. The branch terminates without acquiring any ancestor lock, preserving the normal contract → service → line → ordered SIM resource lock discipline.

No historical migration, identity, association history, provider truth, reveal permission or receipt handling is rewritten. Membership authorization and exact command receipt recovery remain before resource inspection. The existing 20 independent-process replacement test retains its one-winner / nineteen-conflict assertion and now reports SQLSTATE codes only on failure.

Acceptance remains pending until the repair source passes native concurrency, fresh/restore, and disposable Supabase. Quality on e8cd805 passed 283 Node tests, lint, types and build, then failed the unsuppressed six-HIGH dependency audit. This native failure is separate from that audit and Issue29.
