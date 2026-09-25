# 11 — Handoffs

- Versión: 0.2
- Fecha: 2026-09-25
- Owner: W1
- Estado: abierto

## HANDOFF FROM W1 TO W2/W3/W4

CONTRACT: Bootstrap del repositorio canónico

COMMIT: `c0e1dcf`

WHAT CHANGED: El snapshot funcional histórico se ha trasladado al repositorio
Telecom sobre la baseline W4. El SQL inmobiliario es ahora evidencia legacy y no
forma parte del pipeline canónico de migraciones.

WHAT IS STABLE: `origin` es `Asier-Comba/CRM-Telecomunicaciones`; el upstream
inmobiliario es read-only; `general-semantic-planner@6ea06e4` es la procedencia del
snapshot; CI y seguridad W4 se preservan.

ACTION REQUIRED:

- W2 debe trasladar sus cinco commits de `w2/frontend-audit-foundation` al repo
  nuevo después de que se publique el bootstrap.
- W3 debe trasladar sus once commits de `w3/assistant-runtime-foundation` y resolver
  su documento `04_AI_ARCHITECTURE.md` contra la versión maestra.
- W4 debe revisar el bootstrap, actualizar CI para la rama W1 y mantener los gates
  de tenant isolation antes de crear `main`.

BLOCKERS: identificación/acceso al nuevo proyecto Supabase y decisión de
visibilidad del repositorio.
