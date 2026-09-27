# W1 — Contratos de datos Telecom v0

- Versión: `telecom.v0`
- Fecha: 2026-09-25
- Owner: W1
- Consumidores: W2, W3, W4
- Estado global: **STABLE** como contrato de presentación/API
- Implementación SQL: **DRAFT**; ninguna migración de dominio ha sido aplicada

## Convención de estabilidad

| Marca | Significado |
| --- | --- |
| **STABLE** | El nombre y significado del campo no se cambia de forma incompatible dentro de `telecom.v0`. Los enums pueden ampliarse de forma compatible. |
| **DRAFT** | Diseño aún sujeto a revisión; no debe asumirse como tabla, FK, policy o endpoint desplegado. |
| **RESERVED** | Nombre reservado para una versión posterior; un consumidor v0 no debe enviarlo ni depender de él. |

Los tipos compartidos normativos están en
`src/lib/contracts/telecom-v0.ts`. Estos read models no autorizan a W2/W3 a
inventar el esquema físico. Cada respuesta debe quedar acotada al
`workspace_id` resuelto por `workspace_members`.

## Customer / Company — STABLE

| Campo v0 | Semántica |
| --- | --- |
| `id`, `workspace_id` | Identidad y scope tenant opacos. |
| `legal_name`, `display_name` | Razón social y nombre breve de presentación. |
| `tax_identifier` | CIF/NIF/VAT tipado; `null` significa desconocido, no vacío. |
| `assigned_user` | Comercial responsable como referencia `{id, display_name}` o `null`. |
| `contacts` | Resúmenes de contactos con email/teléfono nullable y flag principal. |
| `lifecycle` | `lead`, `prospect`, `customer`, `former_customer`. |
| `status` | `active`, `inactive`, `archived`. |

La tabla física, deduplicación fiscal y permisos de edición son **DRAFT**.
`billing_profile`, `credit_risk` y jerarquías de grupo quedan **RESERVED**.

## Telecom contract — STABLE

| Campo v0 | Semántica |
| --- | --- |
| `id`, `workspace_id`, `customer_id` | Contrato y tenant/cliente propietarios. |
| `operator` | Operador como referencia estable, no texto libre. |
| `service_ids`, `line_ids` | Relaciones explícitas; nunca enterradas en metadata JSON. |
| `start_date`, `commitment_end_date`, `end_date` | Fechas ISO `YYYY-MM-DD`; las dos últimas pueden ser `null`. |
| `renewal_window` | Apertura/cierre y estado calculable de renovación. |
| `assignee` | Comercial responsable o `null`. |
| `lifecycle` | `draft`, `active`, `renewal_due`, `ended`, `cancelled`. |

El versionado de condiciones, facturación y portabilidad queda **DRAFT**.
`signed_document_id` y condiciones multianuales quedan **RESERVED**.

## Services / Lines — STABLE

Un único contrato discriminado por `kind: service | line` publica `id`,
`workspace_id`, `customer_id`, `contract_id`, `operator`, `plan_tariff` y
`status`. `plan_tariff` es una referencia normalizada o `null`; `status` admite
`pending`, `active`, `suspended` y `cancelled`.

El detalle técnico por familia (móvil, fibra, centralita, IoT) es **DRAFT**.
MSISDN cifrado/masked, ICCID y recursos de provisión quedan **RESERVED** hasta
cerrar clasificación, permisos y retención.

## Dashboard read model — STABLE

`DashboardReadModelV0` publica cinco secciones: `tasks`, `meetings`, `renewals`,
`permanence_alerts` y `opportunities`, junto con `generated_at` y
`contract_version`.

Cada sección tiene semántica exhaustiva:

| `state` | `items` | `source_updated_at` | `error` |
| --- | --- | --- | --- |
| `ready` | Uno o más elementos. | Obligatorio. | `null`. |
| `empty` | Exactamente `[]`; carga válida sin resultados. | Última lectura conocida o `null`. | `null`. |
| `error` | Exactamente `[]`; no reutiliza datos silenciosamente. | Último dato conocido o `null`. | `{code, message, retryable}` obligatorio. |

La agregación, paginación y SLA de frescura son **DRAFT**. Totales monetarios,
forecast y KPIs ejecutivos quedan **RESERVED**.

## Compatibilidad

- Nuevos campos opcionales o nuevos valores de enum requieren nota de cambio.
- Quitar, renombrar o cambiar semántica exige `telecom.v1`.
- Fechas son ISO sin hora; timestamps son ISO-8601 UTC.
- `null` significa desconocido/no aplicable; ausencia de colección se expresa
  como `[]`, nunca omitiendo el campo.
- Los errores de una sección no convierten automáticamente en error todo el
  dashboard.
