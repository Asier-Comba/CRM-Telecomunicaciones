# Recuperación: comprobar la nueva conexión antes de ejecutar

## Defecto reproducido y cambio

El runner `scripts/durable-process-acceptance.mjs` comprobaba veinte procesos y backends distintos antes de comenzar cada carrera. Sin embargo, en la recuperación solo comprobaba un PID backend positivo y un proceso nuevo, después de ejecutar la recuperación. Un driver que declarase reutilizar un backend anterior podía acreditar el primer escenario.

La regresión `tests/assistant/durable-recovery-identity.test.ts` ejecuta el runner real sin sustituir su lista de escenarios ni validadores. Un adapter deliberadamente incompleto declara veinte identidades backend sintéticas distintas y devuelve una identidad anterior para la recuperación. En el padre537, el runner publica `reserve_race` como aprobado antes de detenerse en el siguiente escenario: la expectativa de cero escenarios aprobados falla.

Ahora la recuperación comprueba un backend positivo, proceso nuevo y backend distinto de todos los trabajadores originales **antes** de enviar el trabajo. Si falla, el runner termina el proceso pendiente, ejecuta la limpieza y conserva cero escenarios aprobados. El control positivo usa una identidad nueva, llega a una recuperación y termina expresamente antes del segundo escenario. No imprime los errores privados del adapter.

## Verificación y límites

- La regresión del padre falla; el cambio pasa con los dos modos, reutilización rechazada y nueva identidad admitida.
- Diez pruebas enfocadas de protocolo, prerrequisitos y ledgerV3 pasan; tipos estrictos ES2017, lint, sintaxis y diff pasan.
- El fixture usa PIDs de Node como números sintéticos y archivos temporales propios como marcadores. **No abre PostgreSQL, no prueba reserva ni persistencia, y no presenta el primer escenario sintético como evidencia física.** El adapter siempre termina con fallo intencional antes de completar la suite.
- La lista de23 escenarios, sus cuatro carreras de20 procesos, los validadores de21 campos y los plazos originales permanecen intactos. No se añaden flags para seleccionar o saltar escenarios en producción.
- Un PID nuevo declarado no demuestra por sí solo una conexión real; el controlador físico pendiente debe obtener `pg_backend_pid()` en la conexión usada para ejecutar. Continúan pendientes ese controlador completo, reinicio, ausencia autoritativa, Full23 y aceptación W4. IA comercialOFF; issue10OPEN; lanzamientoNOT_ACCEPTED.
