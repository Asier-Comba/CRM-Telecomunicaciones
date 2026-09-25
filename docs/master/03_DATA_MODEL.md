# 03 — Modelo de datos

- Versión: 0.1
- Fecha: 2026-09-25
- Commit base: `6ea06e4`
- Owner: W1
- Estado: reconstrucción P0; diseño telecom pendiente
- Supersedes: ninguno

## Migraciones canónicas

`supabase/migrations` está vacío al inicio del bootstrap. Las 28 migraciones del
CRM inmobiliario se conservan bajo `supabase/legacy-migrations` como evidencia y
no se aplican automáticamente al proyecto nuevo.

## Drift confirmado

`npm run audit:supabase-repro` detecta 35 relaciones/vistas y dos RPC usados por
el código sin creación canónica: `delete_client_cascade` y
`reserve_invoice_number`.
Entre ellas están `assistant_actions`, `assistant_findings`,
`assistant_automation_rules` y `assistant_automation_runs`; las migraciones incluso
aplican `GRANT`/`ALTER` sobre estas tablas inexistentes en una base vacía.

El auditor revisa además 42 SQL históricos de `docs/` y
`supabase/legacy-migrations`, pero los clasifica como evidencia no canónica:

- 31 relaciones/vistas tienen al menos una definición histórica.
- Los dos RPC tienen definición histórica.
- Las cuatro relaciones agentic citadas arriba no tienen DDL en ningún SQL
  versionado localizado.

El listado completo, los usos y las definiciones históricas se generan
automáticamente. El DDL histórico solo se promoverá después de revisar sus
dependencias, seguridad y compatibilidad con el dominio telecom.

## Contrato agentic observado (no es DDL)

Inventario derivado exclusivamente de lecturas/escrituras del código y de las dos
migraciones P70 que presuponen las tablas. Sirve para comparar el esquema vivo; no
autoriza a elegir tipos, defaults, claves foráneas o policies que no estén
confirmados.

| Relación | Campos observados | Invariantes observadas |
| --- | --- | --- |
| `assistant_actions` | `id`, `workspace_id`, `conversation_id`, `action_type`, `entity_type`, `entity_id`, `current_state_json`, `proposed_changes_json`, `preview_hash`, `idempotency_key`, `expected_updated_at`, `status`, `expires_at`, `created_at`, `confirmed_at`, `executed_at`, `result_json`, `safe_error_code` | idempotencia por workspace+key; estados usados: `prepared`, `executing`, `completed`, `failed`, `conflict`, `cancelled`, `expired`; escritura server-to-server y SELECT autenticado con scope de workspace |
| `assistant_findings` | `id`, `workspace_id`, `finding_type`, `entity_type`, `entity_id`, `fingerprint`, `title`, `summary`, `severity`, `status`, `detected_at`, `resolved_at`, `updated_at` | dedupe por workspace+fingerprint; severidades `info`, `warning`, `critical`; estados `open`, `acknowledged`, `resolved`, `dismissed`; UI autenticada de solo lectura por workspace |
| `assistant_automation_rules` | `id`, `workspace_id`, `type`, `name`, `enabled`, `schedule_json`, `timezone`, `last_run_at`, `next_run_at`, `created_at`, `updated_at` | `type` limitado por el CHECK P70 a 11 runners; scheduler consulta reglas habilitadas y vencidas; escritura server-to-server |
| `assistant_automation_runs` | `id`, `rule_id`, `workspace_id`, `scheduled_for`, `status`, `started_at`, `finished_at`, `result_count`, `safe_error_code` | claim idempotente por rule+ventana; estados P70 `running`, `success`, `partial`, `error`, `skipped_duplicate`, `skipped`; recuperación de runs atascados |

Antes de crear la baseline deben definirse además tipos, nullability, defaults,
FKs/cascadas, índices, triggers, ownership, grants y todas las policies RLS.

## Procedencia del hueco agentic

La búsqueda en todos los commits y ramas remotas no localizó ningún `CREATE TABLE`
para las cuatro relaciones. Los commits de introducción `448be2c` (P65), `a7e8a4b`
(P67) y `f8fa2ff` (P68) describen migraciones aplicadas en staging, pero sus diffs no
incluyen archivos de migración. Más tarde, `6aab1de` y `c977d9c` añadieron solo los
`GRANT SELECT` y cambios de `CHECK` sobre tablas ya existentes. Por tanto, el DDL
inicial vivió fuera de Git. Se reconstruirá desde los contratos observados y se
validará desde cero; no se intentará acceder al Supabase inmobiliario.

## Diseño telecom (candidatos, no aprobado)

El diseño deberá normalizar clientes/contactos, cuentas telecom, contratos,
servicios/líneas, operadores/planes, términos/permanencias, ventanas de renovación,
oportunidades, incidencias, actividad, documentos e importaciones. Fechas y reglas
de permanencia no vivirán únicamente en JSON.
