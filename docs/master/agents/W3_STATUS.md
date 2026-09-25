# W3 status — AI, assistant and integrations

Updated: 2026-09-25
Branch: `w3/assistant-runtime-foundation`
Pull request: `#9` targeting `w4/security-baseline`

## Current state

- Canonical development repository verified as `Asier-Comba/CRM-Telecomunicaciones`.
- Historical repository `iazticontact/crm-inmobiliario-demo` is read-only from this point forward.
- Historical `/api/assistant/v2`, semantic planner, ontology, readers, action control plane, memory and evals were inspected.
- W4 security baseline and `HANDOFF_W3_SECURITY.md` were read and treated as release gates.
- No `W1_STATUS.md` or `W2_STATUS.md` exists in the development repository yet.

## Implemented

- Framework-independent typed capability contracts.
- Deterministic structured-plan validation with registered capabilities, bounded acyclic goals and one final write maximum.
- Closed-schema validation and rejection of model/client tenant selectors.
- Server-only actor/workspace execution context.
- Deterministic permission, confirmation and idempotency gates.
- Confirmation binding to actor, workspace, capability, canonical arguments and expiry.
- Redacted audit envelope compatible with W4 observability requirements.
- Structured UI response contract for W2.
- Versioned 18-category assistant eval catalog.
- Unit/adversarial tests for tenant injection, permission denial, confirmation binding and write replay.
- Remote branch tree verified identical to local commit `e2d7505` before this status-only follow-up.

## Historical decisions

Retain as concepts:

- semantic planner with structured plan;
- capability ontology/registry;
- scoped readers;
- action preview/confirmation/idempotency;
- conversation state containing references, not business truth;
- read-after-write verification;
- eval-driven changes.

Do not migrate as architecture:

- regex as the general intent engine;
- duplicated planner and legacy detector paths;
- n8n as the semantic brain;
- arbitrary SQL or HTTP tools;
- workspace identity supplied by the model;
- UI behavior inferred from Markdown.

## Handoffs needed

### W1

Publish canonical entity names, identifiers, workspace ownership fields, role/capability rules and read/write service contracts. Until then, telecom eval cases remain marked `blocked_on_w1_contract` and no schema is invented by W3.

### W2

Consume `AssistantResponse` from `src/assistant/ui-contract.ts`. Entity IDs are navigation references only; every destination must reauthorize server-side.

### W4

Review the runtime invariants and adversarial tests. Confirmation issuance/persistence and Supabase integration remain release-gated until real auth/data adapters exist.

## Known blockers

- The repository currently has no `main` branch and defaults to `w4/security-baseline`.
- No W1/W2 status files or application/data contracts are present.
- No test Supabase environment or credentials are configured; no live RLS claim is made.
- GitHub Dependency Review is blocked by repository configuration: Dependency Graph is not enabled. W4/repository owner must enable it; W3 will not change repository security settings.

## Validation evidence

- `npm run lint`: pass.
- `npm run typecheck`: pass.
- `npm run test`: 9/9 pass.
- `npm run build`: pass.
- `bash scripts/ci/test-guardrails.sh`: pass.
- `npm audit --audit-level=high`: 0 vulnerabilities.
- PR merge ref against W4 commit `f72e432`: baseline guardrails pass locally.
- GitHub CI: quality, migration policy and secret scan pass. Dependency Review remains externally blocked as noted above.
