# 03 — Modelo de datos

- Versión: 0.2
- Fecha: 2026-09-26
- Base: `w4/security-baseline@5cb872c`
- Owner: W1
- Estado: reconstrucción P0; diseño telecom pendiente
- Supersedes: ninguno

## Migraciones canónicas

`20260925153500_core_tenant_identity.sql` define la primera base canónica:
`workspaces`, `profiles`, `workspace_members`, helpers de membresía y RLS. La única
fuente de rol tenant es la membresía; `profiles.workspace_id` es solo una
preferencia compatible y `profiles` no contiene rol.

Las migraciones del CRM inmobiliario no forman parte de la rama canónica v3. No
se aplican, auditan como baseline ni se mantienen como dependencia implícita.

`20260926120000_atomic_workspace_onboarding.sql` añade el único camino de alta:
un RPC autenticado y transaccional crea workspace+slug, owner membership y
preferencia de perfil. Los reintentos se serializan por identidad y devuelven la
membresía activa existente.

`20260926143000_enforce_active_workspace_authorization.sql` es una corrección
forward-only: exige workspace y membresía activos en los cinco helpers RLS,
recrea la policy de lectura de membresías y hace que onboarding rechace un
workspace suspendido en vez de crear un tenant alternativo. Las migraciones
anteriores permanecen inmutables.

## Drift confirmado

`npm run audit:supabase-repro` informa actualmente 29 relaciones/vistas y el RPC
`reserve_invoice_number` usados por código importado sin creación canónica. El
resultado es deliberadamente rojo: ese código se clasifica o recibe DDL Telecom
por fases antes de poder considerarse activo.

El auditor ya no trata SQL legacy como una fuente de promoción. Todo objeto que
el código necesite debe obtener DDL canónico, clasificación de dominio, RLS y
tests propios; de lo contrario permanece drift explícito o el consumidor se
retira.

## Contrato agentic observado (no es DDL)

Inventario derivado exclusivamente de lecturas/escrituras del código importado.
Sirve para clasificar dependencias, no autoriza a elegir tipos, defaults, claves
foráneas o policies que no estén confirmados.

| Relación | Campos observados | Invariantes observadas |
| --- | --- | --- |
| `assistant_actions` | `id`, `workspace_id`, `conversation_id`, `action_type`, `entity_type`, `entity_id`, `current_state_json`, `proposed_changes_json`, `preview_hash`, `idempotency_key`, `expected_updated_at`, `status`, `expires_at`, `created_at`, `confirmed_at`, `executed_at`, `result_json`, `safe_error_code` | idempotencia por workspace+key; estados usados: `prepared`, `executing`, `completed`, `failed`, `conflict`, `cancelled`, `expired`; escritura server-to-server y SELECT autenticado con scope de workspace |
| `assistant_findings` | `id`, `workspace_id`, `finding_type`, `entity_type`, `entity_id`, `fingerprint`, `title`, `summary`, `severity`, `status`, `detected_at`, `resolved_at`, `updated_at` | dedupe por workspace+fingerprint; severidades `info`, `warning`, `critical`; estados `open`, `acknowledged`, `resolved`, `dismissed`; UI autenticada de solo lectura por workspace |

Antes de crear la baseline deben definirse además tipos, nullability, defaults,
FKs/cascadas, índices, triggers, ownership, grants y todas las policies RLS.

## Procedencia del hueco agentic

No se promoverá DDL histórico ni se intentará acceder al Supabase inmobiliario.
La infraestructura assistant se diseñará con W3 sobre el schema canónico aceptado
y con confirmación/idempotencia durable.

## Diseño telecom (candidatos, no aprobado)

El diseño deberá normalizar clientes/contactos, cuentas telecom, contratos,
servicios/líneas, operadores/planes, términos/permanencias, ventanas de renovación,
oportunidades, incidencias, actividad, documentos e importaciones. Fechas y reglas
de permanencia no vivirán únicamente en JSON.

Los primeros contratos de presentación/API ya están publicados como
`telecom.v0` en `W1_DATA_CONTRACTS_V0.md` y
`src/lib/contracts/telecom-v0.ts`. Sus nombres y semántica son estables para W2 y
W3, pero no implican todavía DDL, policies o endpoints desplegados.
