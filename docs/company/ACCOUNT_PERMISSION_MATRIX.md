# Company account permissions and GitHub setup proposal

| Asset | Account owner | Human administration | Runtime permission | Recovery/offboarding |
| --- | --- | --- | --- | --- |
| GitHub organization/repository | Company asset owner | Two named MFA administrators | CI contents:read; deploy scoped protected identity only after acceptance | Company security owner; revoke each user; preserve audited ownership |
| Supabase staging/production | Company asset/billing owners | Named provider admins; separate environments | Browser publishable/anon only; authenticated RPC membership authority; privileged keys server-only | Capture Auth/settings/Storage scope; rotate scoped service credentials |
| DNS/TLS/hosting | Company asset owner | Named domain/hosting admins | Exact origin/project/digest; no shared admin deploy key | Company recovery contacts; verify domain/cert/key access |
| Human mail | Company billing/identity owner | Individual mail accounts and MFA | No application access to human inbox by default | Disable user sessions/account and preserve approved retention |
| Auth SMTP/CRM provider | Company mail owner | Named provider admin | Environment-scoped sender credentials; staging allowlist/sink; approved consent/templates | Revoke/rotate keys, reconcile unknown receipts before retry |
| Offsite backups | Separate company backup account | Recovery owner distinct from app runtime | Exact bucket/region, write+read, no delete; protected retained versions | Independently controlled key versions and read-recovery access |
| n8n | Company automation owner | Named MFA/SSO where supported | Closed registered workflows, secret refs, inactive until accepted | Original encryption key, PG/user-data/config backup; revoke API/webhook credentials |
| AI worker | Company AI/security owner | Named provider admins | W3 accepted registered tools/outbox only; private key; disabled until proof | Kill switch, lease/revoke/reconcile, rotate API key, preserve pending effect audit |
| Monitoring | Company security owner | Named incident responders | Aggregate metadata, random correlation, deployment SHA only | Approved notification destinations; revoke departed responders |

Proposed branch checks: baseline guardrails, secret scan, migration policy, quality including full dependency audit, PGlite, native PostgreSQL fresh+restore, actual Supabase/Auth/Storage/tenant/revoke, real browser, W5 contracts/canaries, actual image+scan, Auth mailbox and proxy/Compose. A skipped or cancelled required job is not PASS. Protect exact release SHA and artifact provenance, forbid force push/deletion on release branches, require independent review and protected-environment approval. The actual organization/provider settings must be inspected and applied by authorized company owners; this document does not claim they exist.

CODEOWNERS proposal: platform/infra/workflows to the company's platform+security teams; application consumers to its product team; assistant/worker contracts to its AI+security teams. Replace team references only after real teams and permission scopes are verified. No nonexistent team is placed in active CODEOWNERS and no organization/transfer/settings mutation is performed here.
