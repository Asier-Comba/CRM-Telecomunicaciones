# Company cutover and isolated STAGING — unprovisioned candidate

Executable contracts: `platform/company-project-bootstrap.json`,
`platform/environment-contract.json`, `platform/secret-inventory.json` and proposed
`platform/auth-policy.json`. No hosted project or production change is authorized.

1. Human approves legal/operational owner, domain, region, providers and billing.
   Create company organizations; assign two named admins with MFA/passkeys,
   independent recovery and audited emergency access. Choose human mail separately.
2. Path A, optional: verify official transfer eligibility/permissions, target billing
   and organization restrictions, then obtain approval. After transfer re-inventory
   refs/keys/settings/owners/billing/network/Auth/SMTP/Storage and rerun acceptance.
   Transfer is not config recreation or proof of company adoption.
3. Path B, mandatory independence path: provision a NEW EMPTY company STAGING
   project. Keep distinct DEV/STAGING/PROD projects, Storage, SMTP test identity,
   OAuth, n8n, AI keys, backup destination/key and secret namespaces. Bind secret
   references through approved stores; never write values to manifests or commands.
4. Record approved Auth signup/confirmation/password/session/OTP/MFA/abuse policy,
   exact URLs, custom SMTP test sender and provider-specific DNS/TLS verification.
   Confirm private buckets. Apply reviewed migrations to the explicitly approved
   empty STAGING project through a separate controlled operator task; no remote
   apply/reset command is included in this runbook.
5. Review DB SSL/network restrictions, organization MFA, scoped server principal,
   logging, rotation/revoke and external-state inventory. Migration SQL does not
   recreate Auth users, objects, keys, OAuth, functions or provider settings.
6. Create a value-free config/binding manifest (outside Git if identities sensitive).
   Inject required values from the approved secret store into the validator process:
   `TARGET_ENV=STAGING npm run platform:validate-env -- /approved/config.json`.
   Structural PASS is not provider adoption. Inspect name-only policy diff with
   `npm run platform:policy-diff`; confirm actual vault bindings independently.
7. Obtain explicit synthetic STAGING test approval. Run the guarded read-only
   staging probe. It performs no setup/writes and does not replace the separate
   explicitly authorized hosted Auth/RLS/Storage synthetic acceptance exercise.
8. Rehearse database recovery into a new unexposed environment and Storage byte
   recovery separately. Verify hashes, metadata, missing/orphans, restored RLS/RPC
   ACLs and revoked-user denial. Select human-approved RPO/RTO/retention tier.
9. Review exact-release hosted smoke and evidence; W4 must grant CAN_STAGE.
   Company/data owner must separately approve real-data migration. CAN_PRODUCE
   requires further production approval, Dependency Review and commercial DR.

Recovery owners: backup operator, independent restore approver, security reviewer
and business owner. Encryption key custody must be separate from backup destination;
no sole-person recovery path. Candidate tiers (unapproved): low-criticality daily
backup/next-business-day recovery; pilot hourly backup/same-day recovery; commercial
PITR/object versioning with measured tighter RPO/RTO. Humans set numbers and cost.
Quarantine/rejected-object retention and backup/exclusion require human policy.
Retention for Auth/business/documents/quarantine/audit/backups/logs and export,
deletion/anonymization/offboarding hooks remain product/privacy decisions.

Secret stores must support named access, groups, MFA/passkeys, audit, offboarding,
recovery, machine injection and emergency access. Human passwords/recovery codes
may use a different store from runtime secrets. No vendor chosen.

On failure: keep staging unexposed; preserve bounded evidence, reconcile missing
resources, then re-review. No automatic production switch or destructive rollback.
Provider eligibility reference: https://supabase.com/docs/guides/platform/project-transfer
