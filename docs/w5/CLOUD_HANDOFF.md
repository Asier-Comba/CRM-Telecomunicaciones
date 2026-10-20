# W5 Cloud — handoff único (actualizado 20/10/2026)

**RELEASE NOT_ACCEPTED. HITO A: recorrido núcleo HOSTED_TESTED el 20/10 (ver §10); faltan voz real, negativos de cohorte y revisión W4. Producción OFF.**

Indicadores: IMPLEMENTED · INTEGRATED · LOCAL_TESTED · HOSTED_TESTED · BLOCKED · NOT_VERIFIED · ACCEPTED.
Una prueba local nunca se presenta como HOSTED_TESTED.

## 1. GitHub (20/10, ~11:40 UTC)

| Rama / PR | HEAD | Estado |
|---|---|---|
| Integrador `codex/product-integration-20261019` (PR156) | `1f49a834` | Publicado. Contiene migración 87 y mappers PT409. Asier Work tiene `d3e06db` y unidad 14 **sin publicar** |
| W5 `w5/native-profile-87-v1` | `a1ab8020` | Perfil 87 exacto. LOCAL_TESTED 13/13. PR pendiente (conector GitHub caído) |
| W5 `w5/netlify-reproducible-v1` | `7c2a276e` | `netlify.toml` + workflow de deploy por SHA + runbook. IMPLEMENTED, no ejecutado |
| W5 `w5/storage-server-fetch-v2` | `6016e094` | Propuesta P0 Storage rebasada, migración forward-only 88. Typecheck PASS. PROPUESTA |
| W5 `w5/hosted-staging-preview-v1` (PR159) | `2f1b6dd7` | Su `mode.ts` permisivo queda **sustituido** por la admisión del integrador; PT409 ya está integrado en PR156 |
| W5 `w5/storage-server-fetch-proposal-v1` (PR158) | `be71f30e` | Superada por v2 (su migración ordenaba antes de la 87) |

## 2. Supabase `crm-telecom-staging` (`zgwotxnyqzfuzcnmgvtn`, eu-west-2, PG17, FREE)

- 87 migraciones. Ledger alojado comparado byte a byte con PR156 `1f49a834`: **87/87 SHA-256 iguales, mismo orden lexicográfico, sin extras ni faltantes**. HOSTED_TESTED (solo lectura).
- 90/90 tablas con RLS, 319 funciones públicas, 2 buckets privados.
- P1 conflictos HTTP: **CORREGIDO en staging** (migración 87, PT409). Sonda 15/15 (409 en 85–199 ms, efecto único). HOSTED_TESTED.
- Datos: la demo usa solo cuentas sintéticas `@example.invalid`. Cualquier dato no sintético se gestiona con el propietario fuera de este repositorio.
- Backups: plan FREE, sin backups programados ni PITR. Recuperación ensayada solo en CI desechable. NOT_VERIFIED hospedado.

### Auditoría de avisos (20/10, solo lectura, sin cambios)

| Aviso | Resultado | Acción |
|---|---|---|
| 161 WARN SECURITY DEFINER ejecutables por `authenticated` | 161/161 con `search_path` fijado; 0 ejecutables por `anon`/`public`; 75 autorizan en su cuerpo (`auth.uid()`/assert/42501); 86 son envoltorios `(uuid,jsonb)` que delegan en 14 despachadores que autorizan | Ninguna sin ruta de autorización por análisis estático. No revocar en masa. W4 debe revisar la lógica (estático ≠ correcto) |
| 61 INFO RLS sin política | 0 privilegios de tabla para `authenticated` y `anon` | Cerradas por diseño, solo vía RPC autorizadas. Sin acción |
| 1 WARN contraseñas filtradas | Solo disponible en plan Pro | Decisión de coste del propietario. En Free: subir longitud mínima y tipos de carácter |

## 3. Netlify

| Elemento | Valor |
|---|---|
| Proyecto | `crm-telecom-staging-preview` (equipo del propietario, plan **Free**, 1 miembro) |
| Visibilidad | Privada, login de equipo en todos los deploys |
| URL | https://crm-telecom-staging-preview.netlify.app |
| Deploy activo | `6ad6693262c82905fcf6bc40` = `2f1b6dd7` + `netlify.toml`, modo hospedado permisivo de #159 |
| Acceso anónimo | 401 en 5 rutas (comprobado 19/10) |

**Diagnóstico del acceso (caso A/B):** en planes Free/Personal un proyecto privado solo lo ve el **propietario del equipo**. Cualquier otra cuenta Netlify (otro tester, otra cuenta del propietario) recibe la página de Edge Access "This site is private / Page not found / iniciar sesión con otra cuenta" antes del CRM. La sesión de equipo caduca a ~1 h (401, recargar). No es un fallo del deploy ni de Supabase.

Una acción humana por escenario:
- Propietario: entrar en app.netlify.com con la cuenta dueña del equipo y abrir la URL.
- Otros testers: requiere Netlify Pro (coste por miembro, aprobación del propietario). No hacer pública la preview ni compartir sesiones.

Reproducibilidad: rama `w5/netlify-reproducible-v1` (workflow manual por SHA, entorno protegido `staging`, smoke de privacidad, registro de deploy). Requiere que el propietario cree el entorno `staging` con `NETLIFY_AUTH_TOKEN` y `NETLIFY_SITE_ID`. El plugin Next.js no está fijado por versión (requiere tocar `package.json`, ámbito del integrador).

## 4. Admisión de staging

La admisión del integrador (`product-staging-admission-v1.ts`, en `1f49a834`) es la correcta: proyecto y origen exactos, `APP_ENV=staging`, cohorte de UUID validada con `getUser()` de servidor, solo cuentas `@example.invalid` confirmadas y no anónimas, cookie `secure`, cliente nulo si no admite. **Revisión W5: sin objeciones.** Pendiente: W4 y la unidad 14 (503 no-store antes del SDK) sin publicar.

Configuración necesaria en Netlify (nombres, sin valores): `APP_ENV=staging`, `PRODUCT_STAGING_INTEGRATION=true`, `PRODUCT_STAGING_USER_IDS` (UUID de cuentas sintéticas existentes), `PRODUCT_V1_ENABLED=true`, `PRODUCT_V1_ORIGIN`. Retirar `PLATFORM_TARGET` (#159).

## 5. Perfil de migraciones 87 (REQUEST 6289026792)

Nuevo `loadOwnedConsumerProfile87V1` + manifiesto `owned-consumer-migrations-87-v1.json` (blob, SHA-256, fuente y versión alojada). Admite exactamente los 87 nombres con bytes fijados; rechaza extras desconocidos (incluida la futura migración Storage), faltantes, bytes modificados y CRLF que no mapee. Cargador y manifiesto 85/86 **byte-idénticos**; los modos `directory`, `delivered_grants_86` y `require_grants_86` siguen rechazando un checkout 87. Consumidor con modo opt-in `require_profile_87` y workflow W5 propio. Local 13/13 PASS. Ejecución nativa física: NOT_RUN (necesita PR/CI).

## 6. Defectos

| ID | Defecto | Estado |
|---|---|---|
| P0 | Storage: revocación de lectura de documentos privados | ABIERTO (detalles fuera del repositorio público). Propuesta v2 lista; contenido de documentos **desactivado** en la preview |
| P0 | Acceso Netlify para testers distintos del propietario | BLOCKED por plan (decisión de coste) |
| P1 | Conflictos HTTP 40001 en bucle | CORREGIDO en staging (HOSTED_TESTED) |
| P1 | CI: 5 HIGH (cadena de lint de desarrollo, 0 en runtime), escaneo de historial, manifiesto de entorno | ABIERTO |
| P1 | Preview con modo permisivo #159 | Pendiente de redeploy con la admisión del integrador |

## 7. Facturación PRO y módulos

No verificado en la nube por W5 (requiere login E2E). Ver PR156/#160/#161 y QA de Oier. Voz real: NOT_VERIFIED.

## 8. Decisiones del propietario

1. ¿Activar en la preview la admisión estricta del integrador con cohorte sintética **antes** de la revisión W4? Es más segura que el modo #159 que está desplegado hoy.
2. ¿Netlify Pro para testers adicionales y/o Supabase Pro (backups, PITR, contraseñas filtradas, purga CDN)?
3. Higiene de datos de staging (tratado en privado con el propietario).
4. Crear el entorno GitHub `staging` con los dos secretos de Netlify.
5. Reconectar el conector GitHub de esta sesión para abrir PR y publicar en #67.

## 9. Próxima unidad W5

Con la admisión aprobada: desplegar el SHA candidato del integrador por el workflow, crear la cohorte sintética y ejecutar el recorrido NETLIFY → LOGIN → CLIENTE → FACTURA (borrador) → RECARGA → RECUPERACIÓN, registrando deploy ID, SHA, usuario sintético, API y recibos.

## 10. Demo alojada (20/10/2026, ~12:20–12:27 UTC) — autorizada por el propietario

| Campo | Valor |
|---|---|
| URL | https://crm-telecom-staging-preview.netlify.app |
| Deploy ID | `6ad75c93ac4914f9005f4767` |
| Fuente | `e42cfd59615a284bf26a758c4078c299bed39290` = integrador `3b80c50d` + corrección W5 de `NODE_ENV` en la admisión (rama `w5/edge-admission-node-env-v1`), más `netlify.toml` de `w5/netlify-reproducible-v1`; 1.867 ficheros verificados byte a byte |
| Admisión | Estricta del integrador: `APP_ENV=staging`, `PRODUCT_STAGING_INTEGRATION=true`, cohorte de **una** cuenta sintética existente. Modo de #159 retirado |
| Acceso anónimo | 401 en 7 rutas |
| Usuario | owner sintético de la empresa "W5 P0 Synthetic A" (`@example.invalid`) |

| Paso | Resultado | Evidencia |
|---|---|---|
| Netlify → login CRM | PASS | Edge Access superado con la cuenta propietaria; "Sesión iniciada" por Supabase Auth |
| Dashboard | PASS | Vista integrada servida desde Supabase |
| Listado de clientes | PASS | 11 clientes leídos del servidor (igual que la base) |
| Crear cliente "Bilbao Telecom Demo SL" | PASS | Supabase: fila versión 1, 1 recibo, 1 evento de auditoría |
| Recargar → Customer360 | PASS | Cliente recuperado del servidor |
| Factura por texto | PASS | Base 300,00 €, IVA 63,00 €, total 363,00 €, concepto "instalación de fibra", vencimiento +15 días, cliente resuelto, sin emisión |
| Guardar borrador | PASS | Supabase: `billing_invoices` `draft`, sin número reservado, 30000/6300/36300 céntimos, 1 línea, sin duplicado |
| Recargar → borrador recuperado | PASS | Lista: "Borrador A · 2026-10-20 · 363,00 €" |
| Dictado por voz | NOT_VERIFIED | Botón presente; micrófono real no probado |
| Negativo: misma empresa, fuera de cohorte (viewer) | PASS | Supabase autentica; proxy redirige a `/login?error=staging_access_denied`; páginas privadas redirigen; APIs producto y facturación 403 `access_denied` |
| Negativo: owner de otra empresa (B), fuera de cohorte | PASS | Login confirmado en Supabase; enlace directo al Customer360 de la empresa A redirige; APIs 403 `access_denied` |

Defectos observados para el integrador:
1. **Admisión en Netlify Edge** (corregido en `e42cfd59`, pendiente de ACK): el proxy corre como función Edge (Deno); su `process.env` no contiene `NODE_ENV` y Netlify no permite definirlo, así que la admisión era `invalid` y el sitio respondía 503 incluso en `/login`.
2. Textos de UI: el aviso "Integración local · … base local" aparece también en staging.
3. Dashboard muestra 0 en todo con el filtro "Mi actividad" aunque hay 11 clientes (filtro por defecto confuso para una demo).

### Mapa de módulos sobre el deploy `6ad75c93` (20/10, lectura con owner de cohorte)

| Módulo | Estado alojado |
|---|---|
| Dashboard, Clientes, Customer360, Facturación | HOSTED_TESTED (lectura y escritura, §10) |
| Cartera, Contratos, Servicios, Portabilidades, SIM/eSIM, Incidencias, Equipos, Oportunidades, Calendario, Centro de atención, Inbox, Configuración, Informes | Cargan contra Supabase sin errores; 0 registros en la empresa sintética. Escritura NOT_RUN |
| Catálogo Telecom | HOSTED_TESTED escritura: operador "Operador Demo Fibra" y tarifa "Fibra 300 Mb Empresa" (fibra) creados por la UI y persistidos (Supabase: activos). **Versiones de tarifa: el backend tiene `plan_version.create` pero ninguna pantalla lo expone en este SHA** → no se pueden crear precios desde la UI |
| Documentos | Metadatos sí; subida/descarga deshabilitadas (P0 Storage) |
| Asistente IA | Solo lectura, "en preparación" (escrituras IA OFF) |

Observaciones UX para el integrador: la página de login no muestra mensaje para `error=staging_access_denied`; el aviso "Integración local" aparece en staging.

Siguiente unidad W5: contrato manual, servicio y línea para "Bilbao Telecom Demo" por la UI, con escritura + recarga por módulo (pendiente: la ventana del navegador estaba minimizada). Para el integrador: pantalla de alta de versión de tarifa; el sitio escribe en el portapapeles del usuario al confirmar altas.

## 11. Ventana QA A/B multiempresa sobre el deploy `6ad78f6c` (20/10/2026, ~16:00–16:17 UTC)

| Campo | Valor |
|---|---|
| Deploy ID | `6ad78f6c810c781fba4f5880` |
| Fuente / árbol | `a9e977adf90b1e83cded23fb54aefc696839d014` / `ac48598bffd8a528919f63f2bcad1d07365c775d` (byte a byte, su propio `netlify.toml`) |
| Admisión | Estricta del integrador, cohorte de 3 cuentas sintéticas existentes: owner A, owner B, admin A suspendido (UUIDs solo en Netlify, `uuid_csv` válido) |
| Cuentas | Solo `@example.invalid`; contraseñas de un solo uso generadas en local, nunca en GitHub; al cerrar: rebaneadas, contraseña aleatoria y sesiones borradas |

| # | Prueba | Resultado | Evidencia |
|---|---|---|---|
| 1 | Positivo A (owner A) | PASS | Lectura de su cliente y de su borrador de factura: 200 |
| 2 | Positivo B (owner B) | PASS | Alta de cliente "Donostia Fibra Demo SL" en la empresa B: 200 con recibo; relectura 200 |
| 3 | B lee cliente de A | PASS | 404 `not_found`, cuerpo sin datos; la página directa del cliente de A no muestra su nombre |
| 4 | B lee factura de A | PASS | 404 `not_found`, sin datos |
| 5 | B modifica cliente de A | PASS | 404 `not_found`; Supabase: cliente de A sigue en versión 1, 1 evento de auditoría, 0 filas alteradas |
| 6 | Miembro suspendido de A (en cohorte) | PASS | Login real confirmado en Supabase; lectura de cliente y factura de A, modificación y alta: todas 403 `access_denied`; 0 filas creadas |
| 7 | Fuera de cohorte (viewer de A) | PASS | Login real confirmado; APIs 403 `access_denied`; páginas → `/login?error=staging_access_denied`. **No prueba aislamiento multiempresa** (eso lo prueban 3–5) |
| 8 | Anónimo en el CRM (sesión Netlify, sin sesión CRM) | PASS | APIs 401 `access_denied`; páginas redirigen a login |
| 9 | Anónimo en Netlify | PASS | 401 en 7 rutas del sitio y 3 del permalink del deploy |
| 10 | Fuga en errores | PASS | Todas las denegaciones devuelven solo `{ok:false,error:<código>}`; sin nombres, ids ajenos, SQL ni trazas |

Límites: pruebas por API del mismo origen y lectura de páginas, no recorrido visual completo de B (la ventana del navegador no pintaba). Oier no puede repetirla de forma independiente: en el plan Free de Netlify un proyecto privado solo lo ve el owner del equipo (decisión de coste del propietario). Tras la ventana solo queda habilitada la cuenta owner A para la demo del propietario.
