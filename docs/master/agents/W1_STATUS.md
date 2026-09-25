# W1 — Backend, Data, Supabase & Integration

- Timestamp aproximado: 2026-09-25 17:00 Europe/Madrid
- Branch: `w1/bootstrap-canonical`
- Último commit funcional: `c0e1dcf`
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

## Trabajo actual

Publicación de la rama W1 y comienzo de la baseline Supabase canónica. La
validación local completa está verde.

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
- Decisión del propietario sobre visibilidad pública del repositorio.
