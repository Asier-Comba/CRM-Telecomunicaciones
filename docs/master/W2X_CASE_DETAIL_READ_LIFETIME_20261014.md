# Incidencias: retirar la lectura del cliente al cambiar de registro

CLAIM W2-X #67 /6167356434. Basea21bdabe9e3c3b14c040803075515fb97ebb3be4.

## Defecto y corrección

Una respuesta case.get retenida llega después de seleccionar otra incidencia. La instancia anterior iniciaba customer.list de su cliente, aunque ya estuviera retirada: lecturas esperadas0/observadas1. El panel nuevo ya estaba protegido por su identidad; no se declara sobrescritura de su estado ni fuga de autorización del servidor.

La carga inicial del detalle comprueba su condición active antes de iniciar la lectura de identidad del cliente, manteniendo la comprobación posterior existente. Sin cambios de backend, contratos, permisos, servicios ni comandos de incidencia. Alcance: carga inicial y cambio de registro; no se acredita toda continuación de cambios comerciales ni todos los cambios de contexto.

## Fallos conservados

El fallo causal original conserva peticiones y captura. La primera suite del producto corregido terminó12PASS/9FAIL (3.7min): el fixture omitía assignee.list del nuevo editor y devolvía403 por fallback, produciendo una alerta legítima. Se mantiene la aserción de ausencia de alertas; el fixture añade exclusivamente una página vacía válida del catálogo ordinario de responsables.

Con ese fixture corregido se repite la reproducción sobre todos los blobs src originales dea21, comprobados por Git: vuelve a fallar0/1 customer.list. Después se restaura el fix desde copia con hash verificado. Original, fallo de fixture, reproducción refinada y resultado final permanecen separados. CASE_NOTE_CURSOR deB9 conserva causa completaUNKNOWN; esta corrección no se presenta como su reparación.

## Evidencia propia final

- 21 pruebas HTTP controlado PASS (37.9s):9 nuevas para case.get tardío exitoso/denegado y lectura de cliente ya iniciada, en390/768/1440;3 regresiones de notas privadas paginadas y9 de recursos Customer360.
- Lint completo/build66 iniciales conservados; después de corregir fixture, lint de archivos cambiados y build66 final PASS. Escaneo del diff antes de publicar.
- Tres capturas finales case_success390/768/1440 inspeccionadas: incidencia2, cliente2 y campos correctos visibles, sin alerta antigua ni desbordamiento horizontal visible. Revisión parcial del detalle, no aceptación visual integral de Incidencias.
- Las pruebas registran las peticiones efectivas, mantienen la nueva selección y no envían comandos comerciales. No eliminan ni cancelan una petición ya enviada.

Componentes, repositorio y validadores reales; HTTP y datos simulados. Auth/DB/Storage reales NOT_RUN; modelo vivo NOT_RUN/API0. HIGH5, W4 y ACK principal pendientes; IA writesOFF, issue10OPEN y releaseNOT_ACCEPTED. Fallos7F/F736/B9/3c7 y sus límites se conservan. La composición2c457 tiene sus611 propios; estas21 pertenecen exclusivamente a esta unidad y requieren composición con pruebas nuevas antes de integrarse.
