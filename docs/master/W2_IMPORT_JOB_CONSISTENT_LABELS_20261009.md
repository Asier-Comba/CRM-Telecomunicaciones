# Etiquetas coherentes de trabajos de importación

Las capturas reales de cartera de95, run37963658888/product11633471410,
mostraban `uploaded` en las filas y una familia sin nombre. El filtro y el
detalle ya tenían etiquetas de estado españolas, pero la fila usaba sólo el
diccionario global de Status. El diccionario de familias cubría8 de los18 tipos
permitidos por el parser de importjob.v1.

Se reutiliza la etiqueta cerrada de estado de ImportJobs en su fila. Status
acepta una etiqueta visual opcional y conserva el valor original para el color;
todos sus consumidores previos conservan su etiqueta por defecto. Se completan
las10 familias de importación omitidas. No se cambia ningún estado, tipo,
contador, parser, repositorio, permiso, lectura, paginación, confirmación, CAS,
cancelación, transporte ni contrato. Carga/validación/aplicación siguen bloqueadas.

La reproducción nativa usa ImportJobs/Status/Badge, repository.post/importJobs/
importJob, parsers cerrados, React19, Tailwind y Geist reales. HTTP e identidad
son adaptadores explícitos en memoria, sinAuth/SQL ni procesamiento de archivos.
Los18 registros sintéticos cubren18 familias y8 estados; el parser exige
can_cancel y failure_code coherentes. En las3 anchuras1440/768/390 la versión
anterior deja10 familias sin nombre y16 etiquetas de estado distintas del filtro;
la actual no deja ninguna. Controles/etiquetas completos, sin overflow horizontal.
Los8 filtros y lecturas de detalle conservan sus estados reales y permisos de
cancelación; miembro/lector no muestran el panel ni realizan esas lecturas.
Resultado:57lecturas/0comandos/0pageerrors. No se ejecuta una cancelación mediante
el adaptador visual ni se acredita Auth/RLS/Postgres/W4 con esa prueba.

Las14 pruebas existentes de importjob y del cliente de integración pasan,
incluyendo pertenencia, rechazo de datos no minimizados, bloqueo de begin/apply/
resume y CAS de cancelación. Las primeras ejecuciones de la reproducción
fallaron por un import de fecha ausente en su adaptador de módulos; se incluyó
el módulo real. No era un fallo del producto y no se alteró código para ocultarlo.

Unidad aislada sobre el ejecutado96 a3ca711c0b78177b40beaf6d75638b60c733c82b.
No hereda107 ni aceptación visual de su base: requiere su propio gate completo,
calidad y revisión de las capturas de cartera/importaciones antes de consumo.
Audit5HIGH/#29, durabilidad física/#10, W4, instalación persistente Windows,
semántica viva y aceptación comercial permanecen pendientes; IA negocio OFF.
