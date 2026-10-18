# Identificadores SIM/eSIM: cierre y recuperación de operaciones

CLAIM 6255226301. Rama `codex/w2x-sim-identifier-recovery-close-20261018`, desde `2260d57543582969baeccde2e07b04b5c1c788a0`. El padre89 era metadata sin pruebas runtime propias;la evidencia de88 no se hereda.

## Reproducción y fixture

El causal original dejó **12FAIL/4PASS en2,9min**:crear/retirar ICCIDfísico yEIDeSIM,en incertidumbre,lectura fallida tras recibo odenegación,mostraba X habilitada o sin efecto tras cancelar. Las cuatro cancelaciones normales pasaban. Se conservan log,exit,banco48 y16observaciones,con errores de página yoperaciones inesperadas vacíos. Los inciertos/lecturas fallidas tenían un comando/un efecto sintético;denegación un comando/cero efectos;revisión cero comandos/efectos.

Se refinó una sola respuesta del fixture:el ICCID101 que sim.get ya proyectaba en la eSIM aparece ahora como compañero deEID en identifier.list,con IDs ordenados y DTO coherente. Es una mejora de coherencia de datos,no un fallo de aserción ocausa de los12fallos de UI. Producto intacto en la comprobación complementaria eSIMcrear:uncierto1FAIL/revisión1PASS en23,4s. Se conserva el banco original yel refinado;las guardias reconstruyen el primero ycomprueban que no se relajaron aserciones.

## Cambio y controles propios

El panel consume closeBlocked existente en closeDisabled y la guardia del callback. Se conserva el vaciado de raw al salir cuando está permitido. No se cambia hook,Drawer,ConfirmDialog,locked,contratos,servicios,backend,SQL oautorización. La reversión exacta del único fragmento devuelve el padre.

**237 passed (9.1m) propios:**48casos pertinentes (crear/retirar×ICCIDfísico/EIDeSIM×incertidumbre/lectura fallida/revisión/denegación×390/768/1440) y189regresiones. Es una ejecución fresca de este candidato;no hereda189de88 o metadata89.

Incertidumbre conserva y reintenta la misma orden,con un efecto sintético. Recibo confirmado con503 reintenta solo sim.get:un comando,dos lecturas posteriores. Denegación permite salir,reabrir vacío yexige nueva confirmación con nuevo command_id,cero efectos antes yuno después. Retirar conserva el identificador yexpected_version1;el recibo2 respeta el parser. Se vuelve a consultar la lista enmascarada,que muestra el identificador retirado y no ofrece retirarlo otra vez. Cancelar revisión no escribe. Al salir,no queda el valor completo en texto oinputs renderizados. Esto no prueba idempotencia/CAS/commitSQL real,borrado de memoria,cifrado oalmacenamiento protegido. Todos los identificadores son sintéticos.

Build66,lint,scan,diff,cola ybundle propios antes de publicar. Funcionales:NOT_RUN_EXISTING_CONTROL_POLICY_CONSUMPTION.

## Visual parcial y límites

32capturas realmente vistas:24recuperaciones críticas (incertidumbre/lectura fallida,todas las combinaciones de tipo/acción/3anchos),cuatro denegaciones390 ycuatro revisiones1440. Los paneles bajo la confirmación se verifican también por DOM. En creación eSIM tras denegación a390,la parte inferior del botón queda fuera del viewport;no se declara aceptación visual completa de ese formulario. Máscaras,filas,cantidades yfechas son declaradas. Tras reabrir,el tipo del formulario vuelve a su valor inicial;las filas conservan el EID/ICCID yestado comprobados. No se acepta toda la accesibilidad,móvil,matriz de roles oprivacidad del módulo.

HTTP/DTO yefectos sintéticos con componentes,repositorio yparsers reales. AuthDB/JWT/RLS/SQL/Nextintegrado/modelo vivo:NOT_RUN;API0. Sin ausencia/quiescencia nativa,reinicio,handler o full23. Los cinco campos no medidos siguen sin medir.

Global1968/source84 cerrado con sus cinco discrepancias de lectura conservadas;2007/source86 activo41016 y2043/source88 waiter93361 mantienen pines y no acreditan90. No crear otrofull solicitado antes de revisar coalescencia/backlog;2091 solo candidatoDEFERRED si se prepara. Matriz342/31PARTIAL/311sinreconciliar/0READY;HIGH5/W4 pendientes,IA writesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9 y evidencias anteriores conservan su alcance. Main,PR38/142/153 yfuentesW3/W4/W5/recurso intactos;consumo principal pendiente de ACK exacto. Continuar defecto comercial reproducido en Cartera uotra unidad útil.

- sim-identifier-recovery-esim-retire-read_failed-768.png — SHA256 30203154f3200ee5dccbf0aeb594d01e9bb029808f207d0eb52d67af47ddb120
- sim-identifier-recovery-physical-retire-uncertain-390.png — SHA256 72a7aa857eff441693ace51905307c92c38d39b2f846238962bc1672b6de748f
- sim-identifier-recovery-physical-create-uncertain-390.png — SHA256 0112750fbe680ec02176f3b89bfc0c1999ace5a8b1093d067934a787b431834e
- sim-identifier-recovery-physical-retire-uncertain-1440.png — SHA256 b59bccdb0e791270a635c0c4460313c872951c4006b001bc52c954dc4ab3c5d2
- sim-identifier-recovery-esim-create-uncertain-768.png — SHA256 3a153784b6fcfa670105247e1fffd957f922f62453c9bb97a9195aba07376581
- sim-identifier-recovery-esim-create-denied-390.png — SHA256 3d29a9a1b91ab744b56a23539ad9d398a661ad3c290bdf988edf01978cd7e77e
- sim-identifier-recovery-esim-retire-denied-390.png — SHA256 8386c778f90e060635891b97a6cc90f57bf0bab8f04e720fc8915451b10c6aaa
- sim-identifier-recovery-physical-create-read_failed-768.png — SHA256 1c38a38f3c480cda0e67749add2284ceb23a5bbd4c28348fd514ab7f66581ad9
- sim-identifier-recovery-physical-create-read_failed-390.png — SHA256 a70ac05253df762c6f5416bb5e160eda606cfae920fd8ae7528873acc7a0100d
- sim-identifier-recovery-physical-retire-denied-390.png — SHA256 3a8ae987d1e66044f2ee6de887fc85d25c165734080d2abd9fa6721fc2ef33cb
- sim-identifier-recovery-esim-create-read_failed-1440.png — SHA256 c6266694be5e8e8520ed2f2de561c3d983c430bb7778d21dde06e8a7daadd835
- sim-identifier-recovery-physical-create-denied-390.png — SHA256 9ad64f0c69165d66464011a42b95a45deaf5eff396a962cc00ff4f4d4b4a29e6
- sim-identifier-recovery-physical-create-uncertain-1440.png — SHA256 5979dcc4f0e256a2bc137f6106ed1895ea540ef53bdfed5265a880cc78296f7a
- sim-identifier-recovery-physical-retire-uncertain-768.png — SHA256 e5735498652f96380aec501e73ab8a7d694e9077a81a7d197f920b83a497c881
- sim-identifier-recovery-esim-retire-review-1440.png — SHA256 89fc969236c934768f1794609a84cd9a91efa4d1a7a2fc61fd9dd81e97662a45
- sim-identifier-recovery-esim-retire-read_failed-1440.png — SHA256 021bcee991e5fa784a344121e3e186753a5e0075ac8cc0e137d89fcf2ff70ca5
- sim-identifier-recovery-physical-create-uncertain-768.png — SHA256 78b4df8d96616cc0349cb27c5abd53fb9658a7356693431080ee781925b1269a
- sim-identifier-recovery-esim-retire-uncertain-768.png — SHA256 c9ac3e8c2f592ae706d58ac1dd3e44535a290e2eabcbb7960adcefe9a6721962
- sim-identifier-recovery-esim-retire-read_failed-390.png — SHA256 cf305eb5c0b216d6382a278aee4a6e50fbce865664afedfd47ec37d398d90fa7
- sim-identifier-recovery-esim-create-review-1440.png — SHA256 d58d4a5f5427088b31e6dd681dbe2985f53a44d6196bc6ab0c6897debc9f1838
- sim-identifier-recovery-physical-retire-read_failed-1440.png — SHA256 4bf0f4003c7b525f7f35406fa699ca1d5131f510c51b398a0637a6bf1255fbb2
- sim-identifier-recovery-physical-create-review-1440.png — SHA256 08a26db6c73e67ba1f4262fd443b4ccb9f82b0fab92cf7dc38675954dc0db614
- sim-identifier-recovery-esim-create-read_failed-390.png — SHA256 1df32965c0b09b91cf0352b891631279fbd79647efe497fa38e34fbb37815fa9
- sim-identifier-recovery-esim-retire-uncertain-390.png — SHA256 600e50e16ad3591159dba2cc784020b3040011be66df94f06cf5597347762e05
- sim-identifier-recovery-physical-create-read_failed-1440.png — SHA256 9b792f104da6231b80edc82f93084ddce5284ad762cd94a95ef3fc6efcef879b
- sim-identifier-recovery-physical-retire-read_failed-390.png — SHA256 83f79af933ad61b148a6955deb3ba21bd296abe011325404fbf9540b4902be61
- sim-identifier-recovery-physical-retire-review-1440.png — SHA256 8764f08cd9c23cac855b8e31db9db86139f66613384ca92f65d86730330cd6a0
- sim-identifier-recovery-esim-create-uncertain-390.png — SHA256 62feaf0fb3b9791f58698344417d446928fe5c5bee2fdd5bfabd4c2e0f74942e
- sim-identifier-recovery-esim-retire-uncertain-1440.png — SHA256 47c888d15b1061c428a939c60d63794f620594858bf1472e1ffb53402927be35
- sim-identifier-recovery-esim-create-read_failed-768.png — SHA256 995e3451b4bc52093cb3bfa8db779377726a96d7545b5f8f9801fc713bf1d861
- sim-identifier-recovery-esim-create-uncertain-1440.png — SHA256 34a3ee0339263d7b9b8415eac9d24829786ce5802bee701cbdaa66d8baa82160
- sim-identifier-recovery-physical-retire-read_failed-768.png — SHA256 0c7322e7932ad434a2e035792e6f0fc74ffe7f63b6ba160ff0bfa8dcdfd036ab
