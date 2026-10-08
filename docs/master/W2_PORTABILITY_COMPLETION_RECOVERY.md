# W2 portability completion recovery

Owner: W2. Branch: `codex/w2-portability-completion-gate`.
Source: `w2/product-integration-v2@99f1417bdae138cba8396b41e40db99d1129998b`.
Observed W3: `972e96c680a39db25ed1555de4eed9b7149925e3`.

## Context gate and scope

The owner authorized local development, synthetic tests, isolated branches and
Draft PRs on 2026-10-08. Source HEADs, current contracts, PR comments and CI were
rechecked before this unit. Original master sources 00–19 are not accessible;
01/02/03/11 and versioned domain/security contracts supply this unit's decisions.
There is no consolidated current MASTER/DECISIONS file. No missing decision was
inferred to change authorization or a shared contract.

**CRITICAL GOVERNANCE RISK: this proprietary SaaS repository is PUBLIC.** Recommend
that its owner make it private and review access, history and artifact exposure.
Visibility has not been changed; this recommendation is not authorization for a
repository administration change. Only synthetic fixtures and safe diagnostics
belong in public commits, PRs and CI artifacts.

## Reproduction and cause

Existing exact-source real Supabase run37818665552 executed merge
`5dd42c6577a356b7cdcb4509491f477bc7cabbde`, tree-identical to source99f1417.
106/107 browser groups passed. The failed group was
`portability_requested_scheduled_progress_confirmed_no_line_action_read_retry`.
Its injected read response is the closed HTTP503 `{ok:false,error:'unavailable'}`.
The production client maps that to `ProductUiError('unavailable')` and the visible
message `Esta función no está disponible ahora.`. The browser oracle instead
expected `No se pudo completar la acción.`, which is the separate `internal_safe`
message. The unchanged client mapping was independently exercised locally and
returned unavailable with the former text. Existing failure capture shows the
confirmed command lock after completion; this capture alone is not root proof.

Unchanged-source rerun37847534309 was dispatched before the correction. Its real
Supabase/browser result is pending at this checkpoint. Local response injection
is a focused client-boundary reproduction, not Supabase or complete product proof.

## Change and retained controls

The consumer browser oracle now requires the exact unavailable alert. It also
requires the injected read to return the exact503 envelope and the UI to retain
the factual saved-command/read-only-retry status. Named substeps isolate failure
without printing private responses or user text.

All prior assertions remain: disabled completion before operator acknowledgement,
explicit `line_action=none`, human confirmation, one write, persisted completed
date/version7, line status pending/version1, refreshed terminal controls, masked
history, viewer denial and1440/768/390 captures. No retry or timeout was increased.
No application code, RPC, migration, authorization, CAS, idempotency or provider
behavior changed. Shared contracts and their consumers are unchanged.

## Evidence and limits

Clean lockfile installation completed locally on Node24.12.0/npm11.6.2.
Full dependency audit reports5HIGH through braces/micromatch/fast-glob/Next lint.
No suppression or downgrade. Lint/types/tests/build are pending completion;
corrected whole-source Supabase and W2/W3 composition are NOT_YET_PROVEN.

Windows has15.7GB RAM, initially3.45GB available. Heavy checks run sequentially.
Docker remains stopped to avoid memory saturation; native PostgreSQL and real
Supabase acceptance use the existing disposable Linux CI. No personal process
was closed. A full local installation is a separate unfinished phase.

Issue10 remains OPEN: business-action durability and independent W4 acceptance
are absent. Assistant writes, external sends, company staging and production
remain disabled. Existing W4 evidence is limited to its recorded exact sources;
no new independent approval is claimed. W5 infrastructure is not modified.

Next3: verify corrected107/107 on the published source; test the normal W2/W3
composition with history/Auth/revocation preserved; investigate Issue29 compatible
remediation while retaining the enforced full audit. Resume by fetching remote
HEADs, checking the worktree, PR comments and the latest terminal run at its actual
executed SHA. Update this checkpoint with final source/run before acceptance.
