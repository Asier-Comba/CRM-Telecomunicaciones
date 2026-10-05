# Hostinger/VPS and n8n read-only inventory

Status: prepared; not executed. Human login/2FA is required before access. This
procedure authorizes observation only. It does not authorize package upgrades,
restarts, firewall edits, DNS/TLS changes, workflow activation, credential tests,
backup restores or production writes.

## Evidence rules

- Record timestamp, observer role, host/service label and safe version/status facts.
- Record environment-variable **names and presence only**; never values.
- Do not copy request bodies, prompts, workflow input/output, customer records,
  cookies, headers, tokens, certificates/private keys or full process environments.
- Prefer configuration paths, counts, hashes and redacted screenshots over raw files.
- Stop on any UI/action that can save, rotate, restart, deploy, execute or acknowledge.

## VPS inventory

| Area | Read-only evidence | Release question |
|---|---|---|
| Host | provider label, region, OS/kernel, uptime, clock/timezone | Is the host supported and time synchronized? |
| Resources | vCPU/RAM/disk totals, safe utilization, filesystem names | Is there capacity and alerting headroom? |
| Processes | service names, users, versions, states, restart policy | Are app/n8n/proxy isolated and non-root? |
| Containers/Node | engine/runtime versions, image digests, read-only manifests | Are artifacts pinned and reproducible? |
| Network | listening ports/processes, firewall rule summaries, provider firewall | Is only the intended public surface exposed? |
| Reverse proxy | nginx/proxy version, enabled site names, upstream labels | Are internal services bound privately? |
| TLS | domain/SAN, issuer, validity dates, renewal status; never private keys | Is HTTPS current and auto-renewal observable? |
| Deploy | release SHA/digest, deploy path, owner, rollback artifact | Can a release and rollback be identified exactly? |
| Logs | destinations, retention, rotation, access roles, redaction settings | Are security/error events useful without PII? |
| Backups | job names, last status/time, retention, storage boundary | Is restore evidence possible without production? |

Safe command families, only after login and only when the shell clearly indicates
read-only use: OS/version queries, disk/memory summaries, service/container status,
listening-socket listings, firewall status, nginx configuration test/dump with
secret-bearing directives redacted, certificate metadata and backup job history.
Do not run commands that expose environment blocks or file contents indiscriminately.

## n8n inventory

| Area | Read-only evidence | Security question |
|---|---|---|
| Version/topology | n8n version, execution mode, worker/queue/database labels | Is the topology supportable and isolated? |
| Authentication | SSO/basic-auth state, MFA capability, named roles/counts | Is anonymous/editor access excluded? |
| Exposure | public editor/webhook hostnames, proxy path, IP restrictions | Is the editor less exposed than webhooks? |
| Workflows | IDs/names/status/version timestamps only | Which workflows are active, stale or unowned? |
| Credentials | credential type/name/count and last-update metadata only | Are credentials scoped, named and rotatable? |
| Webhooks | method/path class/auth mode/signature policy; no payloads | Are test/debug hooks disabled in production? |
| Executions | retention/pruning settings and aggregate failure counts | Are PII-bearing executions minimized? |
| Community nodes | installed package names/versions and allow policy | Is unreviewed code running in the control plane? |
| Backups | workflow/config export job status and encrypted destination label | Can n8n be restored without plaintext secrets? |

## Required output

Publish a value-redacted inventory with: current topology, DEV/STAGING/PROD
separation gaps, externally exposed ports/routes, runtime/version risks, backup
coverage, observability gaps and P0–P3 findings. Every proposed mutation must be
a separate change request with rollback and human production approval.

## Stop conditions

Stop and request human action for login/2FA, any credential reveal, an unexpected
production console, unclear host identity, save/apply buttons, a command requiring
elevation beyond read-only inspection, or evidence that a read may trigger a
workflow/test webhook. Production remains untouched.
