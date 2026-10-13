# Cinco entidades actuales con metadatos documentales

La nueva unidad mantiene la comprobación de cuatro entidades e incorpora una
quinta lectura: metadatos activos vinculados directamente al mismo cliente.
Cada grupo conserva su propia fuente/ref/readAt y sus hechos registrados;
no se deduce contenido, indexación, disponibilidad, cobro, resolución externa
ni instalación física. Permisos y ejecutor/renderer existentes no se cambian.

Un nuevo caso se añade al banco sin alterar los 218 anteriores. El banco219
sigue cubriendo36 lecturas y220 entradas únicas. Tres pruebas controladas
verifican cinco fuentes/hechos mínimos, denegación completa antes de consultas
para viewer/member y retirada de los cuatro grupos ya leídos cuando la última
referencia es ajena, la autoridad cambia o el último DTO es malformado.
Estos controles no miden calidad de un modelo vivo.

La aceptación Auth/DB desechable preparada añade tres turnos: lectura de cinco
entidades, documento ajeno sin consulta documental/con descarte de todos los
hechos y revocación al terminar la quinta lectura/sin respuesta final. Se
restaura únicamente la membresía de la fixture y se cancela ese turno mediante
el servicio existente. Los snapshots y las cuatro limpiezas V3 permanecen.
Esta ejecución nueva está NOT_RUN hasta su propio job.

Historial esperado propio Leaf50/29/21; futura composición SIM55/32/23. El
consumidor de aceptación pagina `message.page` por after_sequence, valida cada
DTO con el parser existente y exige cierre completo, sin IDs duplicados ni
resultado parcial aceptado. Máximo cuatro páginas/200 mensajes; sin retries,
permisos o endpoint nuevos. Tres pruebas cubren55 registros en dos páginas,
denegación/ID repetido/cursor inválido en página tardía y límite fijo/input
inválido antes de llamar al puerto. Los registros privados no se exportan.

Nuevos propios previstos1338 (557 bootstrap +781 assistant)/352/native85_320
con las dos lecturas físicas del driver/Sup107/50_29_21/cleanupV3 cuatroPASS.
Futura raíz1356 (562+794)/352/55_32_23, banco220 y37 lecturas, por verificar.
La raíz04F sigue con su propia1346/352/50_29_21; no se cancelan ni heredan checks.

W4 independiente, W5 recurso/restart, full23, RAG operativo y modelo vivo no se
acreditan. Metadatos no autorizan extracción o indexación documental. No API
de pago. IA writesOFF; releaseNOT_ACCEPTED; cincoHIGH pendientes.

El primer job físico del driver1B3 pasó la nueva lectura de completion y su
backend cerrado/ausente, pero reconciliation falló con ReferenceError: el probe
referenciaba `candidate`, nombre de la otra fixture. Esta unidad corrige a
`record.operationRef`, el mismo binding de los inspectores de operación/efecto
adyacentes. Job115089303707 y su salida original se conservan; no son un PASS
nativo completo. Se exigen dos observaciones físicas propias en el nuevo SHA,
sin relajar assertions ni cambiar recursos/primitivas.
