# D1A handoff

Base B43 (#191); proposal f1d452b; own branch `codex/documents-pro-d1-20261027`. Keep the PR Draft against the integrated commercial branch. No automatic adoption of #179/#195/#196/#197.

1. W1 or explicitly delegated owner: review the closed D1 proposal; decide metadata title/date minimization, authorization before page/count, permission-bound cursors, exact search semantics and canonical field provenance. No global library or folders are enabled pending that agreement.
2. W4: independently review the actual source diff, URL minimization/history, scope retirement, preserved byte gates and mechanical legacy locators. A green CI is not W4 approval.
3. W5: review a separate explicit D1 disposable helper/workflow once published. It will not modify shared run-stack, Storage policy or canonical migrations. It must verify local restoration and fail on cleanup errors.
4. Integrator: retain original failures and bind every run to its exact source SHA. The first UI source should trigger original real Supabase browser acceptance once. Do not rerun the full suite to hide intermittency. Own QA-only revisions can be stacked separately and must report their own source and limits.

Next executable independent unit: real Auth acceptance of the existing scoped reader (123-row pagination, two tenants, member/viewer rejection, same live JWT after revocation, exact uncertain archive replay and metadata during a controlled local Storage outage). Next product unit after backend agreement: consume the agreed global reader, then persistent folders; no frontend emulation.
