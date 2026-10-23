# Unidad51 · contrato de arranque STAGING · 23/10/2026

Estado: **PROPOSAL_ONLY / RELEASE_NOT_ACCEPTED**. CLAIM #67/6370799417. Base técnica #187, source68a08a692950a12ab18b3abf8d331cbc8f94fc64/treeb9e3ce494f1d6801516d9ca11261b94c06c08d5d. No mueve #175 ni adopta #187. No incluye #188.

## Dos bloqueos reproducidos por separado

Sobre los archivos originales de68a08a69, un proceso aislado con valores sintéticos del contrato W5 produce:

- Perfil producto STAGING completo sin SMTP: BLOCKED con MISSING_AUTH_EMAIL_ENABLED, MISSING_AUTH_REDIRECT_URLS, MISSING_AUTH_SITE_URL, AUTH_EMAIL_REQUIRED y APP_AUTH_ORIGIN_MISMATCH.
- Perfil antiguo con SMTP sintético y callbacks exactos: configuración VALID; el entrypoint original termina1 con HOSTED_PRODUCT_RUNTIME_NOT_ACCEPTED antes de server.js.

No se contactó SMTP, Supabase ni hosting. Reproducción local recuperable: work/unit51-reproduce.mjs y work/unit51-baseline. Las primeras dos pruebas nuevas daban0PASS/2FAIL antes del cambio; la primera detectaba el conflicto y la segunda fallaba porque recibía rechazo de configuración en lugar del gate de aceptación.

## Cambio mínimo propuesto

El perfil gestionado se selecciona solo con STAGING y PRODUCT_STAGING_INTEGRATION=true. Valida usando **el parser real e intacto del producto**: APP_ENV staging, NODE_ENV production, origen Netlify exacto vigente, proyecto Supabase exacto y cohorte canónica1..64. NEXT_PUBLIC_APP_URL debe coincidir. Requiere publishable key y rechaza la alternativa anon ambigua.

Solo en ese perfil dejan de exigirse las tres variables de control Auth de plataforma: AUTH_EMAIL_ENABLED, AUTH_SITE_URL y AUTH_REDIRECT_URLS. Supabase mantiene su propio mailer y configuración de callbacks bajo responsabilidad W5; estas variables de contenedor no configuraban el proyecto alojado. AUTH_EMAIL_ENABLED puede estar ausente o false. Bindings SMTP, N8N, META, OPENAI, service_role, AGENT_TOOL_SECRET, ASSISTANT_PROVIDER y capacidades externas activas son rechazados. No se introducen credenciales de relleno. BACKUP_RETENTION_DAYS sigue siendo requerido; su presencia no acredita backup operativo.

La configuración genérica y los requisitos SMTP anteriores siguen aplicándose fuera del perfil gestionado. Los tests existentes no se modifican. Los códigos MANAGED_AUTH_PROFILE_INVALID y MANAGED_AUTH_PUBLISHABLE_KEY_REQUIRED describen el perfil completo; los códigos existentes de cohorte permanecen separados. Una primera ejecución intermedia dio11PASS/1FAIL porque esos dos códigos se mezclaban con la categoría de cohorte de una prueba existente; se corrigió la clasificación y se añadieron negativos de perfil completo, sin aceptar aquella configuración incompleta.

El entrypoint sigue validando toda la configuración antes de arrancar. Después exige una política JSON **incorporada a la imagen**, con versión fija, origen exacto, Auth supabase-managed, las cinco capacidades false, revisiones W2/W5/W4 APPROVED y production_accepted=false. No lee aprobación ni ruta de política de variables de entorno. **La política publicada es PROPOSED, origen null y todas las revisiones PENDING: STAGING sigue cerrado. PROD está cerrado incondicionalmente**, incluso con una política fixture aceptada. Las fixtures positivas de tests no son una aprobación.

Se reutiliza infra/deployment/Dockerfile. La única ampliación copia el parser TypeScript existente al runtime Node24 para no duplicar la gramática de admisión. Se mantienen standalone, bases por digest, usuario65532, entrypoint, puerto3000, healthcheck y ausencia de secretos de build. El inventario se regenera; solo cambia la lista de consumidores de seis variables, sin nombres ni semántica nueva de secretos. La prueba real del contenedor pertenece a la CI de esta fuente y está pendiente al publicar.

## Verificación local

Node24.20.0 / Windows, Next16.4.3:

| Evidencia | Resultado |
|---|---|
| Reproducción original separada | PASS, conflicto de configuración y gate intencional |
| Nuevas5 pruebas, incluyendo matrices de rechazo y política exacta | PASS |
| Configuración + cohorte + runtime | 15PASS/0FAIL |
| Plataforma completa | 111PASS/0FAIL/1SKIP nativo reservado a CI |
| Lint | PASS |
| Tipos | PASS |
| Inventario y diff | PASS |

Matrices: perfiles parciales, otro origen/proyecto, clave privada/ambigua, cohorte vacía/duplicada/wildcard, modo local, capacidades externas, bindings prohibidos; política parcial/extra, review pendiente, cambio de Auth, capacidad activada y producción. Los resultados no incluyen valores ni IDs de cohorte. Proceso entrypoint real con falsas aprobaciones ambientales termina1 en el gate esperado.

Build y CI nueva se registran en PR/#67 al finalizar. No se heredan940UI ni87/4042/116 de otra fuente. Los5FAIL Windows históricos de bootstrap siguen documentados en unidad49; esta unidad no los elimina. No se ejecuta aceptación pesada en el VPS.

## Revisión y adopción pendientes

W2: contrato de arranque/paquete; W5: Auth gestionado, variables, backup, callbacks y cohorte; W4: aislamiento, política y negativos. La política solo podrá cambiar mediante una revisión de código aprobada y una imagen nueva con procedencia propia. No reemplaza aceptación de aislamiento #188, origen autorizado, clave pública/cohorte privada, TLS privado ni resultados físicos.

El origen nuevo de EasyPanel sigue bloqueado por DOMAIN_OWNERSHIP_BLOCKER y por admisión exacta del producto. No se permite un host arbitrario ni se cambia la Site URL Netlify. W5 recibió solicitud de revisión por #67; no se modificaron SQL/RLS/Auth/Storage alojados. IA live/escrituras externas OFF, Storage88NO, presupuesto adicional0EUR.

Rollback: rechazar/revertir solo esta propuesta; la nueva App sigue vacía, sin runtime. Siguientes: revisar CI y escaneo propios; resolver política/topología/origen con propietarios; construir y publicar por registro autorizado una imagen por digest de manifiesto con configuración pública exacta antes de configurar Source.
