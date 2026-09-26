# Tenant isolation adversarial test plan

The executable adapter contract is in `scripts/security/tenant-isolation-harness.mjs`; its versioned
matrix is `.security/tenant-isolation-cases.json`. CI runs the complete matrix against a secure
reference adapter and proves negative controls for anonymous access, cross-tenant resource use,
removed/suspended membership, service-principal scope, role escalation and list leakage. W1 must
bind the same adapter contract to DB/API/storage behavior in a non-production environment; the
reference adapter is not live RLS evidence.

Status: executable design pending the W1 canonical schema and non-production Supabase project.

## Invariant

> Workspace A can never read, infer, create, modify, delete or trigger effects against Workspace B data.

Passing frontend filters or happy-path unit tests is not evidence. The invariant must hold at the database, server, storage and integration boundaries with real authenticated principals.

## Test principals and fixtures

Create only in an isolated test or staging environment:

| Principal | Membership | Role purpose |
|---|---|---|
| `anonymous` | none | unauthenticated denial |
| `a_member` | Workspace A | ordinary member |
| `a_admin` | Workspace A | tenant administrator |
| `a_multi` | Workspaces A and C | active-workspace switching |
| `b_member` | Workspace B | foreign tenant control |
| `removed_a` | membership revoked during session | stale-session denial |

Each tenant-owned entity requires at least one A record and one B record with opaque, known IDs. Fixtures must use synthetic values and must never run against production.

## Required attack matrix

Every applicable surface must cover these operations and attacks. A non-applicable cell needs a versioned reason and W4 approval.

| Surface | Operations | Required attacks |
|---|---|---|
| PostgreSQL/RLS | select, insert, update, delete | direct foreign ID, changed `workspace_id`, missing workspace, bulk filters, upsert, foreign key reference |
| Server API/RPC | list, get, create, update, delete | forged path/body/query ID, workspace header/cookie override, pagination/search inference, stale membership |
| Storage | list, upload, download, replace, delete | guessed B path, forged metadata, signed URL reuse, cross-workspace move/copy |
| Imports/exports | validate, enqueue, process, download | B IDs in rows, mixed-tenant batch, retry after membership removal, exported-row leakage |
| Assistant tools | read, preview, confirm, execute | prompt-injected workspace, hallucinated B ID, forged confirmation, replay, concurrent idempotency key |
| Billing | read, mutate, webhook | foreign customer/subscription ID, forged metadata, replayed event, signature/timestamp failure |
| Calendar | list, create, update, callback | foreign attendee/entity link, OAuth callback state swap, token-owner mismatch |
| Webhooks/integrations | receive, retry, dispatch | invalid signature, old timestamp, duplicate event, B resource mapping, arbitrary callback URL |

## Assertions

For every denied attack:

- database/API returns no foreign row or sensitive existence signal;
- no row, object, job or external effect is created or changed;
- denial uses a stable safe error;
- audit records actor, resolved workspace, operation, correlation ID and outcome without payload/PII;
- repeated and concurrent attempts remain denied;
- service-role code, when unavoidable, repeats membership and resource ownership checks before the effect.

## Required executable suites after W1 publication

1. **Schema inventory test:** every tenant-owned table is registered with its workspace ownership path; RLS is enabled and forced where the owner role could otherwise bypass it.
2. **Policy matrix test:** authenticated A and B sessions execute CRUD directly through Supabase against every registered table.
3. **RPC/function test:** ordinary roles cannot invoke privileged functions; every `SECURITY DEFINER` function has empty `search_path`, qualified objects and explicit authorization.
4. **Storage test:** buckets, object paths and signed URLs enforce membership and ownership after membership removal.
5. **Server-route test:** workspace is resolved from authenticated membership, never accepted from model/client input as authority.
6. **Cross-surface test:** a valid foreign ID obtained by B remains unusable by A through API, import, assistant and integration paths.

## CI and environment safety

- Unit/static policy tests run on every PR.
- Supabase integration tests run against ephemeral/local infrastructure or isolated staging credentials.
- Destructive cases require `APP_ENV=test|staging` and the same production-deny guard used by Playwright.
- Test setup verifies the target project reference against an explicit non-production allowlist before seeding or deletion.
- Logs and artifacts contain synthetic identifiers only.

## Release acceptance

W4 will approve tenant isolation only when the schema inventory is complete, the full applicable matrix is executable and green, and a negative control proves the suite detects an intentionally weakened policy. A document or manual spot check alone is insufficient.
