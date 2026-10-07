# Platform failure and recovery

## Partial bootstrap or migration failure

Stop promotion. Read the bounded stage/code summary and exact migration inventory.
Discard/recreate the disposable runner, not an unknown linked project. Hosted
staging must retain backups and migration history; investigate the failed forward
migration and repair with a reviewed forward migration. Never rerun destructive
reset on hosted targets. Serialize deployment per environment. Local acceptance
requires an empty isolated project and removes only its own test stack.

## Database incident

Detect through health/errors; bound scope to the affected environment and release
SHA. Suspend writes through accepted server controls and preserve audit evidence.
Confirm provider health and backup freshness before deciding between forward fix
and isolated restore. Restore into a new unexposed project, rebuild canonical
schema, preserve grants/forced RLS, recover Storage bytes and policy bindings,
and verify Auth assumptions, A/B isolation and revoked users. Do not switch traffic
until W4 and responsible operators sign off. Record UTC timestamps for observed
RPO/RTO; never infer them from a backup schedule.

Application rollback selects the previous compatible image digest/config shape.
The database remains at its forward schema. Do not reverse migrations or restore
staging synthetic data into production. If the previous application cannot operate
against the new schema, use a reviewed forward compatibility fix or stop launch.

## Lost or corrupted Storage objects

Reconcile private object inventory, metadata references and bytes. Validate archive
authentication before any restore mutation. Reject missing objects, changed hashes,
unexpected public buckets or changed metadata. Recover into isolated buckets and
prove authorized download, foreign-tenant and revoked-member denial. Do not expose
an archive or use a service-role download as user authorization evidence.

## Credential incident and rotation

REVOKE -> ROTATE -> VERIFY -> AUDIT -> RESTORE if required. Preserve redacted
incident evidence and use named break-glass identities. Rotate in the provider,
bind the new secret in its environment store, deploy the affected private consumer,
verify with synthetic operations, revoke the old binding and examine audit history.
Use overlapping old/new credentials only where the provider supports it. Otherwise
schedule a bounded interruption. Never log both values or reuse staging credentials.

| Binding | Rotation/recovery consideration |
| --- | --- |
| Supabase server key | Determine JWT/signing vs scoped server key impact; inspect grants and revoke leaked sessions where required |
| Document witness key | Register a new private verifier/key ID, bound validity overlap; retire old after accepted witness lifetime |
| Auth SMTP / CRM API | Separate rotations; verify reset/invite delivery and sandbox sink before arbitrary outbound use |
| AI key | Scoped company project; verify synthetic quota/errors, preserve no prompts in logs |
| n8n keys | Rotate API/webhook identities separately; registered workflows remain inactive until verified |
| Deployment identity | Revoke leaked SSH/OIDC identity, review host/GitHub actions and deploy exact accepted digest |
| Backup key | Keep decrypt capability for retained archives through approved KMS policy; test recovery before retiring old key |
| Monitoring key | Scoped write-only metrics where possible; verify no tenant/PII labels |

## Provider outage

AI unavailable: assistant disabled/degraded; core CRM stays independent. Auth SMTP
unavailable: surface transactional delivery failure; never claim a successful email.
CRM mail/n8n/WhatsApp/Google unavailable: do not activate fallback sends or arbitrary
webhooks. Preserve registered idempotency/audit/retry state in the accepted product
adapter. W3 worker backlog is observable only after its durable worker is accepted.
Existing provider statuses are missing/configured/degraded/unavailable; configuration
presence alone does not prove connectivity or successful external delivery.

## Launch and incident record

Pre-launch: named ownership/MFA, DNS/TLS, secret shape/rotation, provider safety,
accepted release SHA/image, W4, staging, backup/restore and support contacts.
Launch: serialized migration, deployment, safe read-only smoke and monitoring.
Post-launch: backup freshness, errors, provider status, security/business audit and
key access. Abort for any failed gate or unexplained authorization/data discrepancy.

Record: detection UTC, environment, exact SHA/image, impact scope (no customer
content), mitigation owner, internal communication owner, recovery evidence,
verification, decisions and postmortem. Notifications require authorized company
channels; this run sends no messages to external parties.

Data export/offboarding/deletion require a product-approved dependency inventory
covering fiscal records, audit, documents, retention and legal/company decisions.
Disable access, review immutable obligations, authorize export and scheduled disposal
separately. No blanket tenant cascade deletion is implemented by platform tooling.
