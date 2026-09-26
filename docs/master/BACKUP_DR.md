# Backup and disaster recovery baseline

RPO target: 24 hours initially; 1 hour for database changes once paying customers are onboarded.
RTO target: 8 hours initially; 4 hours after the first successful timed restore exercise.

These are targets until a restore test produces evidence.

## Scope and retention

| Asset | Backup | Initial frequency | Retention | Access |
|---|---|---|---|---|
| PostgreSQL schema and data | Provider PITR where available plus encrypted logical backup | Daily; PITR continuous when enabled | 30 daily, 12 monthly | Two named production operators |
| Supabase Storage | Versioned/copy backup including object metadata | Daily | 30 daily, 12 monthly | Two named production operators |
| Code/config | GitHub branches, tags and reviewed IaC | Every change | Repository history plus release tags | Repository roles |
| n8n workflows | Encrypted export of workflows and non-secret configuration | After change and daily | 30 daily, 12 monthly | Integration operators |
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
