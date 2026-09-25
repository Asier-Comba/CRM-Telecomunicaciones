# 09 — Decisiones

- Versión: 0.1
- Fecha: 2026-09-25
- Commit base: `6ea06e4`
- Owner: W0–W4
- Estado: activo
- Supersedes: ninguno

## D-001 — Base inicial de W1

W1 parte de `origin/general-semantic-planner` porque contiene todo `main` y 22
commits adicionales, y es la base recomendada por la auditoría maestra.

## D-002 — Reconstrucción independiente

El Supabase inmobiliario se considera irrecuperable y no se consulta. El schema
nuevo se deriva del código, contratos y DDL histórico; cada inferencia se documenta
y valida en vacío antes de promoverse a migración canónica.

## D-003 — Auditoría automatizada

Se incorpora un auditor sin dependencias externas. Modo informativo para medir la
deuda actual; modo `--strict` como gate de reproducibilidad cuando se cierre el P0.

## D-004 — Mensajes de commit no sustituyen migraciones

P65, P67 y P68 declaran migraciones agentic aplicadas en staging, pero el historial
Git completo no contiene su DDL. Esos mensajes y los contratos observados ayudan a
reconstruir, pero no son fuente suficiente por sí solos.

## D-005 — SQL histórico fuera del pipeline

Las 28 migraciones inmobiliarias pasan a `supabase/legacy-migrations`. Solo los SQL
con nombre canónico creados y validados en `supabase/migrations` podrán aplicarse al
nuevo proyecto Supabase.

## D-006 — Una sola fuente de autorización tenant

`workspace_members` es la única fuente de roles tenant. Los roles canónicos son
`owner`, `admin`, `member` y `viewer`; solo una membresía `active` concede acceso.
`profiles` no contiene rol. Su `workspace_id` es una preferencia de workspace por
compatibilidad y nunca autoriza una operación: servidor, RLS y herramientas deben
volver a comprobar la membresía activa.

La migración histórica queda mapeada así: `client_admin` → `admin`, `comercial` →
`member`, `solo_lectura` → `viewer`. `nowlabs_admin` no se migra automáticamente a
ningún privilegio global o tenant; requiere decisión explícita por workspace.

Los clientes autenticados solo leen workspaces/membresías. Altas, cambios de rol,
suspensiones y bajas se ejecutarán por servicios server-side estrechos; no se
conceden mutaciones directas sobre esas tablas.
