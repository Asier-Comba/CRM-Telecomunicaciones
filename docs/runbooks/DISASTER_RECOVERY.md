# Disaster recovery: prove recovery before changing traffic

This runbook covers a disposable synthetic rehearsal and the gates for a future
company recovery. It never authorizes a hosted reset, a production data migration,
or copying provider-owned Auth internals between hosted projects.

## 1. Identify the incident and candidate

Record environment, UTC detection time, image digest, release SHA, migration head,
backup time, affected components and accountable operator. Keep tenant content,
credentials, raw provider errors and object bytes out of the incident record.
Stop promotion and affected writes through the accepted product controls. Preserve
business/security audit evidence under the company's retention policy.

Run these read-only repository checks from the reviewed checkout with Node24:

```text
npm ci
npm run platform:verify
npm run platform:test
npm run platform:release
npm run platform:company:report -- company.json
npm run platform:preflight:staging
```

A BLOCKED company report/preflight is a stop condition, not a partially approved
release. The current hosted W2 runtime is deliberately blocked. Do not enable a
local/synthetic product flag on a hosted target to work around that result.

## 2. Run the synthetic A-to-empty-B rehearsal

Prerequisites: Linux Docker engine, Supabase CLI2.119.0, isolated runner, no linked
project or hosted credentials, and no existing `crm-telecom-local` containers.
This test destroys only its disposable A, constructs B and tears B down.

PowerShell (development host with a working Linux Docker engine):

```powershell
$env:PLATFORM_TARGET = 'LOCAL'
npm run platform:acceptance
```

Linux isolated runner:

```sh
PLATFORM_TARGET=LOCAL npm run platform:acceptance
```

The CI equivalent is `reconstruction-recovery` in
`.github/workflows/enterprise-platform.yml`. It uses real Auth, PostgREST and
Storage, not the embedded SQL fixture. Save only the safe JSON evidence, exact
source/merge SHA and run link. Never publish the archive, temporary key, SQL rows,
object contents or provider response bodies as CI artifacts.

Required PASS evidence: both canonical fresh schemas, public RPC manifest, roles/
grants/forced RLS/policies/default privileges, public/Auth row digests, authenticated
AES256-GCM archive, all private bucket objects and byte/metadata hashes, fresh user
login, tenant A/B isolation, retained revocation and user-level Storage denial.
An HTTP service readiness retry may reconnect after B is rebuilt; authorization
errors stop immediately. A backup captured before a later failure proves capture
only. Any failed stage means DISASTER_REHEARSAL=FAIL.

## 3. Recover a future company environment

Use a separately approved, unexposed recovery project. Obtain company approval for
the specific backup, key reference, RPO/RTO and provider Auth recovery method.
Verify the authenticated archive and exact migration inventory before importing.
Build canonical schema; import approved business data while preserving grants and
RLS; restore private objects and verify their references and every hash. Resolve
provider-managed Auth/session/MFA/OAuth state through the provider-supported process.
Local `supabase_admin` imports are not a hosted recovery procedure.

Offsite retrieval, KMS/key recovery and hosted provider commands remain bound to
the chosen company accounts. No generic production restore command is supplied:
the currently implemented executor accepts only the exact disposable loopback
target. Rehearse those chosen adapters in company staging before launch.

Reauthenticate synthetic principals, prove revoked-user and cross-tenant denial,
run the accepted W2 browser journey, inspect signed downloads and Auth recovery/
delivery/MFA, and verify monitoring/audit/backup freshness. Measure actual lost
time and elapsed recovery in UTC. Do not infer RPO/RTO from a schedule.

## 4. Traffic switch and rollback gates

Independent W4 and responsible company operators approve the exact recovered
candidate and staging results before any production switch. Abort for missing or
stale backup, failed archive/hash/security comparisons, unexpected public bucket,
wrong project/image/migration identity, failed smoke, missing keys, unapproved
Auth state or unexplained error spikes. Keep the original evidence available.

Rollback selects a previously accepted image compatible with the current forward
schema. Do not reverse SQL migrations or clone staging synthetic data into prod.
Use a reviewed forward compatibility repair when the previous app is incompatible.
Follow [credential, database and provider incident procedures](PLATFORM_RECOVERY.md)
and [company account handover](../company/ONBOARDING.md).
