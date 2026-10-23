# EasyPanel: auditoría y preparación de staging · 23/10/2026

Estado: **EMPTY_SERVICE_CREATED_DEPLOY_BLOCKED / RELEASE_NOT_ACCEPTED**. Existe la nueva App vacía; no hay contenedor, dominio de producto ni despliegue nuevos. El descriptor JSON contiguo es un plan de revisión, no una importación de proyecto ni un ejecutor. Actualización unidad48 tras autorización del diagnóstico de lectura.

## Destino y conservación

- Proyecto existente: `crm-inmobiliario`.
- Único servicio nuevo: App `crm-telecom-staging`, creada vacía después de completar el diagnóstico autorizado.
- El servicio `crm-staging` permanece intacto. No se pulsa Crear proyecto, Implementar, Stop ni Restart.
- `primer_proyecto_prueba` y `quemando-tokens` no reciben cambios.
- Ninguna variable, volumen, base de datos ni credencial del CRM inmobiliario se reutiliza.
- CLAIM47: #67/6368416004 y delimitación de archivos #67/6368729569. Este cambio solo añade este informe y `infra/deployment/easypanel-staging.plan.json`.
- CLAIM48: #67/6369097100, actualización de esos dos archivos propios. Creación mediante UI del proyecto existente, sin fuente, imagen, claves, volúmenes ni Deploy. Sigue en init/source. Al intentar acceder a Recursos, el panel devuelve al asistente: requiere configurar una fuente primero. No se introduce una imagen ficticia para saltar el paso.

## Fuente y comprobaciones

Candidata comercial #175: SOURCE_SHA `f9aa469bec768ad73572a2f462f1f1505e6791a5`, TREE_SHA `16d83e73283c66ca4988778a2068ba2d5d2c6b4b`. No se mueve su rama.

Leídos AGENTS, MASTER y contratos de plataforma/producto, SYSTEM_STATE, HANDOFFS, RELEASE_STAGING, cabeceras/admisión/proxy/Auth, manifiesto de entorno, Dockerfile, lockfile y guía local de self-hosting de Next. No se encontró un documento independiente llamado DECISIONS; las decisiones vigentes se contrastaron con #67 y los contratos. Next 16.3.8, React 19.2.4, .nvmrc 24, output standalone. Scripts prebuild/build/postbuild/start existentes conservados.

#175 mantiene 6 workflows SUCCESS y 3 FAILURE; auditoría de dependencias con 5 HIGH, vendor y W4/history bloquean release. La prueba física desechable de esa fuente sí acredita 87 migraciones, 4042 checks backend, 116 UI y teardown PASS. No equivale a una aceptación alojada.

Las propuestas #182, #183, #184 y #185 siguen Draft, sin adopción. #171 se refrescó a 8b64f56e5c331c8efb505347d1581d826dc556e2. W5 ha autorizado solo el cherry-pick 240400ca20fc9960490ec686855698263eb60f6c; falta revisión W4, por lo que no se incorpora aquí.

## Panel y capacidad: lectura real

EasyPanel 2.37.0 sobre Ubuntu 24.04, Hostinger KVM2, 2 CPU, 8 GB y 100 GB nominales.

| Medida | Lectura |
| --- | --- |
| CPU instantánea | 2,0%; lecturas anteriores aproximadamente 1–2,1% |
| Carga 1/5/15 min | 0,53 / 0,34 / 0,20 en la última captura de monitor |
| Memoria | 1,6 / 7,8 GB, 20,3% |
| Disco | 12,2 / 95,8 GB, 12,7% |
| Contenedores de aplicaciones | 12 visibles, una réplica por servicio |
| Contenedores panel/proxy | 2 visibles |
| Swap | **0 bytes**, free y swapon verificados en consola autorizada |
| Carga sostenida | Gráfica de proveedor de 24 h inspeccionada: CPU baja y memoria estable; no se conserva una serie numérica ni se afirma un percentil |

Los números son observaciones puntuales del panel, no una prueba de capacidad de la nueva aplicación. No se ejecutan builds ni suites pesadas en este VPS compartido.

Se propone inicialmente una sola réplica con reserva de memoria 256 MB, límite 768 MB, reserva CPU 0,1 y límite 0,75. **No aplicado ni validado mediante carga real**. Si el smoke alojado muestra OOM o latencia, parar exclusivamente la nueva App y volver a revisar; no reducir ni apagar servicios existentes.

La revisión automática rechazó inicialmente abrir la Consola web root. El propietario autorizó después explícitamente solo el diagnóstico de lectura descrito en el informe47. Se abrió por Hostinger HTTPS y se ejecutaron free, swapon, df, uptime, docker ps, network ls y los inspect acotados a redes/miembros/puertos. Sin env, claves ni volcados completos. La primera entrada multilinea se concatenó y swapon la rechazó; se repitieron las consultas separadas, sin efectos. Consola cerrada al terminar.

Lectura directa: memoria7940MiB total/1601usados/6338disponibles; swap0, swapon sin filas; /dev/sda1 96G total/13Gusados/84Gdisponibles/13%; uptime carga0,02/0,11/0,15. Son unidades/redondeos de esas herramientas, no cifras exactas convertidas del panel. Falta prueba de capacidad de la nueva App. No se añade swap ni se cambia el host.

docker ps antes/después de crear la App vacía conserva los14contenedores y sus identificadores/uptimes, sin contenedor crm-telecom-staging. Este contraste no demuestra disponibilidad funcional de cada aplicación, pero sí ausencia de sustitución/reinicio/arranque adicional durante la operación.

## CRM inmobiliario existente y dependencias

Una App existente, una réplica; dominio HTTPS y proxy interno a puerto 80. Esa configuración no se traslada a la nueva App, cuyo puerto interno sería 3000.

Recursos de la App antigua: CPU y memoria sin reserva ni límite en la UI (cero); se conservan. Almacenamiento: ningún montaje listado. Avanzado: una réplica, zero-downtime activo, sin comando o capacidades adicionales en los campos inspeccionados. No se han modificado.

La vista del esquema del proyecto incluyó variables y credenciales del servicio antiguo; se abandonó esa vista. No se copiaron valores a archivos, repositorio, comentarios ni nueva configuración. Al haberse mostrado a través de HTTP, el responsable debe evaluar y rotar sus credenciales mediante acceso seguro. **No se rota ni revoca automáticamente para no interrumpir servicios ajenos.**

El esquema identifica dependencia del CRM inmobiliario con su Supabase y con n8n. El descriptor nuevo prohíbe reutilizarlas. **Red verificada: aislamiento insuficiente para aceptar un runtime nuevo.** crm-staging está adjunto a las overlays Swarm easypanel y easypanel-crm-inmobiliario. La global incluye CRM, n8n, API/runners/supervisor, panel y Traefik; la de proyecto lista el CRM y su endpoint. No se atribuye aislamiento a proyectos ni se prueba conectividad activamente. BLOCKER NETWORK_ISOLATION_REVIEW_REQUIRED: diseñar separación efectiva para el nuevo servicio sin alterar redes/servicios existentes antes de arrancar contenedor. La ficha vacía no tiene contenedor ni tráfico de producto y no resuelve este bloqueo.

Endpoint.Spec.Ports del CRM antiguo: null (sin publicación directa); docker ps muestra 3000 administrativo del panel publicado en IPv4/IPv6 y 80/443 del proxy. No se cambia esa exposición. Los otros puertos de aplicación mostrados son internos; un puerto interno sigue siendo alcanzable desde una red compartida según sus controles de aplicación.

## Acceso administrativo

Se ha verificado TLS de `https://hvdnby.easypanel.host/` con validación de certificado habilitada: cadena autorizada, SAN del hostname, TLS 1.3, Let's Encrypt YE2, caducidad 23/11/2026 00:41:13 UTC. La sesión HTTPS muestra Login; no comparte la sesión HTTP. No se han introducido credenciales nuevas por HTTP.

2FA aparecía deshabilitado en los ajustes leídos; no se cambia autenticación, firewall, certificados ni acceso global. El propietario puede iniciar sesión en la pestaña HTTPS abierta; no debe enviar la contraseña por chat.

## Dominio, DNS y privacidad

**BLOCKER: DOMAIN_OWNERSHIP**. Se ha revisado la cartera accesible en Hostinger y un candidato, pero el acceso delegado a una cuenta no acredita titularidad ni autorización de un dominio concreto. No se publica aquí la cartera de otros dominios. Falta la identificación por el propietario.

Origen final, proveedor autoritativo aplicable, registro, URL de producto, DNS y TLS de la App: **no configurados**. No se inventa un hostname ni se acepta el dominio automático del panel como prueba de dominio propio.

Tras confirmación: comprobar el hostname exacto libre y DNS autoritativo, añadir exclusivamente su nuevo registro, asociarlo exclusivamente a la nueva App, proxy HTTP interno 3000, sin puerto host publicado, certificado exacto, redirección HTTP→HTTPS y protección privada. No cambiar MX, wildcard, registros anteriores ni configuración global. No utilizar opciones de licencia de pago.

## Empaquetado existente: reutilización y limitación real

`infra/deployment/Dockerfile` ya proporciona:
- multi-stage Node 24.21.0 con digest fijado; npm ci con package-lock;
- runtime distroless Node 24 no root (65532:65532), también fijado por digest;
- standalone + public + .next/static; HOSTNAME 0.0.0.0, PORT 3000;
- solo ARG públicos de build; .dockerignore excluye .env, claves y datos;
- salud HTTP /api/health/live; no migración de base al arrancar.

La aceptación de contenedor histórica en Enterprise Platform, run39765853387/job119780985736, comprobó firma distroless, build, nonroot, filesystem readonly, liveness y healthcheck PASS. En ese momento Trivy 0.75.0 mostró HIGH/CRITICAL vacío y0secretos; fuenteCIa7e7feddd452f4d1f910e29f7b0ba86ed94e5644, árboligualf9aa. Ese escaneo no acredita seguridad vigente. Su image config ID no es un digest de manifiesto publicado.

Nuevo run de #186/5265c55: Enterprise39981640449 FAILURE, W4all-ref39981640520 FAILURE, CI39981640489 en curso al consultar. Container-package120510164332 sí recompila y smoke nonroot/readonly/liveness/healthcheck PASS, pero Trivy ahora reporta Next16.3.8 con2CRITICAL (GHSA-2464-fhr4-w9xw, GHSA-673q-mjm6-r5xr) y1HIGH (CVE-2026-94482),0secretos: imagen NO aceptable. Vendor120510164203 también falla escaneo de PostgreSQL (1CRITICAL/25HIGH) tras aceptación desechable+teardownPASS; no se modifica n8n alojado. Los avisos son resultados del escáner, pendientes de revisión de sus fuentes por W4/W5.

El job contracts120510163936 detectó además una regresión propia: este descriptor en infra/deployment incluía el hostname público de un Supabase concreto y violaba la comprobación de portabilidad. Reproducido localmente (hosted.test:2PASS/1FAIL); se retira el valor de ese descriptor y se conserva solo su referencia al contratoW5. El guard y las pruebas se mantienen intactos. La URL sigue documentada como evidencia, no fijada en el paquete portable.

Verificación posterior: hosted/config/staging-admission-environment **13PASS/0FAIL/0SKIP**, incluido el test de portabilidad antes fallido, y15invariantes del estado actual del descriptor PASS. También se cuantificó el resultado completo del scanner vendor: n8n13CRITICAL/85HIGH; PostgreSQL1CRITICAL/25HIGH. No se infiere que esos avisos apliquen a los servicios alojados, cuya imagen no se inspeccionó; se mantienen bloqueados los paquetes ensayados por CI.

Los mantenedores de Next identifican16.4.1 como parche para ambos avisos críticos: [GHSA-2464-fhr4-w9xw](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw) y [GHSA-673q-mjm6-r5xr](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr). Propuesta de actualización por unidad separada, pendiente de pruebas y revisión, sin cambiar unilateralmente la candidata comercial o el hosting.

**Bloqueo de arranque:** scripts/platform/entrypoint.mjs rechaza siempre STAGING/PROD con HOSTED_PRODUCT_RUNTIME_NOT_ACCEPTED hasta aceptación W2/W4. Además, el validador de plataforma exige Auth/SMTP para un destino alojado, mientras el contrato W5 de este producto prohíbe vincular SMTP. Es un conflicto pendiente entre contratos, no una invitación a añadir secretos innecesarios. Se requiere resolución versionada W2/W5/W4, con negativos, antes del primer contenedor staging.

No se sustituye CMD, no se ejecuta server.js directamente para eludir la barrera ni se etiqueta el VPS como LOCAL. No se duplica Dockerfile. Docker local disponible como cliente, daemon ausente; no se afirma un build Docker local nuevo.

Alternativa propuesta: CI desechable produce imagen linux/amd64, firma/escaneo/SBOM y manifiesto de procedencia que vincule SOURCE_SHA, TREE_SHA, lockfile, ARG públicos por entorno y digest publicado. Registro y publicación aún no existen/están autorizados; image digest **NOT_AVAILABLE**. Auto Deploy OFF; ninguna rama/PR/main es autorización automática. El build del árbol f9aa sí pasó en CI, pero no hay imagen alojada aceptada.

## Controles de la nueva App aún por comprobar y aplicar

Read-only rootfs, cap_drop ALL, no-new-privileges, sin privilegios, sin host mounts/socket/volúmenes ajenos, sin PostgreSQL local. Tmpfs /tmp; verificar la escritura necesaria para caché Next en la imagen real y usar solo almacenamiento efímero acotado si es necesario.

Salud HTTP existente cada 30 s, timeout 5 s, start-period 30 s. Propuesta de reinicio on-failure con 10 s de espera, máximo 3 intentos en ventana 120 s. Logs propuestos json-file 10 MB × 3. Confirmar que EasyPanel permite expresar cada control a nivel de **nuevo servicio**; no simularlo cambiando el daemon/proxy/global. Los recursos y políticas de compose.yaml son referencia de laboratorio; no se importa ese Compose ni su límite de 2 CPU al VPS compartido.

Probar denegación de origen/Host y forwarded headers sin confianza amplia; no dar por fiable cualquier X-Forwarded-Host. Mantener las rutas de salud conforme al contrato, sin usarlas como bypass de páginas/APIs privadas.

## Contrato Supabase recibido

W5, docs/w5/SUPABASE_STAGING_CONTRACT.md en e1a2405c (#157), respuesta #67/6368456922. No se incorpora toda esa rama.

- Proyecto staging telecom existente, separado del inmobiliario; URL pública `https://zgwotxnyqzfuzcnmgvtn.supabase.co`.
- W5 reporta 87 migraciones, PG17.11, RLS90/90, 266 SECURITY DEFINER sin search_path ausente. Son verificaciones declaradas por W5, no una nueva auditoría SQL de Work.
- Clave publicable y cohorte privada no vinculadas a EasyPanel. Cohorte no recibida. Ninguna clave privilegiada en cliente.
- Solo email confirmado y usuarios sintéticos en cohorte 1..64; identidad getUser en servidor y autorización vigente en RPC/RLS.
- Redirect URLs y Site URL actuales NOT_VERIFIED por W5. Propuesta de dos callbacks exactos /auth/callback y /reset-password, tras origen verificado y autorización del propietario; conservar Site URL de preview mientras siga en uso.
- Registro abierto y una cuenta no sintética reportados: decisiones de Auth pendientes del propietario, sin cambios unilaterales.
- Storage88 NO aplicado; contenidos/mantenimiento de documentos OFF. No SQL, RLS, Auth, Storage ni nuevas bases por Work.

src/lib/server/product-staging-admission-v1.ts mantiene el origen exacto Netlify. No acepta hoy el nuevo alojamiento. Solo después de verificar dominio se preparará el delta de origen exacto y sus pruebas con W5/W4, sin wildcards, sufijos, cohortes abiertas ni quitar validaciones.

IA live y business writes IA OFF. OPENAI_API_KEY no se copia; gateway, ledger, kill switch, evaluación, revisión y presupuesto siguen pendientes. No se afirma durabilidad de acciones IA ni limpieza de documentos no escaneados.

## Pruebas y criterios pendientes

Verificación local de los contratos actuales: tests/platform/config.test.mjs y staging-admission-environment.test.mjs, **10 PASS, 0 FAIL, 0 SKIP**. Incluyen negativos para secretos públicos, orígenes discordantes, redirecciones wildcard, modo LOCAL/PROD incorrecto, cohortes duplicadas/abiertas y ausencia de eco de secretos. No prueban un nuevo origen ni hosting: siguen intactos.

Pruebas alojadas **NOT_RUN**: login/logout/recuperación, tenant A/B, revocación con JWT vigente, origen/host falsos, cookies Secure/HttpOnly/SameSite, dashboard, cliente/Customer360, oportunidad, catálogo/tarifas, contrato/servicio/línea, factura, agenda, informes/permisos/asistente disponible. Todas con datos sintéticos, escritura autorizada, lectura y recarga, sin pruebas pesadas en VPS.

Cierre adicional de evidencia #185: artefactos descargados e inspeccionados con SHA256 correcto. Unión966 PASS (483desktop+483mobile), artifact12445207047, ZIP 1fde6242fb82839967ae80ed14f4e41f0a280052fd682cb00ac9256143c707a0. Física propia run39819946279/job119968264654:87/4042/116 únicos/116timings PASS/teardown PASS, exit0, artifact12446860059, ZIP eed34a68282d006ee26a6e68f925d6210fe560c1f9b1e61c455cf7be17a3e45b. Merge d5bf8ff0346f07dc72f493aaff6cec22bdabb18c y árbol f589090e9c09f5c9cb7aa159e32c0cead127c28e idéntico al source9a4503b0. CI global y W4 history siguen FAILURE; no hay adopción ni release por esa evidencia.

## Rollback y siguientes tres tareas

Hoy existe solo la ficha nueva vacía, sin runtime/datos/secretos/dominio. No hay despliegue que revertir. Conservarla mientras se resuelven bloqueos; cualquier destrucción irreversible requiere confirmación en ese momento.

Una vez creada la App: rollback exclusivamente sobre crm-telecom-staging. Cerrar su ruta nueva/retirar solo su nuevo registro DNS si se añadió, detener solo su contenedor y retirar sus propios bindings. No borrar proyecto, volúmenes ajenos, datos Supabase ni cambiar servicios antiguos. Registrar antes/después y conservar evidencia sin valores secretos. No pedir revertir una base de datos que no se migró.

1. Confirmar dominio del propietario e iniciar sesión HTTPS; revisar con W5/W4 cómo aislar el nuevo runtime de la overlay global. Diagnóstico y creación vacía completados; no volver a pedir permiso para esas lecturas ya autorizadas.
2. Resolver con W2/W5/W4 el entrypoint/contrato y el origen exacto; obtener revisiones y superar HIGH/vendor/history. Preparar una imagen CI inmutable y su procedencia.
3. Vincular solo secretos aprobados por HTTPS, protección privada/recursos/DNS/TLS de la nueva App; smoke alojado sintético completo y revisión antes de admitir usuarios reales.
