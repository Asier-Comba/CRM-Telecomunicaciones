# Historial: identificar el paso de creación que falla

La aceptación propia de 582 terminó con `W3_HISTORY_UI_CREATE_LOST_DELIVERY_TIMEOUT`, sin artefacto de producto. La captura muestra el historial cargando y los controles desactivados. Esa imagen no identifica el paso exacto ni demuestra un commit. La fuente de la prueba mantiene `CREATE_LOST_DELIVERY` durante el reintento, validación de respuesta, lectura SQL, selección del hilo y creación de turnos. Por tanto, el nombre del error anterior no permite atribuirlo exclusivamente al primer envío perdido.

La observación anterior al drenado de rutas solo se intentaba dentro del bloque de intercepción. Un fallo posterior no pasaba por ese registro. No se asigna retrospectivamente una causa a 582 ni se modifican sus resultados: conserva sus 1142 pruebas, preview256 y PostgreSQL85/320 PASS, Supabase FAIL antes de aceptación de producto y auditoría cinco HIGH FAIL.

## Instrumentación acotada

Se distinguen ahora el clic del reintento, su respuesta, su cuerpo, igualdad de inputs, validación de recepción, lectura del hilo persistido, selección visible y llamadas de inicio/finalización de turnos. Los mismos checks, las mismas llamadas y los mismos tiempos de la aceptación siguen vigentes. Una auditoría local compara las etiquetas de checks, número de llamadas SQL/start/finish, presupuestos y predicados de recepción y exactamente una fila.

Tras un fallo de creación y **después** del drenado de rutas se guarda `failed-create-step-after-route-drain-safe.json`. La captura anterior al drenado continúa existiendo y no se presenta como posterior. El nuevo registro incluye exclusivamente:

- Fase cerrada, marca de rutas drenadas, número de intentos y comparación booleana de los primeros dos inputs.
- Estados HTTP observados, resultado del predicado existente de recepción y recuento SQL efectivamente leído. Si no se observó un dato, queda `null`; no se convierte en cero ni en prueba de ausencia.
- Número de turnos con inicio y finalización comprobados.
- Presencia de controles y avisos en pantalla como booleanos, o `display:null` cuando no puede observarse el DOM. La observación adicional del DOM queda limitada a un segundo después del fallo y no amplía los tiempos del test.

No se guardan títulos, mensajes, inputs, identificadores, cookies, cabeceras, credenciales, SQL, cuerpo de respuesta ni errores privados. La función `historyCreateStepObservation` admite únicamente un objeto cerrado de valores primitivos y un conjunto cerrado de booleanos del DOM; rechaza campos extra, getters, símbolos/prototipos inesperados, estados y contadores inválidos o marcadores contradictorios. El registro describe la fixture sintética de historial, no un recibo de negocio ni durabilidad del asistente.

## Verificación y límites

Dos controles bootstrap PASS prueban los pasos diferenciados, preservación de valores no observados, recuento cero realmente observado, snapshot inmutable y rechazo de material privado, getters, límites y estados contradictorios. Lint, sintaxis y diff PASS. La auditoría del flujo queda en `work/history-create-step-flow-audit.json`; pruebas y lint se conservan junto a ella.

No se ha ejecutado localmente el navegador autenticado ni PostgreSQL para esta instrumentación. No se declara reparación del timeout de 582, del HTTP500 de B423 o de las esperas de Cartera en 9C75/B57. La nueva fuente necesita controles propios; la candidata anterior DEDD tiene sus propios 1142/preview274/PostgreSQL85/320 cerrados y Supabase pendiente durante esta autoría. Los dos nuevos controles bootstrap elevan el total funcional previsto a 1144; preview previsto permanece274. No se hereda aceptación de otra fuente.

IA comercial OFF, Full23 y ausencia autoritativa pendientes, W4 independiente pendiente y lanzamiento NOT_ACCEPTED.
