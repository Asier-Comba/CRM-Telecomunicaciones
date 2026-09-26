# W1 — Clasificación del drift canónico

- Versión: 0.1
- Fecha: 2026-09-26
- Base de auditoría: `w1/canonical-v3@c2f4ccb`
- Consumidores revisados: W2 `13369ba`; W3 `c6e869e`
- Resultado: 29 relaciones/vistas + 1 RPC sin DDL canónico
- Regla: no copiar SQL legacy; cada objeto requiere contrato, ownership, RLS,
  grants, índices, pruebas zero-to-head y revisión W4.

## Avance en `w1/telecom-domain-v1`

La medición 29+1 describe el schema remoto observado y no cambia porque esta
rama no se ha aplicado. Sin embargo, cuatro de esas relaciones ya tienen DDL
canónico nuevo y pruebas estructurales: `activities`, `calendar_events`,
`opportunities` y `tasks`. Quedan 25 relaciones/vistas + 1 RPC sin DDL canónico
equivalente; `clients` se reemplaza deliberadamente por `customers`/`contacts`
y no se recreará como tabla legacy.

Además existen diez relaciones Telecom nuevas que no copian nombres legacy:
`customers`, `contacts`, `telecom_operators`, `telecom_plans`,
`telecom_plan_versions`, `telecom_contracts`, `telecom_services`,
`telecom_lines`, `telecom_commitments` y `telecom_renewals`. Ninguna está
aplicada remotamente.

## Resumen

| Clasificación | Relaciones/vistas | RPC | Decisión |
| --- | ---: | ---: | --- |
| CORE REQUIRED | 16 | 1 | Reconstruir por dominios confirmados, con RLS deny-by-default |
| TELECOM REQUIRED | 3 | 0 | Sustituir semántica inmobiliaria por contratos Telecom versionados |
| ASSISTANT INFRA | 7 | 0 | Esperar contrato durable W3 e integración sobre base aceptada |
| LEGACY INMOBILIARIO | 1 | 0 | Retirar consumidores; no reconstruir DDL |
| OBSOLETE | 2 | 0 | Retirar o reemplazar por adaptadores; no promover tablas n8n |
| **Total** | **29** | **1** | Drift explícito, release bloqueada |

## Matriz exhaustiva

| Objeto | Clasificación | Prioridad/acción canónica | Dependencia |
| --- | --- | --- | --- |
| `activities` | CORE REQUIRED | CANONICAL READY: append-only, código cerrado y renderer seguro; runtime DB pendiente | W2 dashboard/freshness |
| `automation_workflows` | CORE REQUIRED | P3: configuración de automatización neutral al proveedor | W2; revisión W4 |
| `calendar_events` | CORE REQUIRED | CANONICAL READY: reunión tenant, lifecycle/fechas/timezone estrictos; runtime DB pendiente | W2 dashboard; W3 reads |
| `conversations` | CORE REQUIRED | P2: hilo de atención con canal/estado definidos | W2 Customer Attention |
| `entity_files` | CORE REQUIRED | P2: metadatos Storage con policies separadas por bucket/path | W2 PII/copy |
| `integrations` | CORE REQUIRED | P3: estado/configuración no secreta; secretos fuera de filas cliente | W4 review |
| `invoice_items` | CORE REQUIRED | P3: líneas de factura tras aceptar el contrato billing | W2 dashboard |
| `invoices` | CORE REQUIRED | P3: facturación tenant; numeración durable y monetaria exacta | RPC asociado |
| `messages` | CORE REQUIRED | P2: mensajes de atención con PII y capabilities explícitas | W2 Customer Attention |
| `notifications` | CORE REQUIRED | P3: bandeja de avisos, no autorización | W2 |
| `tasks` | CORE REQUIRED | CANONICAL READY: tarea versionada y ligada opcionalmente a cliente/oportunidad; runtime DB pendiente | W2 dashboard; W3 reads |
| `vw_google_calendar_status` | CORE REQUIRED | P3: derivar solo después del contrato de integración | `integrations` |
| `vw_integrations_status` | CORE REQUIRED | P3: vista derivada; no crear antes de sus fuentes | `integrations` |
| `whatsapp_connections` | CORE REQUIRED | P3: metadatos no secretos y boundary server-only | W2 Customer Attention; W4 |
| `workspace_settings` | CORE REQUIRED | P1: preferencias tenant sin conceder privilegios | tenant/auth |
| `workspace_templates` | CORE REQUIRED | P3: plantillas tenant, sin payload ejecutable privilegiado | W2 |
| `clients` | TELECOM REQUIRED | P1: reemplazar por `customers`/`companies` + `contacts`; compatibilidad solo mediante adapter/view explícita | `telecom.v0` W2/W3 |
| `opportunities` | TELECOM REQUIRED | CANONICAL READY: stages y oportunidad comercial Telecom sin campos inmobiliarios; runtime DB pendiente | customers/contracts |
| `service_cases` | TELECOM REQUIRED | P2: incidencia/gestión de servicio con taxonomía Telecom | services/lines |
| `agent_action_logs` | ASSISTANT INFRA | P3: auditoría append-only tras definir actor/effect/outbox | W3 durable infra |
| `assistant_actions` | ASSISTANT INFRA | P3: reserva/confirmación/idempotencia durable | Issue #10 / W3 |
| `assistant_agent_memory` | ASSISTANT INFRA | P3: memoria limitada, con retención y source projection | W3 |
| `assistant_findings` | ASSISTANT INFRA | P3: findings deduplicados por workspace/fingerprint | W3 |
| `assistant_messages` | ASSISTANT INFRA | P3: separar del canal de atención hasta fijar taxonomía | W3 |
| `assistant_threads` | ASSISTANT INFRA | P3: lifecycle durable y scope tenant | W3 |
| `inbox_agent_settings` | ASSISTANT INFRA | P3: configuración no secreta con autorización manager | W2/W3 |
| `properties` | LEGACY INMOBILIARIO | Retirar consumidores UI/libs; no crear tabla canónica | limpieza producto |
| `n8n_flows` | OBSOLETE | Sustituir por contrato neutral `automation_workflows`; no copiar DDL | W4 integration boundary |
| `n8n_trigger_logs` | OBSOLETE | Sustituir por auditoría/outbox neutral; no copiar DDL | W3/W4 |
| `reserve_invoice_number` | CORE REQUIRED | P3: RPC atómico por workspace y periodo, después del schema billing | invoices |

## Siguiente secuencia de migraciones

1. **Identidad (cerrada en código, pendiente DB):** aplicar de cero tenant/auth,
   suspensión de workspace y onboarding; ejecutar ataques A/B reales.
2. **Customer identity:** `customers`, `companies`, `contacts` y relaciones de
   contacto. No se define compatibilidad de escritura con `clients` hasta medir
   cada write actual.
3. **Portfolio Telecom:** `contracts`, `services`, `lines`, `operators`, `plans`,
   permanencia y renovación.
4. **Operación:** oportunidades, tareas, actividad, calendario e incidencias.
5. **Atención e integraciones:** conversaciones/mensajes, archivos y conexiones
   no secretas con capabilities de PII/copiar reveladas por el servidor.
6. **Assistant durable:** solo tras aceptar W3 Issue #10: reservas,
   idempotencia, outbox, reconciliación autorizada y auditoría append-only.
7. **Imports/audit:** staging, mapping, dedupe, lineage y rechazo parcial antes
   de permitir cargas reales.

## Contratos que bloquean DDL prematuro

- W2 necesita semántica exacta de Customer Attention, dashboard, completitud,
  freshness y capabilities de revelar/copiar PII.
- El inventario de escrituras actual está en
  `W1_CUSTOMER_WRITE_INVENTORY.md`; una vista/adapter de compatibilidad no
  autoriza compatibilidad de escritura.
- W3 necesita taxonomía de entidades, contratos exactos de servicio y el mismo
  boundary de workspace/auth; el modelo no elige `workspace_id`.
- Ningún write nuevo se inventa desde un DTO de presentación. Los writes se
  publicarán como contratos separados, versionados y con idempotencia explícita.

## Evidencia pendiente

- No existe Supabase aislado autorizado en esta sesión; no se ejecutó apply.
- El plan zero-to-head y el harness SQL están preparados, pero todavía deben
  ejecutarse sobre PostgreSQL aislado. La matriz de lectura cubre las 15
  relaciones para A/B/C, suspendido, removed, anónimo y multi-workspace; las
  mutaciones representativas cubren owner/admin/member/viewer, DELETE sin
  policy, cambio de tenant, upsert y FK compuesta cross-tenant.
- Antes de release aún faltan apply doble mediante el migration runner,
  catálogo/constraints/índices, mutaciones por cada relación, concurrencia y
  cualquier RPC que llegue a ser aceptado como contrato canónico.
