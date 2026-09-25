# W1 handoff — schema, roles and RLS

Severity: **P0 release gate**
Evidence: the repository contained no schema or migrations at W4 baseline creation.
Risk: tenant data could be exposed or authorization could diverge between `profiles.role` and `workspace_members.role`.

## Required fix

- Publish the canonical workspace membership and role model in an ADR.
- Decide the lifecycle of `profiles.role`; remove it from authorization or define a narrow global role with no tenant privilege ambiguity.
- Add `workspace_id` and deny-by-default RLS to every tenant-owned relation.
- Audit `SECURITY DEFINER` functions, views, RPCs, triggers and service-role paths.
- Add storage policies and migration ownership/rollback notes.

## Acceptance criteria

- Two-user/two-workspace tests prove denial for select, insert, update and delete across every tenant-owned table.
- Tests cover guessed IDs, changed workspace headers/parameters, removed membership and multi-workspace users.
- Anonymous and ordinary authenticated roles cannot call privileged RPCs.
- New migrations apply cleanly from zero and committed migrations remain immutable.
- Role disagreement fails closed and is covered by a test.
