# 11 — Handoffs

- Versión: 0.3
- Fecha: 2026-09-25
- Owner: W1
- Estado: abierto

## HANDOFF FROM W1 TO W2/W3/W4

CONTRACT: Bootstrap del repositorio canónico

COMMIT: `0dd2f14`

PR: [#11](https://github.com/Asier-Comba/CRM-Telecomunicaciones/pull/11)

WHAT CHANGED: El snapshot funcional histórico se ha trasladado al repositorio
Telecom sobre la baseline W4. El SQL inmobiliario es ahora evidencia legacy y no
forma parte del pipeline canónico de migraciones.

WHAT IS STABLE: `origin` es `Asier-Comba/CRM-Telecomunicaciones`; el upstream
inmobiliario es read-only; `general-semantic-planner@6ea06e4` es la procedencia del
snapshot; CI y seguridad W4 se preservan. La rama W1 está rebasada sobre
`w4/security-baseline@44375b0`; el árbol remoto coincide con el checkout local.

ACTION REQUIRED:

- W2 debe rebasar `w2/frontend-bootstrap-readiness` sobre la base canónica aceptada
  y resolver sus especificaciones contra la aplicación importada.
- W3 debe rebasar `w3/assistant-runtime-foundation` sobre la base canónica aceptada
  y resolver su arquitectura/contratos contra el runtime importado.
- W4 debe revisar el PR #11, el inventario de drift, los contratos CI y los gates
  de tenant isolation antes de crear `main`.

BLOCKERS: identificación/acceso al nuevo proyecto Supabase y ausencia de un
PostgreSQL/Supabase local en este runtime.
