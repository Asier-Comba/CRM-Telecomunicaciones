# Company account day

1. Establish the company GitHub organization, two named owners, individual
   identities and MFA/passkeys. Transfer/copy only the reviewed CRM repository.
   Protect eventual release branches and `staging`/`production` environments with
   required independent checks and human production reviewers. Do not change the
   current W2/W3 PR stack's protection during this development run.
2. Choose company Supabase organization and distinct staging/production projects.
   Path A: transfer an existing project only if Supabase permits and the team
   explicitly chooses it. Path B: empty company project -> repository forward
   migrations -> deterministic Auth config -> private buckets -> verification.
   Path B never depends on a transfer or historical dashboard edits.
3. Select domain and DNS authority. Record exact app origin and redirect paths in
   company JSON matching `infra/platform/company.schema.json`. Avoid wildcard
   callbacks. Configure only provider-issued MX/SPF/DKIM/DMARC/verification/
   return-path records. The DNS checker compares exact supplied expectations;
   it does not invent DKIM keys or SPF targets. Configure TLS and test renewal.
4. Establish separate human business mail, Auth transactional mail and CRM delivery
   accounts. Create individual addresses and approved support/security/billing
   aliases. Auth SMTP settings and versioned templates have a Management API
   adapter. CRM outbound remains unregistered until its authorization/idempotency/
   retry/bounce/audit adapter is accepted. Staging sends need a sink/allowlist.
5. Enter secret values directly in environment-specific secret stores. The manifest
   gives VARIABLE_NAME, PROVIDER, DESTINATION, PURPOSE, REQUIRED_ENVIRONMENTS and
   ROTATION_NOTES through the corresponding entry fields. Keep deployment, backup,
   monitoring, DB, SMTP, n8n and AI credentials separate and scoped. No personal
   account/project dependency may remain in deployable configuration.
6. Approve backup retention/RPO/RTO and independent failure domain; record key and
   offsite references. Prove restore, key recovery and access review before launch.
7. Provision/select the Linux VPS. Use SSH keys/MFA, named deployment identity,
   firewall, security updates, clock synchronization, Docker and verified image
   digest. App has bounded read-only filesystem/tmp/cache. Business durability
   never relies on app local disk. Install TLS proxy and monitoring. Use the
   smallest architecture; no Kubernetes is required here.
8. If n8n is used, choose a verified version/digest, persistent encrypted config
   volume and PostgreSQL, per-environment secrets, TLS and backups. Import only
   registered inactive workflows after export validation. Add provider IDs to
   the registry only after an actual import. No arbitrary browser webhook URL,
   export credentials, execution payload or production effect.
9. AI project creation/billing/secret entry belongs to company administrators.
   W3 owns provider runtime/model semantics. W5 supplies private secret/deployment/
   health/metrics boundaries. No model prompt/customer body belongs in logs.
10. Run repository verification, company configuration and staging preflight.
    Hosted bootstrap defaults to a safe plan. Future `--execute` requires the
    protected staging CI environment, matching staging allowlisted project ref,
    scoped management/DB/server secrets and complete valid configuration. It has
    no production mutation path. Apply forward migrations without synthetic
    automatic seeds; configure/read back Auth and verify private buckets. Never
    run local `supabase/config.toml` against hosted Auth blindly.
11. Wait for W2 hosted runtime, independent W4 acceptance, safe synthetic staging
    smoke, mail verification/reset delivery and SPF/DKIM/DMARC alignment, Auth
    refresh/logout/MFA/revocation, signed Storage/download denial and recovery
    tests. Missing credentials are configuration gates, not permission to bypass
    tests. No real customer migration is authorized by this checklist.
12. Approve the exact release SHA/image/config/migration candidate through the
    protected production environment after staging and backup/recovery evidence.
    Apply production migrations through serialized forward-only tooling. Deploy,
    run safe read-only smoke, monitor health/error/provider/audit/backup status.
    Abort on failed smoke, schema/ACL drift, wrong artifact, missing secrets,
    unexplained error spikes, unavailable backup/recovery or invalid signoff.

Handover each asset (GitHub, Supabase, domain, DNS, business/Auth/CRM email, VPS,
n8n, AI, monitoring and backup) to two named company owners. Record billing owner,
recovery contacts, access review, credential rotation and provider recovery
instructions. Human ownership/MFA governance is never automatically marked done.
