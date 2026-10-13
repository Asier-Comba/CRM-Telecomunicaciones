# Primer fallo observable de Agenda — W2

Diagnóstico de solo lectura W5, issue67/comment6147188352: SOURCE444,
Supabase38400090067/job115305177965 completó 15 recorridos y falló en
`calendar_real_cursor_next_previous`, espera inicial de `calendar.list` con
estado pending y cliente actual. Se observó un timeout de 30s seguido por
`triggerUncaughtException`; faltan resumen final y evidencia de limpieza.
La causa de no recibir la respuesta continúa UNKNOWN. No es aceptación W4.

El callback espera una respuesta antes de ejecutar `selectOption`, pero no
observaba todavía su rechazo mientras aguardaba esa acción. Reproducción sobre
el callback exacto, con UI/SQL/transporte sintéticos: un rechazo temprano mata
el proceso antes de que el check pueda capturar su fallo o terminar el finally.

Ahora ambas promesas de respuesta tienen un handler de rechazo inmediato. Se
conserva la promesa original y se vuelve a await en el mismo lugar: el timeout
sigue fallando y llega al check, con la limpieza propia del callback. Dos
pruebas de proceso ejercitan por separado la primera y segunda espera.

No se han cambiado tiempos, selectores, consultas, acciones, fixtures, asserts,
reintentos, permisos ni producto. Tampoco se modifica `run-stack.mjs` de W4.
Esto corrige la propagación del fallo y recupera la posibilidad de obtener
evidencia final; **no demuestra que el recorrido Supabase haya pasado ni explica
todavía la ausencia de respuesta**. La nueva fuente requiere sus propios
controles completos y diagnóstico si vuelve a fallar.

IA writes OFF; modelo vivo NOT_RUN; full23 NOT_RUN; release NOT_ACCEPTED.
