# Enterprise identity and secrets

Required operational standard; no accounts/providers/permissions changed here.

Use individual named human accounts; no shared login. Every critical provider
(GitHub, Supabase, VPS/DNS, email, AI, n8n and backup) requires at least two approved
admins, passkeys/MFA where supported, company billing/recovery ownership and
least-privilege daily access. Store offline recovery codes with controlled access;
maintain an audited break-glass path and test recovery without changing production.

Joiner: named identity, role approval, MFA, scoped environment access and inventory.
Mover: reapprove role, revoke old scope, rotate shared machine credentials if used.
Leaver: revoke sessions/accounts/tokens immediately, verify provider and business
membership removal, transfer ownership and rotate affected credentials. A valid
JWT must not retain access after membership/workspace revocation.

| Names/classes only | Class | Owner / boundary |
|---|---|---|
| Supabase URL, anon/publishable key | PUBLIC | Platform owner; environment-specific; not authority |
| Service-role secret, DB credentials | SERVER SECRET | Platform; server only; never browser/model/logs |
| Cursor signing/encryption key | SERVER SECRET | Backend; scope/epoch/rotation invalidates capabilities |
| AI provider, n8n integration credential | SERVER SECRET | W3 functional owner + W4 host/secrets; minimal scope |
| SMTP/API, OAuth client secret | SERVER SECRET | Auth/mail owner; separate environment and redirect policy |
| JWT signing/provider secrets | PLATFORM SECRET | Approved platform control plane; migration/revoke plan |
| Backup encryption key | PLATFORM SECRET | Recovery owner; separate encrypted backup access/key custody |
| Human passkeys, recovery codes, break-glass | HUMAN RECOVERY | Named security/account owners; offline controlled access |

DEV/STAGING/PROD must have distinct secrets, projects, providers and permissions.
Each inventory entry requires owner, purpose, environment, consumers, scope,
creation/expiry/rotation dates, revoke procedure and recovery custodian (no value).
Inject runtime secrets through approved platform/secret-manager bindings; prevent
client prefixes, debug payloads, shell tracing, crash dumps and artifact leakage.
Rotation: issue new scoped credential, test nonproduction consumers, switch,
revoke old credential, prove old requests fail and record evidence. Suspected
exposure: revoke first under incident ownership; do not rely on historical rotation
claims or remove scanning. Git history and dependency review remain release gates.

Email architecture separates (A) human company identities, (B) Auth/transactional
app mail and (C) CRM customer communications with separate consent/purpose/scope.
Before production: approved verified domain, custom SMTP/API, SPF/DKIM/DMARC,
TLS, bounce/complaint handling and monitored support/security identities. No final
domain/provider selected; local developer email does not satisfy production mail.

Pre-real-data gate (all remain unapproved unless explicit evidence is linked):
- [ ] Company-owned/approved isolated environment and current Auth/RLS/API evidence.
- [ ] Private Storage API/object access and revocation evidence; no ZIP ingestion.
- [ ] Secret ownership, two admins/MFA, incident contacts and recovery custody.
- [ ] Backup policy/RPO/RTO, restored privilege matrix and separate object recovery.
- [ ] Retention/deletion policy, logging redaction and required DPA/privacy decisions.
- [ ] W4 staging acceptance, exact-release smoke and production-change approval.

No legal conclusion or unsupported application/provider encryption claim. Private
Storage is an access policy, not proof of application-level encryption. Production
MFA/email/provider encryption, commercial DR and company operational adoption
remain untested; CAN_STAGE=NO and CAN_PRODUCE=NO.
