## Scope

- Change summary:
- Risk level: P0 / P1 / P2 / P3
- Affected workspaces/data paths:

## Release gates

- [ ] Reproducible install and CI pass
- [ ] Lint, `tsc --noEmit`, tests and build pass
- [ ] No secret or sensitive fixture is committed
- [ ] Auth and authorization are enforced server-side
- [ ] Cross-tenant read/write tests cover changed data paths
- [ ] New migrations are additive, named correctly and tested on a clean database
- [ ] Logs avoid tokens, credentials, message bodies and unnecessary PII
- [ ] Destructive or assistant-driven writes have confirmation and idempotency
- [ ] Staging smoke test is documented; no destructive test targets production
- [ ] Rollback/forward-fix and observability impact are documented

## Evidence

- Tests:
- Migration validation:
- Staging smoke:
- Security/adversarial checks:
