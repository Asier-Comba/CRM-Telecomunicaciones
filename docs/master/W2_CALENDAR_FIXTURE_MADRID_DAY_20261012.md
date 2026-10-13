# Fecha de fixture de Agenda conforme a Madrid

Base A41 `a41ee02ba4156d93633787f55e85e8590936bc0f`: own1174/lint/fulltypes/build66 y native85/320/restauración/roles PASS; audit5HIGH FAIL; preview292PASS/18FAIL y Supabase101PASS/6FAIL. Los fallos se conservan completos, con artefactos propios; A41 no es elegible para composición.

Los18 fallos de preview son de selección Agenda antes del primer click en la renovación. Los seis fallos Supabase son task_create_complete_persist, meeting_create_reschedule_cancel_persist, task_reopen_start_update_cancel, meeting_update_complete_no_show, calendar_customer_association_persist y calendar_manual_renewal_update_resolve, todos TIMEOUT. Auth/grounding/history/private-boundary/teardown propios pasan: eso no convierte el producto en PASS.

El guion genera “hoy” mediante toISOString().slice(0,10), día UTC. La UI usa calendarDate y Europe/Madrid. En domingo UTC/lunes Madrid la semana es distinta. Las capturas fallidas propias de tarea y renovación revisadas muestran12–18oct mientras los datos del guion pertenecen al11oct UTC; no se extrapola revisión visual a los seis fallos completos.

La prueba preview ahora fija un instante precisamente en esa frontera y toma el día desde calendarDate, conservando nueve combinaciones de modo/anchura por proyecto. Es la corrección ya publicada en raíz2f85;9 casos locales de navegador con transporte sintético pasan. El guion de Supabase toma su “hoy” de la misma función del producto. No congela reloj Auth/servidor, no altera registros para simular persistencia, no retira operaciones/assertions ni amplía plazos. Es corrección de fecha de setup para un recorrido de la fecha actual; el producto no cambia.

Regresión pura cubre frontera de semana y ambas temporadas DST. Control del constructor positivo, métodos, conexión persistente, transporte cerrado y pruebas de interrupción permanecen intactos. No hay migración, resource W5, cambios de W4/W5 o activación.

La nueva fuente exige sus propios1175/preview310/native85/320/Supabase107. No hereda9locales ni ningún PASS de otra fuente, ni borra A41. Si alguno falla se conserva antes de continuar. Issue10 OPEN; ausencia autoritativa/full11/full23/handler/reinicio/revisión W4 pendientes; IA writes OFF, lanzamiento NOT_ACCEPTED.
