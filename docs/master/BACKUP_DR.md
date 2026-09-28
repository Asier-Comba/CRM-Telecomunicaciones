# Backup and disaster recovery baseline

RPO/RTO: **not approved**. The previously proposed 24h/8h and 1h/4h tiers
below are planning candidates; a human owner must select the service targets
after a timed native PostgreSQL and Supabase recovery exercise.

## Current evidence (W5, 2026-09-28)

| Component | State | Evidence / next requirement |
|---|---|---|
| 22 migrations and synthetic A/B fixture | TESTED in disposable PGlite | Zero-to-head and scoped reader/Storage-policy/durable-schema fixture; this is embedded PostgreSQL only |
| Synthetic in-memory PGlite snapshot/restore | TESTED, TEST ONLY | SHA-256, fresh embedded process, schema, rows and scoped read/foreign denial; no persisted or encrypted dump |
| Native PostgreSQL logical backup/restore | PLANNED | `pg_dump`/restore in a new isolated database with checksums, manifest, migration head and post-restore RLS probes |
| Supabase Auth users and platform settings | PROVIDER-DEPENDENT | Inventory and separate Auth recovery test; database-only dump cannot assert provider recovery |
| Storage objects | PLANNED | Separate object inventory, content hashes, copy/restore and orphan/missing-object reconciliation |
| Backup encryption and offsite retention | PLANNED | Approved external KMS/secret, encryption before transfer, rotation and independent failure domain |
| Traffic switch and recovery objectives | HUMAN DECISION | No production traffic switch is part of the synthetic drill |

## Scope and retention

| Asset | Backup | Initial frequency | Retention | Access |
|---|---|---|---|---|
| PostgreSQL schema and data | Provider PITR where available plus encrypted logical backup | Proposed daily; PITR continuous when enabled | Proposed 30 daily, 12 monthly | Two named production operators |
| Supabase Storage | Versioned/copy backup including object metadata | Proposed daily | Proposed 30 daily, 12 monthly | Two named production operators |
| Code/config | GitHub branches, tags and reviewed IaC | Every change | Repository history plus release tags | Repository roles |
| n8n workflows | Encrypted export of workflows and non-secret configuration | Proposed after change and daily | Proposed 30 daily, 12 monthly | Integration operators |
| Secrets | Secret-manager recovery/rotation procedure, not plaintext exports | Provider capability | Per provider policy | Break-glass operators |

Backups must use a separate failure domain and encryption key policy from the primary service. Backup jobs emit metadata only: asset, timestamp, version, byte count/checksum and success/failure.

## Restore exercise

Quarterly and before commercial launch:

1. Authorize a disposable isolated restore environment.
2. Restore the database and storage snapshot without connecting production integrations.
3. Apply any forward migrations using the normal release artifact.
4. Restore n8n workflows with all outbound credentials disabled.
5. Verify row counts/checksums, authentication bootstrap and a sample of tenant-owned objects.
6. Run cross-tenant denial tests and critical smoke tests.
7. Record achieved RPO/RTO, missing assets, errors and remediation owner.
8. Destroy the disposable environment through the approved operator process.

A backup is not release evidence until this procedure has succeeded.

## Machine-verifiable evidence

Completed exercises are stored as JSON files under `ops/restore-evidence/` and validated with
`node scripts/ci/validate-restore-evidence.mjs`. Evidence must describe a non-production isolated
restore, synthetic or explicitly approved anonymized data, disabled outbound integrations, no
restored plaintext secrets, all four assets restored and checksum-verified, successful auth,
tenant-isolation, forward-migration and critical-smoke checks, separated operator/reviewer roles,
and RPO/RTO calculated from strict UTC timestamps. It must also prove that source backups were
encrypted, retained as intended, stored in a separate failure domain and covered by a current access
review. The restore target must be disposable, unable to target production, network-denied for
outbound integrations and constrained so destructive commands cannot escape the exercise scope.

The validator accepts only safe evidence identifiers, not raw logs, URLs, credentials or customer
content. An empty evidence directory is allowed during bootstrap but explicitly reports that the
release claim is unproven. Commercial-release approval requires at least one passing exercise whose
source snapshot and recovery targets match the intended production policy.
