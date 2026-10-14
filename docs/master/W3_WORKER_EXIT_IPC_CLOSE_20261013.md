# Salida y cierre IPC del worker — W3

SOURCE461 CI38415016681/job115357031502:589 bootstrapPASS;814/815 assistantPASS.
`durable-recovery-identity.test.ts:45` observó20 conexiones sintéticas y exigía21.
La causa completa de ese fallo sigue UNKNOWN porque el runner no registraba
la primera fase. Se conserva su log y no se reduce el contador ni se relanza
la fuente idéntica. No es un resultado de conexiones PostgreSQL ni full23.

Se reproduce independientemente un defecto de orden en el controlador: el
evento exit podía preceder un resultado IPC ya encolado. Resolver/fallar allí
también aceptaba un resultado antes de observar mensajes duplicados posteriores
a exit pero anteriores al cierre. Tres pruebas de eventos sintéticos fallan
sobre el código anterior; no se presentan como procesos o DB reales.

El controlador registra exit y decide en close, después del cierre del canal,
exigiendo los mismos ready/start/result, código0/sin señal y salida observada.
Rechaza resultados ausentes, salida anormal y mensajes duplicados tardíos.
No admite un ready/checkpoint ni un start sobre un proceso ya salido. Un corte
sigue exigiendo el checkpoint solicitado y SIGKILL observado; no amplía los30s.
Referencia primaria: [Node22 close/exit](https://nodejs.org/download/release/v22.23.0/docs/api/child_process.html#event-close).

El runner registra además únicamente escenario y etapa cerrados en su fallo,
sin errores originales, SQL, credenciales, paths ni nueva observación de negocio.
Esto permite investigar un nuevo fallo sin inventar la fase del anterior.
Las pruebas originales de procesos y el contador21 siguen siendo obligatorios.

No hay resultados heredados, revisión W4 ni aceptación de full23/ausencia/
quiescencia. IA writesOFF; modelo vivoNOT_RUN; releaseNOT_ACCEPTED.
