# Reserva confirmada y autorización: veinte workers Node independientes

## Alcance pendiente y cambio

La fixture nativa ya verifica reserva confirmada y autorización mediante carreras de20 clientes psql y llamadas individuales al puerto tipado. Eso no acredita20 procesos Node recorriendo juntos el mismo puerto. La carrera nueva cubre esa diferencia; conserva todas las carreras SQL, cortes y controles negativos existentes.

`assistant-reservation-races.mjs` emite una confirmación para su fixture, genera veinte requestRefs independientes y llama a `runIndependentConfirmedReserveStartRaceV1`. El controlador existente conserva los recorridos anteriores y usa `start-execution-worker.mjs` exclusivamente para este modo cerrado.

Cada proceso Node abre una conexión PostgreSQL persistente y mide `pg_backend_pid()` en ella. El controlador verifica veinte procesos/backends distintos antes de liberar trabajo. Otra barrera exige veinte workers preparados; todos llaman a `confirmReserveEnqueue` con la misma confirmación, binding, clave y command. Antes de autorizar ejecución se exigen una reserva, diecinueve replays y un único operationRef/digest del registro reservado. Los veinte workers llaman después a `startExecution` con versión1: se exigen una autorización y diecinueve conflictos CAS. Cada worker vuelve a medir el mismo backend antes/después de sus llamadas tipadas.

El observador independiente relee estado `executing`/versión2, binding, los cinco ledgers originales (operation, command, effect outbox, audit intent y delivery), el requestRef del único ganador de reserva y el rechazo de una nueva autorización con versión1. El cleanup limita la terminación a la base `telecom_test` y a cada backend/application nonce medidos, verifica su desaparición y no crea/reinicia recursos.

## Pruebas y límites

Regresiones locales existentes:18 del puerto tipado y7 de framing/cancelación/timeout de la conexión PASS. Lint, sintaxis y diff PASS. PostgreSQL nativo y la carrera nueva NO ejecutados localmente: Docker no está disponible. El código preparado debe publicarse y superar su propio job nativo antes de acreditar una carrera física. Las pruebas de fuentes anteriores no se heredan.

La confirmación usa el puerto físico de reserva existente y un dispatcher sintético registrado en la fixture. No acredita el camino completo de material validado, ejecución del efecto, resultado, reconciliación, drenado de todos los eventos, ausencia autoritativa, corte antes del efecto o reinicio. No es el escenario completo `reserve_start_race` del contrato v3 ni el driver Full23; su validación completa sigue pendiente.

W2 conserva SQL/puerto/driver; W5 sigue siendo propietario del recurso/runtime y de su contrato pendiente de ACK conjunto. No se edita su rama ni se crea una implementación alternativa de infraestructura. IA comercial OFF; issue10 OPEN; revisión independiente W4 y release NOT_ACCEPTED.
