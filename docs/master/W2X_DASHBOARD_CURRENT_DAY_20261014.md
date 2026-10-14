# Dashboard: actualizar la agenda del día vigente

CLAIM W2-X #67 /6167049367. Base60c81396e20ba368ce07f141aaa081c9846c794e.

## Defecto reproducido

Una sesión abierta a23:59 de Madrid conserva el día inicial. Al cruzar medianoche y pulsar Actualizar, la petición calendar.list sigue usando la ventana anterior: range_start2026-10-07/range_end2026-11-15 en lugar de2026-10-08/2026-11-16. La prueba original falla comparando las peticiones observadas; log, contexto y captura se conservan.

## Corrección

La acción Actualizar toma de nuevo la fecha mediante calendarDate existente (Europe/Madrid), junto a la recarga. La ventana, Reuniones de hoy y los siete días visibles se calculan desde esa fecha actualizada. Se conservan ámbito personal/espacio, assigned_user_id, límite100 y las consultas existentes. Sin temporizador, nuevos servicios, contratos o cambios backend. La fecha se renueva mediante la acción explícita; no se acredita actualización automática de una sesión inactiva.

## Verificación propia

- 39 pruebas HTTP controlado PASS (53.6s):30 casos de día de verano, invierno, cambio de año, denegación tras actualizar y actualización dentro del mismo día, con ámbitos personal/espacio en390/768/1440;9 regresiones de retirada de recursos Customer360.
- Se comprueban ventana exacta, ámbito, reunión vigente y ausencia de la reunión anterior tras cambiar de día. Una denegación retira reuniones previas. Sin comandos comerciales.
- Lint y build66 PASS de esta fuente funcional. Escaneo del diff antes de publicar.
- Tres capturas summer-my390/768/1440 inspeccionadas:15oct como día vigente, reunión correcta, acciones y estado legibles, sin desbordamiento horizontal visible. Revisión parcial de agenda; no aceptación completa de dashboard, periodos o métricas financieras.

Reloj, respuestas y datos del fixture son controlados y sintéticos. Los recuentos y panel financiero simulados no son mediciones de DB, durabilidad o modelo. Componentes, repositorio, validadores y formato de Madrid reales. Auth/DB/Storage real NOT_RUN; modelo vivo NOT_RUN/API0.

CincoHIGH, revisión W4 y ACK principal pendientes; IA writesOFF, issue10OPEN, releaseNOT_ACCEPTED. Los fallos7F/F736/B9/3c7 conservan su alcance y causa desconocida cuando corresponde. Estos39 no se atribuyen a la composición7e015 ni a33dc documental; una integración funcional nueva requiere controles propios.
