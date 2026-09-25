# Security policy

Do not open public issues containing vulnerabilities, credentials, customer data or tenant identifiers.

Use GitHub private vulnerability reporting for this repository. If that feature is not enabled, contact a repository owner through the team's approved private channel. Never paste secrets into an issue, pull request, log or chat.

## Release-blocking security properties

- Workspace identity is derived from the authenticated server-side principal, never trusted from client input alone.
- Every tenant-owned database row and storage object is protected by deny-by-default authorization.
- Service-role credentials stay server-side and every privileged operation rechecks workspace membership and role.
- Cross-tenant read and write tests are required for every new tenant-owned data path.
- Model output is untrusted input. Tool authorization is deterministic and outside the model.
