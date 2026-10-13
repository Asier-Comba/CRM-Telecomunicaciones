# Controles de historial tras añadir facturas

La fuente4F2AB cerró1202 funcionales/316 navegador/PostgreSQL85/320, pero su
Supabase propio falló en `IMMUTABLE_HISTORY`, antes del producto. Auth y teardown
PASS; grounding/historial/producto no completados y sin107 heredados. Evidencias
seguras e histórico originales se conservan en el checkpoint de4F2AB.

El fixture añadió tres turnos de facturas (lectura autorizada, referencia
extranjera y revocación), conservando un control final del fixture anterior:
18 mensajes,10 usuarios y8 respuestas. Los turnos nuevos requieren exactamente
23 mensajes,13 usuarios y10 respuestas: el turno revocado no puede tener final.
El origen seguro del fallo señala el predicado conjunto de conteo/privacidad;
no contiene los conteos observados y no prueba por sí solo una fuga de datos.

La corrección actualiza exclusivamente los conteos del fixture al nuevo guion
y separa las comprobaciones exactas de cantidad/rol y minimización de contenido.
Se mantiene el límite50 del historial y se amplía la exclusión de datos privados
para incluir contrato/importe de factura. No se cambian aserciones de permisos,
revocación, resultado financiero, cancelación, SQL ni timeouts.

Tipos, código comercial y parsers del asistente permanecen idénticos. Los
recorridos locales específicos de facturas y privacidad de historial se distinguen
del Auth/DB desechable real: la corrección requiere un nuevo107 propio antes de
ser elegible y no convierte4F2AB retrospectivamente enPASS. Modelo vivoNOT_RUN,
RAG inerte, IA writesOFF, W4 pendiente y releaseNOT_ACCEPTED.
