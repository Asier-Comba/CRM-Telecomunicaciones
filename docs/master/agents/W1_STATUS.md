# W1 — Backend, Data, Supabase & Integration

- Timestamp aproximado: 2026-09-25 17:32 Europe/Madrid
- Branch: `w1/bootstrap-canonical`
- Último commit remoto funcional: `0dd2f14`
- Pull request: [#11](https://github.com/Asier-Comba/CRM-Telecomunicaciones/pull/11)
- Estado: en progreso

## Trabajo completado

- Repositorio correcto y permisos GitHub verificados.
- Histórico configurado como `upstream-readonly` con push deshabilitado.
- Baseline W4 preservada.
- Snapshot histórico funcional seleccionado y trasladado.
- Migraciones inmobiliarias aisladas como legacy.
- Auditor de reproducibilidad, inventario SQL read-only y tests de bootstrap
  trasladados.
- Next actualizado a 16.3.6; auditoría npm cerrada con 0 vulnerabilidades.
- Snapshot completo publicado en el repositorio público con autorización expresa.
- Rama rebasada sobre `w4/security-baseline@44375b0`; árbol local y remoto
  verificados como idénticos (`231cd44`).
- PR de bootstrap abierto contra W4 con la batería local completa en verde.

## Trabajo actual

Revisión del PR de bootstrap y descubrimiento read-only del nuevo proyecto
Supabase antes de diseñar la baseline canónica. La validación local completa está
verde.

## Siguiente tarea

Crear la primera migración canónica multi-tenant y su matriz RLS después de cerrar
el contrato de roles y disponer de una base vacía para pruebas.

## Contratos publicados

- `docs/master/03_DATA_MODEL.md`: drift y contrato agentic observado.
- `docs/master/BOOTSTRAP_PROVENANCE.md`: procedencia y límites del bootstrap.
- `scripts/audit-supabase-reproducibility.mjs`: gate estático.
- `scripts/audit-supabase-live-schema.sql`: inventario read-only del catálogo.

## Handoffs

Ver `docs/master/11_HANDOFFS.md`.

## Blockers

- Identificación/acceso al nuevo proyecto Supabase.
- PostgreSQL/Supabase local no disponible en este runtime.
