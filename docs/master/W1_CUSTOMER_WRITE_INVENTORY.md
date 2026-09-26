# W1 — Inventario de escrituras Customer/Client

- Versión: 0.1
- Fecha: 2026-09-26
- Snapshot inspeccionado: `w1/canonical-v3@c2f4ccb`
- Objetivo: impedir que la futura migración `customers`/`companies`/`contacts`
  pierda una escritura real o convierta una necesidad de UI en DDL inventado.
- Estado: inventario de consumidores; **no** es autorización para desplegar ni
  contrato físico aceptado.

## Conclusión

El snapshot tiene dos familias de escritura sobre la tabla histórica `clients`:

1. CRUD directo desde el navegador para alta y edición.
2. Cinco mutaciones de asistente declaradas, pero cuyo endpoint durable
   `/api/agent/action` no existe en la reconstrucción canónica y, por tanto, no
   constituye una ruta de escritura habilitada.

El borrado visible apunta a `/api/clients/[id]/delete`, ruta también ausente en
la reconstrucción. Existe un helper browser `deleteClient(id)`, pero no tiene
consumidor encontrado. No se debe preservar este borrado como contrato por
accidente.

## Escrituras observadas

| Productor | Operación histórica | Campos escritos | Scope observado | Decisión canónica |
| --- | --- | --- | --- | --- |
| `createClientLead` | `insert clients` | `workspace_id`, `name`, `company`, `email`, `phone`, `channel`, `status`, `lead_score`, `notes`, `metadata` | `workspace_id` llega desde estado browser | Sustituir por comando server-side versionado; el servidor resuelve workspace y capacidades. |
| `updateClient` | `update clients` | Los mismos salvo `workspace_id` | Filtro por `id`; la seguridad depende de RLS | Separar identidad, contacto y relación comercial; exigir versión/ETag o conflicto explícito. |
| `deleteClient` | `delete clients` | Fila completa | Filtro por `id`; helper sin consumidor encontrado | No transportar. Definir primero archive/delete, preview de impacto, retención y capability destructiva. |
| Customer 360 histórico | `updateClient` | `name`, `company`, `email`, `phone`, `channel`, `status`, `lead_score`, `notes`, `metadata` | Misma función browser | Migrar solo a comandos aceptados; no permitir patch genérico. |
| Assistant action registry | `update clients` | Únicamente `phone`, `email`, `name`, `notes` o `status`, según acción | Declarado con entidad; ejecución dependía de endpoint ausente | Mantener bloqueado hasta contrato W3 durable de prepare/confirm/idempotency/outbox y adapter W1. |

## Semántica histórica que requiere decisión

| Campo histórico | Uso observado | Riesgo de copiarlo | Decisión requerida |
| --- | --- | --- | --- |
| `name` | Etiqueta principal y búsqueda | Mezcla persona, empresa y nombre comercial | Definir `customer.kind` y separar `legal_name`/`display_name`. |
| `company` | Empresa libre asociada | Duplica identidad de compañía | Decidir si es entidad `company`, relación laboral o alias importado. |
| `email`, `phone` | Contacto directo y búsqueda | PII en la raíz del cliente | Mover a `contacts`/contact methods con reveal/copy capabilities. |
| `channel` | Origen/filtro comercial | Enum histórico no contractual | Publicar vocabulario o lineage de importación; no usar para autorización. |
| `status` | `lead`, `active`, `inactive`, `churned` en consumidores | No coincide con `telecom.v0` | Crear mapping explícito a lifecycle/status o rechazar valor. |
| `lead_score` | Orden y dashboard | Métrica sin definición canónica | No migrar como criterio fiable hasta documentar fuente y rango. |
| `notes` | Texto libre editable | Puede contener PII y datos no clasificados | Definir clasificación, auditoría, retención y edición autorizada. |
| `metadata` | Extensiones de formulario | Esquema oculto y escrituras arbitrarias | Inventariar claves; no ofrecer JSON libre en contrato canónico. |

## Lecturas que la compatibilidad debe cubrir

Las lecturas actuales buscan por `name`, `company`, `email` y `phone`; filtran
por `status` y `channel`; ordenan por `created_at`, `updated_at` y `lead_score`;
y relacionan cliente con tareas, calendario, oportunidades, facturas,
conversaciones, actividades, incidencias y archivos. Los readers de asistente
son históricos y permanecen deshabilitados como superficie privilegiada, pero
documentan dependencias que un adapter de transición debe reconocer.

## Contrato de transición permitido

1. El primer DDL Customer define solo identidad normalizada, contactos y RLS.
2. Toda mutación pública será un comando server-side cerrado; nunca un nombre
   de tabla más un patch libre.
3. El workspace se obtiene de `tenant-context`; no se acepta desde body/modelo.
4. Email/teléfono/CIF usan estados `hidden`, `masked` o `revealed`, con
   capability separada para revelar y copiar.
5. Colecciones declaran `complete` o `partial`, cursor opaco y `as_of`; `[]` no
   representa error, denegación ni contrato no publicado.
6. Alta, edición y archivo tendrán idempotencia/conflicto, códigos de error
   cerrados, auditoría y tests A/B antes de habilitar consumidores.
7. El adapter `clients` temporal, si se acepta, será de lectura. No se creará
   compatibilidad de escritura hasta mapear y probar cada operación de la tabla
   anterior.

## Gates antes del primer write canónico

- Aceptación W2 del read DTO y sus capabilities.
- Aceptación W3 del protocolo durable de mutaciones; los writes de
  tareas/reuniones siguen fuera de este contrato.
- Revisión W4 de RLS, PII, Storage, logs y abuso.
- Zero-to-head + ataques select/insert/update/delete entre A/B, suspended,
  removed y multi-workspace.
- Evidencia de que ninguna ruta browser puede elegir `workspace_id` ni elevar
  capabilities.
