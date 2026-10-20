# Bootstrap comercial y revisión Supabase (W5, 21/10/2026)

Estados: **IMPLEMENTADO** (hay código), **PROBADO** (con evidencia y dónde), **BLOQUEADO** (causa), **CONFIG PENDIENTE** (solo falta una acción humana con nombres conocidos). Presupuesto adicional 0 €. **No se ha enviado correo, consumido IA, creado cuentas ni tocado DNS.** Variables solo por nombre (fuente: `infra/platform/environment-manifest.json`, 123 nombres, entornos LOCAL/DEV/STAGING/PROD).

## 1. Matriz por proveedor

| Pieza | Variables (nombres) | Estado real | Qué falta de verdad |
|---|---|---|---|
| Hosting staging | `APP_ENV`, `PRODUCT_V1_ORIGIN`, `PRODUCT_STAGING_*`, `NEXT_PUBLIC_SUPABASE_*` | IMPLEMENTADO + PROBADO alojado (Netlify Free, deploy `6ad78f6c`) | Acceso independiente de Oier: BLOQUEADO a 0 € (ver `FREE_HOSTING_EVALUATION.md`) |
| Dominio y SSL | — | SSL automático en `*.netlify.app` (PROBADO) | Dominio propio: BLOQUEADO (compra = gasto). Al tenerlo: DNS → Netlify, actualizar `PRODUCT_V1_ORIGIN`, `AUTH_SITE_URL` y `AUTH_REDIRECT_URLS` |
| Correo de Auth (confirmación, recuperación) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `AUTH_MAIL_FROM`, `AUTH_SITE_URL`, `AUTH_REDIRECT_URLS` | IMPLEMENTADO: `scripts/platform/hosted-bootstrap.mjs` traduce estas variables a la configuración de Supabase Auth (site URL, allow list, SMTP, sin autoconfirm, sin anónimos, MFA TOTP). PROBADO **solo en local con Mailpit** (job `auth-mail` SUCCESS) | CONFIG PENDIENTE: elegir proveedor SMTP con plan gratuito, verificar el dominio remitente (requiere dominio) y aplicar en staging con autorización |
| Correo comercial del CRM | `CRM_EMAIL_ENABLED`, `CRM_MAIL_FROM`, `CRM_MAIL_PROVIDER_REF`, `CRM_EMAIL_ALLOWLIST` | Solo **validación de configuración** (`product-environment-v1.ts`, `config.mjs`). **No existe adaptador de envío ni de Resend en `src/`** | **NO IMPLEMENTADO**: no basta con poner una clave. Hace falta un adaptador de servidor, cola/idempotencia, lista de permitidos y pruebas con sink, a cargo del integrador |
| OpenAI / IA | `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_ASSISTANT_MODEL`, `OPENAI_PROJECT_ID`, `AI_ENABLED`, `AI_PRODUCT_V2_ENABLED` | IMPLEMENTADO (agentes en `src/lib/agents/*`, ledger de presupuesto de evaluación) | BLOQUEADO: escrituras IA OFF y sin presupuesto aprobado; no se consume |
| Workers durables del asistente | (internos de BD) | IMPLEMENTADO + PROBADO en recursos desechables de CI (native/W2) | No se activan en staging mientras las escrituras IA estén OFF |
| n8n | `N8N_*` (13) | IMPLEMENTADO (cliente) | BLOQUEADO: imagen 2.42.7 con HIGH/CRITICAL y no necesaria para la demo. No desplegar |
| Monitorización | `MONITORING_ENDPOINT` | `/api/health/live` y `/api/health/ready` IMPLEMENTADOS; `MONITORING_ENDPOINT` **no tiene consumidor** en código | Alertas NO IMPLEMENTADAS. Opción a 0 €: comprobación programada de GitHub Actions contra `/api/health/live` (no puede atravesar la protección privada de Netlify sin credenciales del Owner; sin resolver) |
| Logs | — | Logs de funciones de Netlify y de Supabase (retención del plan Free) | Sin agregación ni retención larga: aceptado para staging |
| Backups | `BACKUP_DESTINATION`, `BACKUP_ENCRYPTION_KEY_HEX`, `BACKUP_KEY_ID`, `BACKUP_RETENTION_DAYS` | `scripts/platform/backup.mjs` y `offsite-contract.mjs` IMPLEMENTADOS; reconstrucción y recuperación PROBADAS en CI desechable (job `reconstruction-recovery` SUCCESS) | Staging: Supabase Free **sin backups programados ni PITR**. CONFIG PENDIENTE: decidir destino cifrado a 0 € y autorizar el secreto de BD en un entorno protegido. Restaurar siempre en un recurso separado, nunca sobre staging |
| Producción | `SUPABASE_PROD_PROJECT_REF` y nombres PROD | No existe proyecto de producción | BLOQUEADO hasta release aceptada; el plan Free admite 2 proyectos, pero crearlo requiere autorización |
| Privacidad y legal | — | No hay política de privacidad, encargado de tratamiento ni textos legales en el repo | Contenido humano y legal: Asier y Oier |
| Ubicación (Geoapify/Google) | `GEOAPIFY_API_KEY`, `GOOGLE_*` | IMPLEMENTADO (proveedor de servidor) | CONFIG PENDIENTE y opcional para la demo |

## 2. Revisión Supabase `crm-telecom-staging` (solo lectura, 21/10)

| Comprobación | Resultado |
|---|---|
| Migraciones | 87 (última versión alojada `20261019180534`), sin cambios |
| RLS | 90/90 tablas públicas con RLS activado |
| Funciones | 319 públicas; 0 `SECURITY DEFINER` ejecutables por `anon` |
| Storage | 2 buckets privados; 5 políticas en `storage.objects`; migración 88 NO aplicada |
| Advisors seguridad | 161 WARN definer para `authenticated` (ya auditados: todos con autorización propia o delegada); 61 INFO tablas sin política y sin grants (cerradas por diseño); contraseñas filtradas solo en Pro |
| Advisors rendimiento | 28 WARN `auth_rls_initplan` (políticas que reevalúan `auth.uid()` por fila, p. ej. `profiles`, `workspace_members`, `customers`, `contacts`, `telecom_contracts`); 1 WARN índice duplicado en `activities` (`activities_read_page_idx` = `activities_workspace_time_idx`); 196 INFO FK sin índice; 73 INFO índices sin uso (normal con pocos datos) |
| Usuarios | Todas las cuentas W5 están baneadas con 0 sesiones salvo owner A. **Hay 1 cuenta no sintética** (creada el 19/10, con sesiones activas) fuera de la cohorte: decisión del propietario, fuera del repo |

Propuesta (no aplicada; necesita un plan con el integrador, que lleva el SQL de producto): una migración forward posterior a la 88 que envuelva `auth.uid()` en `(select auth.uid())` en las 28 políticas y elimine el índice duplicado. Antes debe ensayarse en un recurso desechable con un perfil específico; ningún perfil histórico se modifica.
