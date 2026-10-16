# Factura: paginación de relaciones sin controles inoperantes

CLAIM6213599725; basefa3e16853b4467e554d96af49ac9aeb315978761; rama propia codex/w2x-invoice-relation-compact-20261016.

Pulido reversible de UX, no fallo de negocio ni nueva primitiva. Baseline existente labels390:1PASS11s y captura realmente vista muestra oportunidad vacía con Anteriores/Más deshabilitados, ocupando filas antes del contrato. Captura y fuente padre publicadas se conservan. No se convierte ese PASS en un FAIL causal.

Solo se envuelven los dos botones de paginación en una condición: cursor previo o next. Actualizar siempre se conserva. Una página inicial con next mantiene los controles; en segunda página sin next conserva Anteriores. No se altera ningún handler, lectura normal, verificación de id/cliente/contrato/operador, guard de vida o permiso. No se crea pantalla, servicio ni helper.

Para este cambio pequeño se usan pruebas existentes, sin nueva batería ornamental:15 selección de contrato (etiquetas, página21, operador denegado, lista denegada y cliente distinto en390/768/1440), más9 vida de preparación.24 propios en46.3s. Seis capturas labels/page a390/768/1440 realmente revisadas muestran Actualizar en oportunidad/servicio vacíos y los controles necesarios del contrato. En390 siguen fuera del viewport parte de servicios/conceptos/acciones;visual parcial, no aceptación de todo el formulario. El checkpoint externo registra lint/build66/diff/scan/cola propios y sus hashes.

HTTP/DTO sintético con componentes/repositorio/parsers reales, sin guardar/emitir en estos bancos. Auth/DB/JWT/RLS, navegación Next integrada y modelo vivoNOT_RUN;API0. No hereda63/1311/1362. Global1311de4221edc activo aparte y1362deFA3 espera terminal/publicación. Cola342/23PARTIAL/319sinreconciliar/0READY. Original1266de2741fb8FAIL1253PASS13FAIL y13complementariosPASS16.1s mismoSHA se conservan;no1266singlePASS. F736/B9/981 original/primer210/script33 intactos. HIGH5/W4 pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. Fuentes ajenas/W3/W4/W5/recurso sin cambios.
