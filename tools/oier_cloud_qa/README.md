# QA alojada de la candidata integrada

Preparación para W0 6288451006. No constituye autorización, prueba cloud ni aceptación de release. No se incorpora la admisión inactiva de Asier o el conflicto de PR159 desde este work.

El banco recorre UI real: login ordinario A, cliente nuevo `Bilbao Telecom Demo SL`, propuesta textual obligatoria de fibra por 300 EUR más 21 % IVA y quince días, revisión explícita, un borrador, recarga y consulta al backend en 390/768/1440. Contrasta línea, 30.000/6.300/36.300 céntimos, cliente, fecha, recibo y ausencia de numeración. Después cierra sesión A, inicia B, comprueba primero factura/cliente propios de B y exige denegación cerrada 403/404 para la factura y cliente recién creados por A. El negativo es navegador autenticado → API, no un mock ni un bypass de UI.

Solo permite `customer.create` e `invoice.create_draft`, una vez cada uno y exclusivamente en A. No emite, cobra, altera perfiles fiscales, llama al asistente/proveedor, modifica SQL, migra o limpia datos alojados. Un fallo después del dispatch conserva la página privada y los IDs de comando en el journal privado para recuperación; no vuelve a ejecutar una ventana ya iniciada. W5 conserva la gestión de la cohorte y su limpieza autorizada.

## Requisitos privados antes de ejecutar

Asier debe designar/revisar el SHA integrado; W5 debe entregar ventana, despliegue y cohorte sintética. La procedencia del despliegue se registra como **atestación externa Asier/W5**, no como inspección independiente de Netlify. El manifest no crea esa aprobación y no debe rellenarse con valores inventados.

`OIER_CLOUD_QA_MANIFEST` apunta al JSON privado entregado/adaptado tras esos handoffs. Campos exactos: `version: 2`, `windowId` UUID, `candidateSha`, `deploymentSourceSha` coincidente, `deployId`, `siteId`, `origin`, `projectRef`, `expiresAt`, `dataClassification: synthetic`, `integratorReviewRef`, `cloudWindowRef`, `deploymentEvidenceRef`, `browserBinding: DEDICATED_W5_APPROVED_CONTEXT`, `actorA: {id, workspaceId, role, customerId}` y `actorB: {id, workspaceId, role, customerId, invoiceId}`. Las referencias apuntan a los comentarios exactos de issue67; la factura/cliente B son fixtures privados preexistentes del tenant B. Los actores y tenants deben ser distintos y ambos capaces de leer su facturación propia. Origen, site y proyecto se restringen a los identificados por el propietario.

Las credenciales ordinarias A/B se instalan exclusivamente en variables privadas `OIER_CLOUD_QA_A_EMAIL`, `OIER_CLOUD_QA_A_PASSWORD`, `OIER_CLOUD_QA_B_EMAIL` y `OIER_CLOUD_QA_B_PASSWORD`. Solo admite cuentas `@example.invalid`, coherentes con la propuesta de admisión 145f01c; esta expectativa deberá reconciliarse con la candidata finalmente aprobada. No pegar credenciales ni UUID de cohorte en GitHub.

`OIER_CLOUD_QA_CDP_URL` se entrega privadamente **solo si W5 dispone y autoriza** un contexto de navegador dedicado con acceso Netlify normal ya resuelto, sin trazas/HAR/captura de Auth activos. El runner acepta únicamente loopback, verifica contexto dedicado y crea su propia página. No inicia servicios, copia perfiles/cookies o recursos W5, usa tokens de bypass, cambia protección o automatiza un login Netlify. Si W5 entrega otro mecanismo autorizado de navegador, adaptar el consumidor tras revisar su contrato; no crear un recurso paralelo para eludirlo. `DEBUG`/`PWDEBUG` deben estar apagados.

## Comandos

Desde el checkout propio: `node tools/oier_cloud_qa/run.mjs --preflight`. No conecta ni escribe; sin bindings devuelve `NOT_RUN` y código 2. El comando de ejecución exige además `OIER_CLOUD_QA_APPROVED_WRITES=true` y `--run`; no se invoca automáticamente desde CI o pruebas locales.

El estado queda fuera del repo en el hermano `oier-cloud-qa-private/<windowId>`: `run.lock`, journal de IDs/recibos sin credenciales y resultado saneado. Un lock existente requiere revisión/recuperación, nunca una segunda creación automática. Solo se cierra la página propia tras éxito y se desconecta CDP; no se cierra el contexto del propietario. El comportamiento de desconexión se revisó en el código de la versión Playwright instalada, sin cambiar paquetes. Las excepciones/steps originales se suprimen para evitar que los diagnósticos de `fill` impriman credenciales. El banco no activa screenshots, trazas, vídeo, HAR o exportación de storage; W5 debe confirmar que el contexto adjunto tampoco los tiene activos.

## Alcance de los resultados

Un éxito futuro acredita el recorrido **UI/API alojado** indicado y su readback; conserva procedencia de despliegue atestada. La lectura independiente de persistencia Supabase se registra `NOT_RUN` hasta comprobar los IDs sintéticos creados mediante el acceso de DB autorizado y el esquema exacto de la candidata. No sustituirla por el journal o un mock. W4 mantiene aceptación independiente de seguridad; estos dos negativos no aprueban RLS/Storage globales.

Voz real y modelo vivo permanecen `NOT_RUN`. Las pruebas anteriores con SpeechStub de PR160 no acreditan micrófono, transcripción real o voz alojada. Cuando exista ventana y dispositivo autorizado, ejecutar el dictado normal, verificar la transcripción y repetir propuesta/revisión/readback; registrar por separado su procedencia, sin contratar API ni activar escritura IA. La revisión textual no permite marcar voz como superada.

Cinco HIGH, escaneo, Storage P0, Edge Access y revisión W4 siguen visibles. IA comercial writes OFF; issue10 OPEN; release NOT_ACCEPTED. Las pruebas de `preflight.test.mjs` verifican únicamente que este runner no arranca fuera de su ventana/bindings; no son más casos de producto o cloud.

## Orden P0 de demo del 20/10: comprobaciones añadidas

Manifest consumidor v2: además del contrato anterior, exige rol esperado A/B y un cliente sintético preexistente de A distinto del cliente B. A debe poder crear (owner/admin/member); no se conceden permisos. La navegación completa al dashboard contrasta las props del ProductProvider generado por el servidor (getUser y membresía activa de DB en la candidata publicada) y el rol visible del header. Se leen únicamente los frames JSON literales de los scripts Next: Next 16.3.8 vacía __next_f al consumirlo. No se evalúan scripts, no se consultan claims user_metadata ni se añade endpoint Auth. Formato desconocido/duplicado o identidad distinta detienen la prueba antes de crear. Este parser depende del formato publicado y requiere contrastarse con la candidata desplegada; sus pruebas locales no son Auth cloud.

Se consulta primero el cliente A preexistente. Después de crear el cliente nuevo, se recarga la ficha y se exige el mismo ID, versión, razón social y estado activo en nueva consulta antes de facturar. Mantiene únicamente dos mutaciones autorizadas. Ante fallo, guarda primera fase, actor A/B, ruta normalizada sin query/IDs, capa, HTTP y tipo de contenido; no registra cuerpos, credenciales, cookies, cabeceras completas o excepción cruda. HTTP por sí solo no prueba causa. La voz real, DB independiente y aceptación de release continúan separadas.
