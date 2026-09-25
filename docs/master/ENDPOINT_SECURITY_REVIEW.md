# Endpoint security review

Reviewed source: `w1/bootstrap-canonical@61848cf` on 2026-09-25. The endpoint implementations relevant to this review are unchanged from the first application bootstrap.

This is a static review of the reconstructed application. It is not production approval. Runtime assertions remain blocked until the canonical schema and isolated test environment exist.

## Release-blocking inventory

| Surface | Authentication observed | Tenant authority | Gate |
|---|---|---|---|
| `/api/automations/n8n/status` | none | none | P0: remove or protect before deployment |
| `/api/automations/n8n/test` | none | none | P0: anonymous network/workflow effect |
| `/api/assistant/confirm` | Supabase user session | `profiles.workspace_id` | P0: no server-issued one-time proof or atomic idempotency |
| `/api/agent/tool` | shared `AGENT_TOOL_SECRET` | caller `workspace_id` + explicit filters | P0: credential is global, not tenant-bound |
| `/api/agent/action` | shared `AGENT_TOOL_SECRET` | caller `workspace_id` + explicit filters | P0: service role plus global credential |
| `/api/agent/automation` | shared `AGENT_TOOL_SECRET` | caller `workspace_id` + explicit filters | P0: service role plus global credential |
| `/api/team/users/**` | Supabase user session | `profiles.role` and `profiles.workspace_id` | P0: ambiguous with `workspace_members.role` |
| `/api/debug/auth-session` | disabled in production; session lookup in development | profile workspace | acceptable only with both development gates |
| `/api/debug/google-calendar-connection` | disabled in production; session lookup in development | profile workspace | write probe must remain doubly gated and non-production |
| Meta WhatsApp webhook | Meta HMAC in production | connection mapping during processing | runtime cross-workspace mapping test required |
| Google Calendar webhook | secret token; production-only skeleton | not implemented | do not enable until channel-to-workspace mapping is verified |

## Global controls still missing

- No uniform request correlation ID and structured security-event contract is enforced across routes.
- Rate limiting is local/best-effort for the assistant only; privileged, diagnostic, webhook and n8n surfaces lack a shared durable policy.
- Service-role access is implemented in multiple route-local clients, increasing review and rotation surface.
- Route authorization is not expressed through one reusable actor/workspace/capability resolver.
- There is no executable API authorization matrix covering anonymous, member, admin, removed member, multi-workspace user and scoped service principal.

## Required route acceptance suite

1. Instrument outbound fetch and database adapters; prove denied requests perform zero downstream calls.
2. Exercise anonymous, wrong-role, removed-membership and foreign-workspace requests for every sensitive route.
3. Verify path, query, body, header and model-supplied workspace identifiers never override resolved authority.
4. Verify service credentials are scoped, revocable and denied outside their workspace/capabilities.
5. Verify test/debug endpoints return 404 or 403 in production and cannot perform writes.
6. Verify stable safe errors do not disclose internal URLs, configuration flags, provider bodies, tokens or row existence.
7. Verify rate limits and replay controls under concurrent requests.
8. Emit redacted audit events with correlation ID, actor/service principal, resolved workspace, operation and outcome.

The detailed W1 findings and acceptance criteria are in `HANDOFF_W1_SECURITY.md`. Assistant mutation criteria are in `HANDOFF_W3_SECURITY.md` and GitHub Issue `#10`.
