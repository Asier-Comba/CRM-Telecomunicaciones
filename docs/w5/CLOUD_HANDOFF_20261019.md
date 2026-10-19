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

## 2. P0 — Storage: revocación de lectura de documentos privados

Estado: **FAIL confirmado en staging hospedado (19/10/2026)**. Los detalles de
reproducción y la evidencia se retiran de este repositorio público hasta que
el repositorio sea privado o la corrección esté aplicada; los conserva W5 y se
comparten con los propietarios por un canal privado.

Corrección propuesta: PR borrador #158 (requiere ACK). Los bytes de documentos
privados sólo se sirven a través del proxy de la aplicación, que reautoriza
contra el estado actual de la base de datos en cada petición. Cambia contratos
compartidos (variable de entorno de servidor, scripts de aceptación, pins de
migraciones); detalle en la descripción de #158.

Aceptación: repetir la sonda `scripts/security/hosted/storage-revocation-probe.mjs`
con la corrección aplicada; debe dar 0 entregas indebidas.

## 3. P1 — Conflictos HTTP de concurrencia

Estado: **FAIL confirmado en staging hospedado (19/10/2026), causa raíz
identificada** en la interacción entre el código de error que usan las RPC para
los conflictos de negocio y la versión de PostgREST hospedada. Detalles
retirados de este repositorio público por el mismo motivo que el P0.

Corrección necesaria (contrato compartido W1/W2, requiere acuerdo): cambiar el
código de error de conflicto de negocio de las RPC por uno que el gateway no
trate como transitorio (propuesta concreta compartida por canal privado) y
adaptar el mapeo de errores de los servicios. Sin reintentos de cliente.

Aceptación: repetir `scripts/security/hosted/http-conflict-probe.mjs`; los
conflictos deben responder de forma acotada y con efecto único.

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

## 8. Línea base hospedada (19/10/2026)

Ejecutada con autorización del propietario, sólo con cuentas sintéticas. P0 y
P1 reproducidos. Evidencia retirada de este repositorio público. Estado final
del staging: membresías restauradas, 10/10 cuentas sintéticas deshabilitadas
con contraseñas rotadas, 0 sesiones, 0 refresh tokens vivos, 86 migraciones,
1 objeto; +1 cliente sintético conservado para auditoría.
