# Infrastructure decision — provisional, not deployed

Owner W4. Status: candidate design; inventory, workload and commercial requirements unverified. No provider selection, purchase, DNS or production change is authorized by this document.

## Decision criteria

Evaluate security/isolation (30%), operator burden (25%), verified recovery (25%), total cost (15%), portability (5%). Score each 1–5 only after inventory, load and restore evidence. Missing evidence means unknown, not a favorable score. Cost includes operator time, independent backup storage and recovery capacity; no price estimates are claimed.

| Stage | Candidate deployment | Benefit | Tradeoff / exit gate |
|---|---|---|---|
| Synthetic pilot | Isolated application instance, separately scoped DB/storage, isolated n8n, external encrypted backups | Small operational surface; deterministic CI and smoke tests | No HA claim; do not place every primary and backup on one host/account; prove restore before commercial launch |
| Commercial growth | Stateless application replicas; managed or equivalently operated DB recovery; dedicated integration workers; shared durable queue | App restart does not lose jobs; maintenance and app failure isolated from database | Higher cost and coordination; require measured queue/DB capacity, load test and failover/restore evidence |
| Enterprise | Defined availability zones/failure domains, least-privilege operations, audited break-glass, dedicated tenant deployment where contract requires it | Supports measured availability/compliance commitments | Highest cost/operator burden; multi-region only with explicit residency, conflict, RPO/RTO and failover requirements |

These are architecture candidates, not claims about Hostinger/Supabase/n8n feature availability. Verify provider capabilities and terms before selection. Portable SQL migrations, container artifacts and workflow exports reduce exit cost; managed auth/storage semantics and operational runbooks still create migration work.

## Environment boundaries

DEV: synthetic local data and local callback stubs. STAGING: separate database/project, storage, OAuth applications, service identities, signing keys and n8n instance/workflows; no production credentials or endpoints. PROD: protected release environment, immutable artifact, human-approved promotion and rollback owner. A branch name or APP_ENV flag alone is not isolation.

One artifact digest moves staging → production. Environment-specific configuration is injected by scoped secret storage, not baked into builds. Server auth derives workspace from authenticated membership; any service identity requires explicit capability and workspace binding. n8n editor is an administrative surface separate from authenticated webhook ingestion. Never expose test/status/debug execution endpoints by default.

## Recovery objectives (not SLA)

Current provisional targets remain BACKUP_DR.md: initial RPO24h/RTO8h; paying-customer DB RPO1h and demonstrated RTO4h. Business owner must accept residual loss and downtime; no customer promise until timed exercises meet targets. Storage/n8n recovery must have explicit consistency points, not assume DB PITR restores external files or workflows.

Backups: encrypted independent failure domain, separately scoped operator access, documented recovery-key custody. Code/config versioned; plaintext secrets excluded. Verify backup freshness, retention, checksum, decryptability and timed restore. Include workflow version, storage manifest and release SHA in recovery bundle metadata. Validate orphan/missing files and delayed integration effects after restore; never automatically replay uncertain effects.

## Acceptance sequence

1. Read-only Hostinger/n8n inventory using HOSTINGER_N8N_READ_ONLY_INVENTORY.md; record missing facts, never credential values.
2. Approve concrete nonproduction resources and cost; provision only under that authority.
3. Deploy accepted candidate SHA; run auth/A-B/removed/suspended/role/API/storage/import/assistant tests using synthetic fixtures. Record runtime coverage gaps explicitly.
4. Disable outbound integrations; recover PostgreSQL, Storage, workflow/config and code into disposable isolated target. Measure achieved RPO/RTO and integrity, then run tenant and critical smoke tests.
5. Capture evidence through staging/restore schemas. Independent review checks that assertions link to actual job/artifact evidence; schema validity alone is not proof.
6. Only then request production change approval with artifact digest, migration plan, backup checkpoint, rollback decision limits and operator/reviewer roles.

## Operational exit checks

Alert on unhealthy deploy, DB/queue saturation, overdue backup, restore failure, integration retry exhaustion and reconciliation backlog. Log event code, correlation ID, release SHA, duration/outcome; never request bodies, prompts, outputs, headers, secrets or unnecessary PII. Establish on-call ownership before offering an SLA.

For additive migrations, roll back application artifact only if compatibility is proven. For destructive/incompatible schema changes, stop promotion and require explicit reviewed recovery strategy; do not automate down migrations. Retain last known-good artifact and config identifiers, not plaintext secrets.

Current result: design prepared only. No infrastructure audit, staging deployment, production mutation, failover or restore exercise performed.
