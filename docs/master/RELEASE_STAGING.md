# Release and environment strategy

## Environment boundary

| Property | Development | Staging | Production |
|---|---|---|---|
| Data | Synthetic/local | Synthetic or approved anonymized fixtures | Customer data |
| Supabase | Dedicated project | Dedicated project | Dedicated project |
| Storage | Dedicated bucket | Dedicated bucket | Dedicated bucket |
| n8n | Local/dev instance | Dedicated staging instance | Dedicated production instance |
| OAuth/webhooks | Dev callback URLs/secrets | Staging callback URLs/secrets | Production callback URLs/secrets |
| Assistant writes | Local evaluation | Test workspaces only | Explicitly released tools only |
| Destructive E2E | Allowed on disposable data | Allowed on labelled test workspaces | Forbidden |

Never share service-role keys, database passwords, signing secrets or persistent buckets between environments.

## Delivery path

1. Feature branch (`w1/*`, `w2/*`, `w3/*`, `w4/*`).
2. Pull request with risk classification and evidence.
3. Quick gates: secret scan, migration policy, dependency review, lint, types and unit tests.
4. Heavy gates when applicable: build, critical Playwright, clean-database migration test and cross-tenant adversarial suite.
5. Review by the owning workstream plus W4 for auth, RLS, secrets, deployment or assistant-control changes.
6. Merge to protected `main`.
7. Automatic immutable deployment to staging using the merge commit SHA.
8. Staging smoke: auth, workspace switch, one critical CRUD path, webhook signature failure, assistant read and safe mutation confirmation.
9. Manual production approval by an authorized operator. Production is outside autonomous agent authority.
10. Post-deploy smoke and observation window; rollback or forward-fix using the same immutable artifact.

## Main ruleset (owner action required)

- Require pull request; prohibit direct pushes and force pushes.
- Require at least one approval and dismissal of stale approvals.
- Require conversation resolution.
- Require the CI jobs in `.github/workflows/ci.yml`.
- Require branch to be current before merge.
- Restrict bypass to a small audited break-glass group.
- Keep deployments tied to commit SHA and environment approval logs.

## Minimum staging exit criteria

- Schema applies from an empty database and upgrades from the last production schema.
- Cross-tenant tests pass using distinct users and workspaces.
- No test, seed or evaluation command resolves a production hostname/project ID.
- Logs expose correlation ID and deployment version without sensitive payloads.
- Alerts and rollback/forward-fix owner are identified.
