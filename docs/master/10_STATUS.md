# 10 — Status

- Versión: 0.2
- Fecha: 2026-09-25
- Base histórica: `6ea06e4`
- Owner: W1
- Estado: bootstrap canónico en progreso
- Supersedes: estado W1 mantenido en el repositorio inmobiliario

## Hecho

- Nuevo repo `Asier-Comba/CRM-Telecomunicaciones` verificado con permiso de push.
- `origin` apunta al repo nuevo; `upstream-readonly` tiene push deshabilitado.
- Rama `w1/bootstrap-canonical` creada sobre `w4/security-baseline` sin alterar W4.
- Snapshot `general-semantic-planner` seleccionado tras comparar ramas y commits.
- Código funcional y auditorías W1 trasladados; CI/seguridad W4 preservados.
- Migraciones inmobiliarias aisladas en `supabase/legacy-migrations`.
- Runtime Node 24, scripts `typecheck` y `test`, y tests de bootstrap añadidos.

## Evidencia actual

- 0 migraciones canónicas; 28 migraciones legacy.
- 42 archivos SQL históricos escaneados.
- 35 relaciones/vistas y 2 RPC requeridos por el código pendientes de baseline.
- 31 relaciones/vistas y ambos RPC tienen evidencia histórica.
- 4 tablas agentic siguen sin `CREATE TABLE` histórico.
- Tests de bootstrap: 3/3 PASS.
- ESLint: 0 errores, 3 warnings heredados.
- TypeScript: PASS.
- Build Next 16.3.6: PASS, 50/50 páginas.
- `npm audit --audit-level=high`: 0 vulnerabilidades.

## Trabajo actual

Validar lint, tipos y build del snapshot combinado, publicar esta rama en el repo
nuevo y comenzar la primera migración canónica multi-tenant.

## Siguiente

Identificar el proyecto Supabase nuevo de Asier, definir el contrato de roles y
construir la baseline en orden de dependencias con RLS deny-by-default.
