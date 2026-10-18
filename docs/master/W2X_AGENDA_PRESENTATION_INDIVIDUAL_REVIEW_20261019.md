# W2-X98 — Evidencia individual de presentación de Agenda (PAR-086)

CLAIM6256186931. Se añaden dos evidencias con fuente `93bf52435b1b8e10070880bd2c2109a8d282f170` y árbol `eb9f287189f5e494876d714fcd319a39e6df3800`. Se conserva la fuente primaria `282f2e1efb8d38d9d06682060ae80bd2d8042434`, sus dos evidencias, etapas y límites. Las31 otras revisiones y341 filas permanecen iguales; siguen32PARTIAL/310sinreconciliar/342/0READY.

## Evidencia propia de93

72 casos pasaron en1,8min, compilación66, analizador sin errores con tres avisos, scan y publicación propios. Nueve casos son pertinentes: seis títulos largo/ordinario y tres de foco/filtros de Agenda en390/768/1440. Los63 restantes son contexto; no se presentan como capacidades adicionales de Agenda ni se atribuyen al SHA de esta revisión.

Estos nueve montan Calendar directamente, con entradas sintéticas y HTTP para los assets; no atraviesan repository o parsers de calendario. Comprueban título completo en tarjeta, geometría de próximas citas, apertura/cierre local del detalle, filtro por tipo conservado, elección de fecha y Hoy. No navegación Next o calendario integrado, backend, AuthDB, seguridad multiempresa o roles reales aceptados. Los contextuales de la suite conservan solo su alcance.

Las causas originales de93 se mantienen separadas: dos rutas de fixture fallidas, dos selectores ambiguos, un fallo real de geometría y un nombre de cierre incorrecto en test. El control ordinario corregido pasó una vez en12s sobre el padre sin cambiar producto. También se conserva el guard fallido de preflight por recoger observaciones contextuales; su corrección no volvió a ejecutar la suite. No convertir los resultados originales en un1FAIL1PASS ni ocultar fallos de preparación.

## Visual y límites

Seis imágenes iniciales de Agenda realmente vistas en93: largo/ordinario en390/768/1440. Las seis del detalle son contexto. Próximas citas en390/1440 queda parcialmente fuera del primer cuadro, con geometría DOM como evidencia; no aceptación de imagen completa. Esta revisión solo indexa los hashes de los originales y no crea imágenes de su propio SHA.

| Imagen original | SHA256 de bytes |
| --- | --- |
| calendar-title-ordinary-390.png | `63151cb4644e8272578dc263c14dec9f9cfe89a08d486fe834c67567f98b4316` |
| calendar-title-ordinary-1440.png | `a1ad144ef8b8a99af177127413750b5e9c659710d4d99e38865e1f39e885b7be` |
| calendar-title-ordinary-768.png | `97b2afe138feffeacf02746b580d0600ce14d1cd425e7a6cbec6894b172a5e7a` |
| calendar-title-long-1440.png | `424e79da14ce3302ab8659c984c830438a12a3182244a1dbb33a3c38f0da873d` |
| calendar-title-long-390.png | `449f8113fd2645cc86bfa0a4c90e7052a967441f6c87a949791ce859dd7a6754` |
| calendar-title-long-768.png | `2fd7198eaf9a5735d32c602ff07580ba924cef197068026fb8133fa05fce9eeb` |

No se modifican etapas ni se promociona BROWSER_ACCEPTED, PROVEN_BACKEND, SECURITY_ACCEPTED o RELEASE_READY. Quedan pendientes la fila completa, calendario integrado, Auth/DB, roles, todos los estados/zonas/paginación, accesibilidad y W4. IA comercial writesOFF, modelo vivoNOT_RUN, API0, cincoHIGH visibles, issue10OPEN, releaseNOT_ACCEPTED; sin ausencia/quiescencia/reinicio/handler/full23. F736/B9 conservan su causa completa desconocida.

Los controles globales2043/source88,2109/source92 y2139/source97 siguen su FIFO y no acreditan esta metadata. No hay cambios de src/tests, datos reales, ramas principales/ajenas/congeladas, W3/W4/W5 o recurso nativo.
