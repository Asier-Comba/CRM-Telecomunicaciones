# Diagnóstico acotado de Cartera y preparación de Incidencias

La candidata92D tuvo 95/107 controles UI PASS y doce fallos. El primer recorrido
`portfolio_manual_service_line_renewal_source` registró TIMEOUT sin identificar
la espera concreta. La captura mostraba la Cartera, pero no demuestra la causa.
Otros controles registraron fixtures ausentes; el de creación de incidencia
registró SYNTAX_ERROR y una captura de la página anterior de Catálogo. No se
atribuye ese fallo retrospectivamente a un campo o a una respuesta HTTP.

El recorrido de Cartera informa ahora del último paso antes de la espera:

| Paso | Operaciones y comprobaciones originales |
|---|---|
| 1 | Buscar cartera |
| 2 | Contrato manual visible |
| 3 | Abrir y guardar servicio |
| 4 | Cierre del diálogo de servicio |
| 5 | Abrir línea del servicio |
| 6 | Guardar línea |
| 7 | Cierre del diálogo de línea |
| 8 | Crear renovación |
| 9 | Cierre del diálogo de renovación |
| 10 | Abrir activo importado y comprobar solo lectura |
| 11 | Cerrar panel, verificar persistencia y capturar |
| 12 | Recorrido de creación de renovación desde cliente |

Solo se añaden etiquetas numéricas cerradas al informe existente. No cambian
selectores, orden, comandos, asserts, SQL, tiempos, cantidad de recorridos ni
aceptación. Una etiqueta indica el grupo de operaciones activo, no distingue
automáticamente todas las esperas que contiene ni prueba una causa.

La creación de incidencia marca primero `case:create_relation_fixture` y
comprueba si el SQL de preparación devuelve una fila antes de parsearla como
JSON. La ausencia sigue siendo FAIL, ahora `CASE_RELATION_FIXTURE_MISSING`, sin
crear un sustituto, ocultar el fallo o continuar con una relación inventada.
SQL/JSON no válidos continúan fallando. No se registra el contenido de la fila.

Lint, sintaxis y comparación de operaciones con el padre son controles locales
de esta observación. Su ejecución real necesita los artefactos de la candidata
que la contiene. Un pase posterior no demuestra la causa de los fallos92D ni
repara por sí mismo la aplicación. IA escrituras OFF; release NOT_ACCEPTED.
