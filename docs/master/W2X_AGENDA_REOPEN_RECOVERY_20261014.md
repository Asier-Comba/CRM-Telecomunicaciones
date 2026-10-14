# Agenda: recuperar reapertura de tareas

CLAIM W2-X #67 /6164681585. Base6d82f250a5085809a0163e454ea5c66616b3d141.

## Defecto y corrección

Al reabrir una tarea completada/cancelada, una respuesta perdida o ilegible deja el comando pendiente. El registro anterior sigue terminal; su condición deshabilitaba también el botón Reintentar, mientras cerrar estaba bloqueado. La reproducción original falla en toBeEnabled del reintento y se conserva aparte.

Se cambia una condición del botón: terminal bloquea nuevos guardados, pero no la recuperación del intento pendiente. La ejecución reutiliza el closure existente con task.reopen, command_id, cuerpo y expected_version; no cambia permisos, servicios ni contratos. Campos y cierre permanecen bloqueados durante incertidumbre;403 despeja el intento y permite cerrar.

## Verificación acotada

72 pruebas propias HTTP controlado PASS:18 nuevas (completed/cancelled × transporte/recibo inválido/403 ×390/768/1440) y54 regresiones existentes de tareas/reuniones. Los positivos comprueban dos envíos idénticos, un efecto simulado, versión esperada1 y reapertura posterior del detalle en estado pending. Los negativos403 no producen efecto simulado.

No es Auth/DB real: los componentes, repositorio/validadores y navegador son reales, HTTP y persistencia son controlados. Modelo vivoNOT_RUN, llamadasAPI0. No se promociona ninguna fila de aceptación completa.

Lint y build de66 rutas PASS propios. Reproducción original, logs y capturas conservados con hashes en checkpoint.

## Visual parcial

Tres capturas de recuperación de tarea completada realmente inspeccionadas. Reintento visible, cierre/campos bloqueados, texto legible y sin overflow horizontal en390/768/1440. No aceptación de todos los estados o accesibilidad integral.
- agenda-reopen-completed-transport-1440.png: SHA256 `ae157ddc43500a6e14a055efb4bfbed503bfbcbb81585f19ab369cf44e5ab8c4`.
- agenda-reopen-completed-transport-768.png: SHA256 `ddd80bbbf950cc49739f9601992b9eb3a1c9665e6979f85e03b7552a4b94c2fd`.
- agenda-reopen-completed-transport-390.png: SHA256 `159467348db8f2f65d5165ddd614af8d59d4e4884ba74abdf16b45c637a2f092`.

PR1537F permanece fallida por navegador20m y SupSafe ausente. Solicitudes6162715998/6162753210 pendientes. HIGH5, W4 y ACK principal pendientes; IA writesOFF, issue10OPEN, releaseNOT_ACCEPTED. F736/B9 y fallos anteriores no se declaran corregidos por esta unidad.
