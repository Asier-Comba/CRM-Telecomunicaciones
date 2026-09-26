# Canonical bootstrap provenance

- Updated: 2026-09-26
- Owner: W1
- Canonical candidate: `w1/canonical-v2`

## Repository boundary

`Asier-Comba/CRM-Telecomunicaciones` is the only writable repository. The
historical `iazticontact/crm-inmobiliario-demo` repository is read-only.

## Reconstruction boundary

This branch starts at `w4/security-baseline@10ee3aa`. It does not merge,
cherry-pick or otherwise make commits from `w1/bootstrap-canonical` or
`w1/bootstrap-sanitized` reachable.

The application snapshot was selectively reconstructed. The following were
deliberately not imported:

- archived infrastructure/secret-bearing documentation;
- all historical and real-estate migrations;
- n8n workflow exports and live-patch/QA/session scripts;
- legacy agent, assistant-confirmation, integration, webhook and debug routes;
- environment/session/token files.

W4 CI, security policies and documentation remain from the current baseline and
take precedence. The canonical migration directory contains only reviewed W1
tenant/onboarding migrations. Supabase has not been accessed.
