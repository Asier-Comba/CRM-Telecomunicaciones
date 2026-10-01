# Email delivery — candidate enterprise contract

No provider, company, sender or domain is selected. Only local captured mail is
permitted by this candidate. Supabase does not provide human company mailboxes.

| Plane | Identity / authorization | Ownership and failure behavior |
|---|---|---|
| A: human mail | Named individual accounts; monitored support/security/billing aliases are groups, never shared logins | Company identity owner; MFA, two admins and independent recovery. Never application SMTP credentials |
| B: Auth transactional | Supabase verification/recovery/invite; minimal reviewed templates in `platform/auth-templates` | Identity operator; custom SMTP required for PROD; separate environment credentials and reputation |
| C: future CRM communications | User/provider connection or approved central sender; actor/workspace, consent/purpose, audit and limits | Communications owner; separate sender/provider authority, complaints and tenant authorization. Sending not implemented |

A future owner may separate Auth and commercial sender subdomains (for example
`auth.<company-domain>` / `mail.<company-domain>`); these are examples, not names.
Approved provider must supply verified sender, SPF/DKIM/DMARC and TLS requirements.
Do not invent DNS records. SMTP names/classes are in the environment contract;
values belong in an approved environment secret namespace. Never reuse PROD in QA.

Distinguish requested, queued/provider-accepted, delivered/bounced (where observable)
and user-completed Auth events. SMTP acceptance does not prove confirmation/reset.
Failures return bounded public codes such as `mail_unavailable`, `request_limited`
and `identity_request_accepted`; enumeration-safe responses need separate product
review. Provider quotas belong to configuration, not business logic. Do not invent
an app sender/transport; Supabase Auth already implements SMTP. Future app routes
must enforce their own abuse/IP/actor rate limits and avoid raw provider errors.

Observe counts of requested, accepted/rejected, bounce/complaint, template version
and correlation ID. Never log tokens, action URLs, bodies, passwords or SMTP secrets.
Auth operator owns alerts/retries; only a reviewed provider switch is permitted.
No automatic failover to human or CRM accounts; preserve separation during outage.
CRM sending requires its own actor/workspace/recipient reference/purpose audit.

Mail scanners can consume single-use Auth links before the human opens them.
Do not disable single-use or replay protection. A future application-owned landing
flow must validate an approved destination and require security review; absent here.

Local evidence uses the pinned CLI's Mailpit capture (despite legacy `inbucket`
config naming), actual Auth API and test-only confirmation settings. Exact redirects,
minimal templates and synthetic recipients are checked. This is not production SMTP,
DNS, delivery/reputation, hosted MFA or a final signup/session policy. Proposed
policy lives separately in `platform/auth-policy.json`; human approval remains unset.
Version templates as a release; copy no generated tokens into Git or artifacts.

External recovery inventory must retain provider identity, template source/version,
sender/domain verification checklist and secret reference names. Secret values,
human mailboxes and provider signing state are separate, controlled recovery paths.

References checked 2026-10-01:
- https://supabase.com/docs/guides/local-development/cli/testing-and-linting
- https://supabase.com/docs/guides/auth/auth-email-templates
- https://supabase.com/docs/guides/auth/redirect-urls
- https://mailpit.axllent.org/docs/api-v1/
