# Presentación Arizan: estado del backend (W5)

**Verificado:** 25/10/2026, 17:37 UTC, con `scripts/w5/arizan-preflight.mjs` (solo lectura, JWT del owner sintético A): **16/16 PASS**.

**Fuentes:**
- **GitHub:** handoff en #157. Frontend alojado `a9e977adf90b1e83cded23fb54aefc696839d014`. Fuente de Work para la demo: `68a08a692950a12ab18b3abf8d331cbc8f94fc64` (#187), en local.
- **Supabase:** `crm-telecom-staging`, 87 migraciones, registro cerrado, RLS 90/90, Storage 88 sin aplicar, IA writes OFF.

Todo es **sintético**. No es una release.

## 1. Compatibilidad frontend ↔ backend (hallazgo clave)

| Frontend | ¿Ve los datos de Supabase staging? | Motivo verificado en código |
|---|---|---|
| **Netlify** `https://crm-telecom-staging-preview.netlify.app` (`a9e977ad`) | **SÍ**, con el owner A (en la cohorte) | La admisión de staging está ligada a este origen exacto y a esta URL de Supabase |
| **Local `127.0.0.1:3107`** (`68a08a69`, Work) | **NO** | `readStagingAdmissionV1` exige `PRODUCT_V1_ORIGIN === https://crm-telecom-staging-preview.netlify.app`. El modo local solo acepta un Supabase **local**. Es una barrera de seguridad deliberada: no se debilita para la demo. Lo que muestra el local son datos de preview/fixtures, **no** esta base |
| EasyPanel | NO (app vacía) | — |

**Decisión del propietario (25/10):** se presenta con el deploy actual de Netlify `6ad78f6c` = `a9e977ad`; **no se despliega `68a08a69`**.

**Conclusión:** para enseñar datos reales y persistentes, el frontend es **Netlify** (owner del equipo Netlify + owner sintético A). Desplegar `68a08a69` en Netlify requiere autorización expresa del propietario: el gate de elegibilidad la bloquea por los 3 hallazgos conocidos. W5 no lo hace por iniciativa propia.

## 2. Datos y lectores exactos de la UI (`a9e977ad`)

Se prueban por RPC con el JWT del owner A: es el mismo lector que llama cada ruta API de la interfaz.

| Pantalla | Operación UI → RPC | Esperado | Obtenido | Rol mínimo |
|---|---|---|---|---|
| Clientes | `customer.list` → `telecom_collection_v1_query` | Incluye **Empresa Ejemplo Norte SL**; 2 activos | PASS (13 filas en total; 2 activas) | viewer |
| Customer360 | `customer.editor` → `product_v1_customer_editor` | Ficha del cliente | PASS | member (el viewer ve listados, no el editor) |
| Contactos | `contact.list` | 1 | PASS | viewer |
| Contratos | `contract.list` | 2 (fibra, móvil) | PASS | viewer |
| Servicios | `service.list` | fibra y móvil | PASS | viewer |
| Líneas | `line.list` | 3 | PASS | viewer |
| Permanencias | `permanence.list` | 1 | PASS | viewer |
| Renovaciones | `renewal.list` | 1, ventana 01/11–31/12/2026 | PASS | viewer |
| Tarifas | `plan_version.list` | 45 €/mes fibra, 25 €/mes móvil | PASS | viewer |
| Oportunidades | `opportunity.stages` → `product_v1_stage_catalog`; `opportunity.list` | 3 etapas; 1 oportunidad de 1.200 € | PASS | viewer |
| Agenda / tareas | `task.list` | "Llamar para revisar renovación de fibra" | PASS | viewer |
| Incidencias | `case.list` → `case_v1_query` | "Cortes intermitentes en la fibra de la sede" | PASS | viewer |
| Facturación | `invoice.list` / `invoice.get` → `billing_v1_*` | Borrador: 300 + 63 = **363 €**, sin número | PASS | **owner/admin** (member y viewer no ven facturas) |

Seguridad ya acreditada el 25/10 en el mismo entorno y con los mismos lectores (22/22): empresa B sin acceso a A, viewer sin escrituras, suspendido sin acceso, sin oráculo de existencia. Fuente y contratos no han cambiado desde entonces, así que no se repite la batería.

## 3. Recorrido recomendado (Netlify, owner A)

1. Login → Panel.
2. **Clientes → filtro "Estado: Activo"**. Sin filtro, el listado de `a9e977ad` muestra también los 11 clientes de prueba archivados (con estado *archivado*).
3. Empresa Ejemplo Norte SL → Customer360.
4. Cartera / Contratos / Servicios: 2 contratos, fibra (1 línea) y móvil (2 líneas), operadores y tarifas.
5. Permanencia y renovación (noviembre–diciembre).
6. Oportunidades: "Ampliación a 10 líneas móviles" (1.200 €, etapa abierta).
7. Agenda/tareas e incidencias.
8. Facturación: borrador 363 €. Abrir y recargar: persiste.

## 4. Fuera de la demo (no presentar como funcional)

- Asistente IA con OpenAI (NOT_CONFIGURED: 503) y cualquier escritura del asistente.
- Documentos y PDF privados (Storage P0, contenido OFF).
- Emisión oficial de facturas, numeración y envío.
- Integraciones reales con operadores, portabilidades efectivas, SMTP.

## 5. Problemas posibles y recuperación

| Síntoma | Comprobación | Acción |
|---|---|---|
| Página de Netlify "private" o 401 | Sesión del equipo Netlify caducada (~1 h) | Volver a entrar en Netlify con la cuenta Owner del equipo |
| `/login?error=staging_access_denied` | Usuario fuera de la cohorte o no sintético | Usar el owner sintético A (canal privado) |
| Aparecen los 11 clientes de prueba | Filtro de estado vacío | Filtrar "Activo" |
| Factura no visible | Rol member o viewer | Usar owner A |
| 403 en una acción | Denegación legítima (rol o empresa) | No ampliar permisos; explicar el control |
| Duda sobre los datos | Ejecutar `ARIZAN_PREFLIGHT_EMAIL=… ARIZAN_PREFLIGHT_PASSWORD=… node scripts/w5/arizan-preflight.mjs` (credenciales por canal privado) | Debe dar 16/16 PASS; es solo lectura |

**Contingencia:** si Netlify no está accesible, el local `68a08a69` puede enseñar la interfaz con datos de preview. **Debe presentarse como entorno de demostración, no como datos persistentes de Supabase.**

## 6. No verificado por W5

- La interfaz alojada: W5 no tiene sesión de equipo Netlify. Las capturas y la navegación las hace Work o el propietario.
- El render en Netlify de pantallas que `a9e977ad` pueda no tener completas: alta manual de contrato, servicio y línea (llegó después en #175).
