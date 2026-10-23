# Contrato Supabase STAGING para la App EasyPanel `crm-inmobiliario / crm-telecom-staging`

Versión `w5.supabase-staging-contract.v1` · 23/10/2026 · responsable W5 (Supabase). **Sin valores secretos.**

- EasyPanel (contenedor, dominio, TLS, variables) es de **Work de Asier**.
- W5 no toca EasyPanel, DNS, n8n ni el CRM inmobiliario.
- **Los datos del CRM inmobiliario no comparten proyecto, claves ni base con este.**

## 1. Proyecto

| Campo | Valor |
|---|---|
| Proyecto / ref | `crm-telecom-staging` / `zgwotxnyqzfuzcnmgvtn` (org `oiwyvaihoxfamgieaeno`, eu-west-2, plan Free) |
| Entorno | **STAGING** (no producción; datos solo sintéticos `@example.invalid`) |
| URL pública | `https://zgwotxnyqzfuzcnmgvtn.supabase.co` |
| PostgreSQL | 17.11 |
| Migraciones alojadas | **87**; última versión alojada `20261019180534` (= archivo `20261020100000_business_conflict_non_retryable.sql`). Ledger 87/87 byte a byte con la fuente (20/10) |
| Storage 88 | **NO aplicada** (propuesta #179). Contenido de documentos **OFF** |
| Backups | Plan Free: sin backups programados ni PITR. No se resetea ni se restaura encima |

## 2. Variables para el contenedor (solo nombres)

**Públicas (van al bundle del navegador; no son secretos):**
- `NEXT_PUBLIC_SUPABASE_URL` = la URL del §1.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: clave **publicable** (`sb_publishable_…`). La misma que usa hoy la preview Netlify; Work la copia desde el panel de Supabase.

**Servidor, no secretas:**
- `APP_ENV=staging`
- `PRODUCT_V1_ENABLED=true`
- `PRODUCT_V1_ORIGIN` = **origen HTTPS exacto** del subdominio nuevo (sin barra final).
- `PRODUCT_STAGING_INTEGRATION=true`
- `PRODUCT_STAGING_USER_IDS` = cohorte `uuid_csv`: solo UUID de cuentas sintéticas confirmadas, 1..64, minúsculas, sin espacios. W5 la entrega por canal privado.

**Deben quedar SIN definir:**
- `SUPABASE_SERVICE_ROLE_KEY`: hasta que Storage 88 esté aceptado y autorizado. Nunca `NEXT_PUBLIC_`.
- `OPENAI_API_KEY`: ver `OPENAI_SERVER_CONTRACT.md` en #171.
- `PRODUCT_DOCUMENT_CONTENT_ENABLED` y `PRODUCT_DOCUMENT_MAINTENANCE_ENABLED`.
- `N8N_*`, `SMTP_*`, `META_*`, `AGENT_TOOL_SECRET`.
- Cualquier credencial del CRM inmobiliario.

**Imprescindible para la admisión:** `NODE_ENV=production` en el build y el runtime de `next start`.

## 3. Admisión (código `src/lib/server/product-staging-admission-v1.ts`)

| Condición | Efecto si falla |
|---|---|
| Configuración incompleta o inválida (origen, URL de Supabase, cohorte, `APP_ENV`, `NODE_ENV`) | 503 en todo el sitio |
| Identidad: `getUser()` en servidor; solo `@example.invalid`, confirmada, no anónima, UUID en la cohorte | Páginas → `/login?error=staging_access_denied`; APIs 403 `access_denied` |
| Origen de la petición ≠ `PRODUCT_V1_ORIGIN` | Rechazo de mutaciones (origen cerrado) |

La identidad nunca sale de datos editables por el usuario ni del frontend. `profiles.email` es editable por su dueño y **no se usa para autorizar**: verificado en las funciones que leen email.

## 4. Auth (estado verificado por el endpoint público, 23/10)

| Ajuste | Valor |
|---|---|
| Proveedores | Solo email/contraseña. Sin OAuth, sin SAML, sin anónimos |
| Confirmación de email | Obligatoria (`mailer_autoconfirm=false`) |
| Registro público | **Cerrado** (`disable_signup=true`, 23/10, autorizado por el propietario). Altas solo por invitación o administración |
| Site URL y Redirect URLs | **NOT_VERIFIED**: no se exponen en endpoints públicos y W5 no tiene acceso de gestión a la configuración Auth |

**Callbacks que usa la app** (fuente `f9aa469b`):
- `/auth/callback`: `exchangeCodeForSession`.
- `/reset-password`: recuperación, con `redirectTo: ${origin}/reset-password`.
- El alta no fija `emailRedirectTo`, así que usa la **Site URL**.

**Cambio propuesto cuando Work confirme el origen exacto** (cambio administrativo compartido; requiere aprobación del propietario):
1. Añadir **solo** dos Redirect URLs exactas: `https://<subdominio-exacto>/auth/callback` y `https://<subdominio-exacto>/reset-password`. Sin `*`, sin `http://`, sin rutas genéricas.
2. **No cambiar la Site URL** mientras la preview Netlify siga en uso: los enlaces de confirmación de alta irían a la Site URL. Decidir antes qué cliente es el principal.
3. **Rollback:** retirar esas dos entradas. No afecta a datos ni migraciones.

## 5. Seguridad del esquema (lectura, 23/10)

| Control | Resultado |
|---|---|
| RLS | 90/90 tablas públicas con RLS; 87 con FORCE. Sin FORCE: `workspaces`, `profiles` y `workspace_members` (FORCE solo afecta al propietario de la tabla, no a `anon`/`authenticated`) |
| Acceso directo PostgREST de `authenticated` | Solo 3 tablas: `workspaces` (SELECT, miembro), `workspace_members` (SELECT, uno mismo o admin), `profiles` (SELECT de uno mismo o de quien comparte workspace; INSERT/UPDATE solo de la propia fila; `workspace_id` debe ser una membresía). El resto: 0 grants, solo RPC |
| `anon` | 0 tablas. Una función ejecutable: `set_updated_at()`, de tipo trigger (PostgreSQL no permite invocarla fuera de un trigger): INFO |
| SECURITY DEFINER | 266 funciones; **0 sin `search_path` fijado**; auditoría previa: las que ejecuta `authenticated` autorizan en su cuerpo o delegan en despachadores que autorizan |
| Storage | 2 buckets privados; 5 políticas. Lectura directa por JWT de usuario vigente hasta aplicar 88 (defecto P0 de CDN conocido): por eso el contenido está OFF |
| Usuarios | 11: 10 sintéticos y **1 no sintético** (creado 19/10), fuera de la cohorte. Decisión del propietario |

## 6. Riesgos y decisiones pendientes

- **R1 CERRADO (23/10):** registro público desactivado en el panel con autorización del propietario. Verificado: el endpoint público devuelve `disable_signup=true` y el resto de ajustes no cambia; un alta sintética responde 422 sin crear usuario (11 usuarios antes y después); un usuario sintético existente sigue iniciando sesión (200) y su sesión se cerró (logout global 204). **Rollback:** reactivar "Allow new users to sign up".
- **R2 (P0, conocido):** Storage 88 sin aplicar: contenido OFF hasta que se acepte (W4 + ACK + autorización + ensayo alojado).
- **R3:** sin backups en el plan Free; restauración solo probada en CI desechable.
- **R4:** la cuenta no sintética.

## 7. Pruebas que Work debe ejecutar desde el subdominio nuevo (cuentas sintéticas, staging)

1. Anónimo: páginas → login; APIs 401; sin datos.
2. Owner A (cohorte): login, panel, cliente, borrador de factura y recarga: persistencia.
3. Owner B: positivo propio. Después, B contra los ids de A en lectura y modificación: 404 `not_found` sin datos.
4. Miembro suspendido de A y usuario fuera de cohorte: sin capacidades.
5. Origen cruzado: una mutación con `Origin` distinto: rechazada.
6. Cookies: `Secure`, `HttpOnly` donde aplique y `SameSite`. La sesión no sobrevive a un cierre de sesión.
7. Recuperación de contraseña: el enlace vuelve **solo** al origen exacto (tras añadir las Redirect URLs).

W5 prepara y revoca las identidades sintéticas por canal privado y verifica en la base cada efecto.

**Estado de cumplimiento:**
- §1, §3 y §5: verificados.
- §4 Site URL / Redirects y §7: **NOT_RUN** hasta que exista el origen exacto y se apruebe el cambio de Auth.

## 8. Clasificación de hallazgos (23/10)

| Hallazgo | Clase | Evidencia y decisión |
|---|---|---|
| Lectura directa de bytes de Storage por JWT y caché de CDN tras revocar | **CONFIRMED_VULNERABILITY** (P0, conocida) | Sonda alojada 19/10. Mitigado: contenido OFF. Corrección: #179/88, ensayo desechable PASS; pendiente W4 + ACK + autorización + ensayo alojado |
| Sin backups ni PITR (plan Free) | **CONFIGURATION_RISK** | `SUPABASE_RECOVERY_PLAN.md`; backup alojado BLOCKED hasta decisión |
| Registro público abierto | **CONFIGURATION_RISK: CERRADO 23/10** | `disable_signup=true` verificado |
| 1 cuenta no sintética con sesiones en staging | **CONFIGURATION_RISK** | Fuera de la cohorte; decisión del propietario |
| Protección de contraseñas filtradas | **CONFIGURATION_RISK** (depende del plan) | Solo en Pro; sin gasto no se activa |
| 161 `SECURITY DEFINER` ejecutables por `authenticated` (advisor) | **EXPECTED_DENY / REQUIRES_REVIEW** | Diseño RPC-only: 161/161 alcanzan una guarda; `search_path` fijado en las 266. W4 debe revisar la lógica |
| 61 tablas con RLS y sin política (advisor) | **EXPECTED_DENY** | 0 grants a `anon`/`authenticated`: acceso solo por RPC |
| `set_updated_at()` ejecutable por `anon` | **EXPECTED_DENY** | Función trigger, no invocable directamente |
| `workspaces`/`profiles`/`workspace_members` sin FORCE RLS | **REQUIRES_REVIEW** (bajo) | FORCE solo afecta al propietario de la tabla; las rutas `anon`/`authenticated` están bajo RLS |
| FK simple `installation_contact_id → contacts` | **REQUIRES_REVIEW** (bajo) | Protegida por trigger; propuesta de FK compuesta en `SCHEMA_INTEGRITY_AUDIT.md` |
| 28 `auth_rls_initplan`, 1 índice duplicado, 196 FK sin índice, 73 índices sin uso | **PERFORMANCE** | Propuestas forward-only no aplicadas |

## 9. Estado de capacidades

| Capacidad | IMPLEMENTED | TESTED_LOCAL (desechable) | TESTED_HOSTED | ACCEPTED | BLOCKED por |
|---|---|---|---|---|---|
| Auth email + confirmación, registro cerrado | Sí | Sí | **Sí** (ajustes y negativo 422, 23/10) | No | Revisión W4 |
| Admisión de staging y cohorte | Sí | Sí | Sí, en Netlify (`6ad78f6c`, 20/10) | No | Nuevo origen EasyPanel |
| Aislamiento A/B (RLS + RPC) | Sí | Sí (4042 backend + 116 UI, f9aa) | Parcial (API A/B en Netlify `a9e977ad`, 20/10) | No | W4; repetir en EasyPanel |
| Revocación con JWT vigente | Sí | Sí | Parcial (suspendido 403, 20/10) | No | W4 |
| Idempotencia de comandos y CAS | Sí | Sí | No | No | — |
| Numeración fiscal atómica | Sí | Sí | No | No | — |
| Onboarding idempotente (`provision_workspace`) | Sí | Parcial | No | No | Decisión W1 (#183/#184) y W4 |
| Documentos privados (Storage) | Propuesta 88 | Sí (#179) | No | No | P0: W4 + ACK + autorización + ensayo alojado |
| Backups y restore | Piezas | Reconstrucción en CI | No | No | Decisión de destino y RPO/RTO |
| Asistente IA live | Adaptadores | Evaluación | No | No | Presupuesto 0, issue #10, W3/W4 |
| Redirect URLs del subdominio EasyPanel | — | — | — | — | Origen HTTPS exacto de Work y aprobación |
