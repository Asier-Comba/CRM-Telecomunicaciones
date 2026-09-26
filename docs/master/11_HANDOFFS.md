# 11 — Handoffs

- Updated: 2026-09-26
- Owner: W1
- Branch: `w1/canonical-v3`

## W1 → W2

The stable presentation contracts remain `telecom.v0` in
`W1_DATA_CONTRACTS_V0.md` and `src/lib/contracts/telecom-v0.ts`. The current
branch is not yet an accepted integration base. W2 must not infer physical
tables or authorization from the UI snapshot.

The identity shell exposes a role only when both workspace and membership are
active. `profiles.workspace_id` is a preference and is accepted only when it
matches that authorized pair.

## W1 → W3

Use `src/lib/server/tenant-context.ts` as the W1 actor/workspace boundary.
Workspace identifiers from model output or request bodies cannot replace the
resolved membership. Historical agent and confirmation routes are absent; no
arbitrary SQL/HTTP or global agent credential is enabled.

## W1 → W4

Review the new history from `w4/security-baseline@5cb872c`. The reconstruction
does not contain the prior W1 commits, archived infrastructure documents,
legacy migrations, live-patch scripts or privileged historical routes.

Review targets:

1. full-history value-redacted secret evidence and clean-clone gates;
2. tenant resolver fail-closed behavior;
3. `20260926143000_enforce_active_workspace_authorization.sql`, including all
   five helpers, membership policy and suspended-onboarding denial;
4. the 28-case tenant harness and real database RLS attacks once isolated
   infrastructure is authorized.

No migration has been applied and no production system has been touched.
