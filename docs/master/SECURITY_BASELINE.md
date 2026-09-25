# Security baseline

Status: initial W4 baseline. The repository contained no application code or commits when this baseline was created, so controls marked "required" are release gates, not claims about an implementation.

## Severity model

- **P0**: stop release or immediately dangerous work.
- **P1**: correct before the affected feature reaches production.
- **P2**: planned reliability or security improvement.
- **P3**: defense in depth.

## Non-negotiable tenant invariant

> A workspace cannot read or modify another workspace's data.

This must hold across Postgres/RLS, server endpoints, storage, imports, calendar, billing, webhooks, background jobs and assistant tools. Frontend filtering does not count as authorization.

Required implementation evidence:

1. A canonical server-side workspace resolver based on the authenticated user and active membership.
2. Deny-by-default RLS on every tenant-owned table, including views and functions that can bypass ordinary table access.
3. Storage policies binding object ownership/path metadata to workspace membership.
4. Service-role use isolated to narrow server modules; no service-role key in browser bundles or user-controlled workflows.
5. Adversarial tests using two users in two workspaces for list, read, create, update, delete, import, export and assistant tool paths.
6. Explicit handling for users belonging to multiple workspaces and for membership removal during an active session.

## Authentication and authorization contract

- Authentication establishes identity; it does not by itself authorize a workspace operation.
- `profiles.role` must not be used as an implicit substitute for `workspace_members.role`.
- W1 must publish one role model and migration path. Until then, privileged decisions fail closed when the two role sources disagree.
- API routes validate session, resolve workspace membership, validate role/capability and validate resource ownership in that order.
- Internal/status/test/debug/admin routes are absent from production unless authenticated, authorized and explicitly required.
- Webhooks verify signature, timestamp/replay window and idempotency key before mutation.

## Secrets and environments

- `.env*` is ignored except redacted example files. Example values must be synthetic.
- Development, staging and production use different Supabase projects, OAuth clients, webhook secrets, n8n credentials and storage buckets.
- Secret values are stored only in the deployment/CI secret manager, rotated on role/personnel changes and scoped to least privilege.
- Git history is scanned on every PR. A finding is handled as exposure: revoke/rotate first, then remove from history if necessary.
- No workflow prints environment variables or uses shell tracing around secret-bearing commands.

## API and browser baseline

- Strict input schemas and bounded pagination/body sizes.
- Per-user and per-workspace rate limits on authentication, search, imports, webhooks and assistant actions.
- CORS allowlist per environment; no credentialed wildcard origin.
- Security headers: CSP appropriate to the frontend, HSTS in production, `nosniff`, restrictive referrer policy and frame protection.
- Structured errors return stable codes without stack traces, SQL text or provider responses.
- Correlation IDs are accepted only after format validation or generated server-side.

## AI control plane

- Model text, retrieved content and tool parameters are untrusted.
- The model cannot select arbitrary SQL, URLs, tenant IDs or credentials.
- Tools have typed schemas, deterministic authorization, bounded outputs and explicit allowlists.
- Mutations require server-issued confirmation state bound to user, workspace, action, arguments and expiry.
- Writes use idempotency keys and verify referenced IDs belong to the active workspace.
- Prompt injection tests include retrieved documents, webhooks, imported rows and tool output.

## Initial findings

| Severity | Evidence | Risk | Required resolution |
|---|---|---|---|
| P0 | Repository had zero commits and no default branch content | No application, migration, RLS, auth or release control can be verified | Land an initial reviewed baseline and require CI before application merges |
| P0 | Branch protection cannot be configured with current non-admin repository permission | Direct/unchecked changes could reach `main` | Owner enables ruleset after `main` exists; require PR, review and W4 checks |
| P1 | No application schema/code was available | Tenant isolation and endpoint exposure are unknown | W1/W2/W3 land through PRs with the evidence defined here |
| P1 | No staging, backup/restore or observability configuration was available | Release and recovery claims are unverified | Implement and execute the staging/DR runbooks before commercial release |
