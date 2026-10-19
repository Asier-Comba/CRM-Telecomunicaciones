# W5 Cloud — handoff de infraestructura y seguridad (19/10/2026)

Estado: **ACEPTACIÓN BLOQUEADA. NO COMPLETE, NO RELEASE.** Nada de este documento
cambia el staging hospedado: en esta sesión no se aplicó ninguna migración, no se
modificó Auth, Storage, políticas ni datos, y no se desplegó nada.

## 1. Accesos comprobados en esta sesión

| Servicio | Resultado real | Consecuencia |
|---|---|---|
| GitHub (MCP + API pública) | Lectura/escritura en `Asier-Comba/CRM-Telecomunicaciones`. Repositorio **público**. | Ramas/PR propias posibles. Los propietarios deben revisar la visibilidad. |
| Supabase MCP | Autenticado en **otra organización**: sólo ve `CRM-BALONCESTO` (`iyiuiukdcdnlanjzoyhf`). `get_project`/`execute_sql` sobre `zgwotxnyqzfuzcnmgvtn` → `You do not have permission`. | **BLOCKER**: no se pudo reverificar el staging ni reproducir en hospedado. No se tocó el otro proyecto. |
| Vercel MCP | Sin equipos; cuenta personal con 2 proyectos ajenos al CRM. | No existe proyecto de frontend para CRM. |
| Netlify MCP | 3 sitios personales ajenos al CRM. | No existe hosting CRM. |
| Hostinger VPS / n8n / SMTP / IA | Sin conector ni credenciales en esta sesión. | No verificable; sin cambios. |

El estado de Supabase que sigue procede del handoff del 19/10
(`issue 67#issuecomment-6271377355`) y **no se ha podido reconfirmar**:
86 migraciones, 90 tablas con RLS, 319 funciones, 2 buckets privados, plan FREE
(sin backups programados/PITR, sin Smart CDN ni purga de caché), SSL enforcement
OFF, Auth site URL `http://localhost:3000`, 10 cuentas sintéticas deshabilitadas.

## 2. P0 — Storage entrega bytes privados tras revocar

### Causa
1. La política `telecom_v1_document_object_read` (y `document_content_v1_pending_read`)
   permite a `authenticated` leer los bytes **directamente** desde
   `/storage/v1/object[/authenticated]/telecom-documents/...` con su JWT.
2. Esa ruta pasa por la CDN de Storage, que en buckets privados cachea **por
   usuario**. Un HIT no vuelve a evaluar RLS en el origen y revocar un
   token/permiso **no purga** la entrada. Corrección 19/10 17:15 UTC: el objeto
   del fallo tiene `cacheControl = no-cache` en sus metadatos (comprobado en
   `storage.objects`) y aun así hubo HIT, así que ajustar `cacheControl` en la
   subida **no** basta para cerrar la fuga.
3. Evidencia hospedada (handoff): mismo JWT + misma URL tras suspender/degradar
   → HTTP 200, 1013 bytes, `cf-cache-status: HIT`, mientras el helper SQL ya
   devolvía `false`. JWT nuevo → 400. Query única → 400/DYNAMIC (origen).
   Conclusión: el origen deniega correctamente; la fuga es la caché de borde
   sirviendo una respuesta autorizada antigua. Ventana máxima ≈ min(TTL de
   caché del objeto, caducidad restante del JWT, 3600 s).
4. Por qué CI no lo vio: Supabase local (CLI) no tiene CDN; los PASS locales de
   revocación son ciertos para el origen y no prueban el borde hospedado.

La ruta de la aplicación (`POST /api/document/v1/content/download`) **no** es la
fuente del fallo: llama a `document_content_v1_manifest` con el JWT del usuario
antes y después de leer los bytes, por lo que un usuario revocado recibe
`access_denied` aunque Storage devolviera un HIT. El problema es que el mismo
JWT puede saltarse el proxy y pedir los bytes a Storage directamente.

### Corrección propuesta (PR propia, borrador, requiere ACK)
Rama `w5/storage-server-fetch-proposal-v1`:
- Migración `20261020090000_document_object_read_server_fetch.sql`: elimina las
  dos políticas SELECT de `authenticated` sobre `telecom-documents`. Ninguna
  respuesta autorizada para un JWT de usuario vuelve a generarse ni cachearse.
  Insert (subida) y limpieza caducada sin cambios.
- `src/lib/server/document-object-fetch-v1.ts`: lectura de bytes sólo servidor,
  un bucket, sólo GET, ruta validada `uuid/documents/uuid/uuid`, construida a
  partir del manifiesto admitido por RPC; falla cerrado sin clave.
- Los factories de contenido y mantenimiento usan ese fetch; se conserva la
  re-comprobación del manifiesto después de la descarga.

Por qué no basta cache-busting ni `cacheControl: 0`: el atacante controla su URL
y cabeceras; y la CDN puede seguir sirviendo entradas ya creadas. Purga manual y
Smart CDN requieren plan Pro. La única garantía es que **ningún JWT de usuario
obtenga bytes de documentos fuera del proxy que reautoriza**.

Contrato compartido afectado (por eso es propuesta y no se aplica):
- `SUPABASE_SERVICE_ROLE_KEY` pasa de `reserved_future` a consumidor de
  ejecución acotado (`docs/master/contracts/product-environment.json`, regenerar
  `infra/platform/environment-manifest.json` en CI Linux).
- Scripts que hoy esperan lectura directa 200 del propietario y deben pasar a
  esperar denegación + lectura por proxy: `scripts/security/supabase-local/document-acceptance.mjs`,
  `billing-artifact-acceptance.mjs`, `acceptance.mjs`, `scripts/platform/recovery.mjs`.
- Pins de 86 migraciones → 87 (manifiestos W5).
- Residual tras desplegarla: entradas ya cacheadas antes del cambio caducan
  como máximo con su TTL/JWT (≤ 1 h); con Pro, purgar el bucket tras aplicar.

### Prueba exigida antes de aceptar
`scripts/security/hosted/storage-revocation-probe.mjs` (rama
`w5/cloud-p0-storage-revocation-v1`) ejecuta: autorizado, usuario ajeno, empresa
ajena, anónimo, URL pública, firma de URL por ajenos; revoca mediante un comando
del operador; repite **el mismo JWT y la misma URL** durante 90 s (cada 5 s) por
`/object/authenticated` y `/object` (SDK), firma de URL con el JWT revocado y
login nuevo. Cualquier 2xx con los bytes esperados se marca `leak`. Sólo
staging exclusivo (`PROBE_ALLOWED_REF`), sin imprimir tokens ni bytes.
Resultado esperado hoy (sin la propuesta): FAIL con leaks. Con la propuesta:
también debe fallar la lectura directa del autorizado en fase A — hay que
ajustar la expectativa a `deny` para todos y validar los bytes por el proxy
desplegado. **Ninguno se ha ejecutado en hospedado en esta sesión** (sin acceso).

## 3. P1 — Conflictos HTTP que agotan tiempo

Hechos de código verificados:
- `product_v1_begin_command` usa `pg_advisory_xact_lock` (transaccional, sin
  fugas de sesión entre conexiones del pool) y para changed-intent lanza
  `40001` inmediatamente tras comparar el HMAC. Stale-version lanza `40001`
  tras `for update`. Ningún bloqueo de sesión en las 86 migraciones.
- PostgREST mapea todo `40*` a HTTP **500** (no 409): el cliente debe leer
  `code` del cuerpo. La capa de aplicación ya traduce `40001` → `conflict`.
- `@supabase/postgrest-js` 2.105.3 (versión del lockfile) sólo reintenta
  GET/HEAD ante 503/520; los POST de RPC **no** se reintentan. Descartado.
- Un `statement_timeout` del rol habría devuelto `57014` antes de 20/90 s; no
  hubo respuesta alguna → el bloqueo está en transporte (cliente, borde o pool
  de PostgREST), no en la lógica SQL, que respondió `40001` por SQL directo.

**Causa raíz confirmada (19/10, 17:05 UTC, sonda hospedada):** PostgREST 14.18
(versión hospedada) trata `40001` lanzado por una función como fallo transitorio
y **reintenta la transacción indefinidamente** (fallo conocido de PostgREST 14,
corregido en 16; guía oficial de Supabase "SQLSTATE 40001 in an RPC function
causes infinite retries"). Evidencia: create 588 ms y replay 73 ms; el primer
changed-intent no recibe cabeceras en 30 s; todas las peticiones posteriores,
incluido el replay, también se cuelgan; `pg_stat_activity` muestra backends
`authenticator` en ciclo BEGIN→RPC→ABORT y los logs ~6000 `product_conflict`/min
sostenidos tras terminar la sonda. Afecta a **todas** las RPC que usan `40001`
como conflicto de negocio (product, billing, team, portfolio, document, inbox,
notifications, settings, artifacts, importjob…).
Corrección necesaria (contrato compartido W1/W2): sustituir `errcode='40001'`
en los conflictos de negocio por un código no reintentable, p. ej.
`raise sqlstate 'PT409'` (HTTP 409) o un código propio de clase `P0`, y adaptar
`dbError` en los servicios. No reintentos en cliente.

`scripts/security/hosted/http-conflict-probe.mjs` mide por petición tiempo a
cabeceras, total, estado, SQLSTATE, `cf-ray` y `sb-request-id`, consume siempre
el cuerpo, envía cada escritura una sola vez (sin reintentos), en secuencia y en
paralelo, y comprueba efecto único. Crea un cliente sintético por ejecución.
Con `sb-request-id` se pueden cruzar los logs de API/Postgres del proyecto.

## 4. Seguridad y CI

- `npm audit` (lockfile, 19/10): 5 HIGH, todos la misma cadena de desarrollo
  `braces` → `micromatch` → `fast-glob` → `@next/eslint-plugin-next` →
  `eslint-config-next` (GHSA-vfj7-8cjw-p6xm, issue 29). `--omit=dev`: **0**.
  No afecta al runtime; el gate sigue en FAIL y no se relaja. Arreglo sugerido:
  `overrides` de `braces` cuando exista versión parcheada; no degradar ESLint.
- CI de la fuente PR155 (`da468c5`): CI 39272139305 FAIL (audit), Enterprise
  39272138954 FAIL (`ENV_INVENTORY_DRIFT`, scans vendor), History 39272138854
  FAIL; Supabase local 39272139169 SUCCESS. Sin cambios en esta sesión.
- `ENV_INVENTORY_DRIFT`: regenerar el manifiesto en Windows produce un diff
  distinto (p. ej. omite `AI_PROVIDER`); el manifiesto debe generarse y
  comprobarse sólo en Linux/CI. Cuidado: ejecutar `scripts/platform/inventory.mjs`
  directamente **reescribe** el manifiesto.
- Configuración hospedada pendiente (requiere acceso a la organización
  CRM TELECOM): SSL enforcement ON, Site URL/redirects de staging, JWT expiry
  ≤ 900 s (acota la ventana de cualquier caché por JWT), leaked-password
  protection, CAPTCHA, desactivar auto-exposición de esquemas nuevos,
  restricciones de red, SMTP propio. Ninguno aplicado.

## 5. Cloud staging: existente vs. pendiente

| Componente | Estado |
|---|---|
| Supabase staging (`zgwotxnyqzfuzcnmgvtn`, eu-west-2) | Existe (según handoff). Sin acceso en esta sesión. |
| Backups/PITR | **No** (FREE). Recuperación sólo ensayada en CI desechable. |
| Frontend Next.js | **No desplegado.** Sin proyecto Vercel/Netlify para CRM. |
| APIs/workers persistentes | **No.** Sin VPS verificado. |
| n8n, correo, IA | **No**; permanecen desactivados. |
| URL de staging | **Ninguna existe.** |

Costes que requieren autorización del propietario (no se ha incurrido en ninguno):
- Supabase Pro (backups diarios, PITR opcional, Smart CDN/purga, branching).
- Hosting Next.js con acceso restringido: Vercel Pro (uso comercial; Hobby no
  es apto) o equivalente; protección de despliegues para URL privada.
- VPS/worker persistente si la arquitectura lo exige (Hostinger u otro).

## 6. Accesos necesarios para continuar sin ordenadores personales

1. Reconectar el conector Supabase a la organización **CRM TELECOM**
   (`oiwyvaihoxfamgieaeno`) o invitar a la cuenta del conector.
2. Para CI hospedado: secretos de entorno protegido `staging` en GitHub
   (`PROBE_PUBLISHABLE_KEY`, fixture sintético cifrado) y un comando de
   revocación auditado; nunca en Git ni en el chat.
3. Decisión y alta de hosting frontend + credencial mínima de despliegue en un
   entorno protegido de GitHub Actions.
4. Decisión sobre plan Supabase y VPS.

## 7. Instrucciones para el Work integrador

- No se ha desplegado ningún SHA. La selección de versión es vuestra; se ve
  actividad en `codex/product-integration-20261019` (`aa4a11e`), aún sin fijar.
- Necesito ACK sobre el cambio de contrato de Storage (sección 2): los
  documentos sólo se servirán por `POST /api/document/v1/content/download`
  (y `billing/v1/private-pdf`); cualquier consumidor que lea Storage directo
  con el JWT del usuario dejará de funcionar a propósito.
- `getSignedDocumentUrl` (`src/lib/supabase-queries.ts`) firma URLs desde el
  navegador; confirmad que no se usa con `telecom-documents` (las URL firmadas
  también se cachean y revocar no purga).

## 8. Línea base hospedada (19/10/2026, 17:05–17:23 UTC) — autorizada por el propietario

Staging `zgwotxnyqzfuzcnmgvtn` verificado antes: 86 migraciones, 90/90 RLS, 319
funciones, 10 usuarios sintéticos baneados, 0 sesiones, 1 objeto, 1 fila de clave.
Sólo cuentas sintéticas `w5p0-20261019-*@example.invalid`; contraseñas generadas
y hasheadas en local (sólo el hash bcrypt viajó a SQL), rotadas a valores
desconocidos y cuentas re-baneadas al terminar.

**P1 HTTP — FAIL reproducido, causa confirmada** (`evidence/hosted-http-conflict-baseline-20261019.json`):
create 588 ms y replay exacto 73 ms PASS; changed-intent y stale-version
(secuencial y 4+4 en paralelo) sin cabeceras en 30 s; el replay posterior
también colgado. PostgREST 14.18 entró en bucle de reintentos: ~6000
`product_conflict`/min sostenidos hasta terminar, con autorización, los 10
backends `authenticator` (17:18:50 último error). Efecto de negocio: 1 cliente
sintético (sin duplicados de la escritura original).

**P0 Storage — FAIL reproducido** (`evidence/hosted-storage-revocation-baseline-20261019.json`):
55 comprobaciones, 19 PASS, 36 FAIL, **36 leaks**. Antes de revocar: owner A
200 con bytes correctos; viewer A, miembro A+B, owner B, anónimo, URL pública y
firma por ajenos → 400. Tras suspender la membresía del owner (17:21:49):
mismo JWT + misma URL → 200 con los bytes privados en las 36 lecturas durante
90 s por `/object/authenticated` y `/object` (`cf-cache-status: HIT`,
`cache-control: no-cache`). Firma con el JWT revocado → 400; login nuevo → 400.
Dato adicional: la primera lectura con un JWT recién emitido ya fue HIT, por lo
que el borde guarda los bytes con independencia del token y sólo la decisión de
admisión parece depender del token. Duración total de la ventana no medida (≥ 90 s).

Estado final: membresía restaurada a `active`, 10/10 cuentas baneadas, 0
sesiones, 0 refresh tokens vivos, 0 backends colgados, 86 migraciones.
