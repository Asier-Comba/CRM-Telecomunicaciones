# Portabilidad: vigencia de padres durante la lectura de detalle

CLAIM 6251454362. Base `dd4b9f5231527adaa72779010ffcd2569571fbb4`; rama propia `codex/w2x-portability-detail-line-20261018`.

La reproducción original terminó con un fallo y un caso correcto en 20,7 s. Se retuvo la lectura puntual de línea después de `portability.get`. Al cambiar de referencia y completar el detalle nuevo, la respuesta antigua todavía iniciaba las consultas del contrato y servicio anteriores. El caso que conserva la referencia pasa.

El lector de detalle entrega ahora su `isCurrent` existente a `readLineContext`. El helper conserva su implementación. No se añade estado, efecto, servicio o mecanismo de autoridad. La reversión textual del único argumento devuelve exactamente el archivo padre; se conserva la corrección independiente de selección de la unidad 54. No cambian comandos, recibos, CAS ni callbacks de escritura.

La colección propia contiene 66 casos: 18 en la nueva ventana de línea retenida, 18 de la frontera anterior al detalle y 30 de recuperación postcomando. Termina con **66/66 correctos en 1,8 minutos**. Las comprobaciones estáticas, el scan y la publicación se registran por separado en el checkpoint externo, sin heredar verdes de otros SHAs.

El banco nuevo mide peticiones concretas de contrato/servicio antiguos después de volver a una referencia distinta, cambiar empresa, actor o rol. Tras el cambio no se encadenan padres antiguos; los controles vigentes de entrada y salida sí consultan ambos padres. No envía comandos. Otras regresiones incluyen acciones manuales simuladas. Las solicitudes de línea que ya estaban en vuelo no se cancelan; estos ceros medidos no prueban ausencia de efectos SQL ni autoridad, permisos reales o durabilidad.

## Capturas revisadas

- portability-detail-line-reference-1440.png — SHA256 34a0bf16c13487a549b61b8583627e2c004eb5f1443e52efb802947ed9aa3ab3
- portability-detail-line-current-1440.png — SHA256 431a0eea901f23a36d14aa76521e8a98ce055794b4b5580e73f95526c6a6c528
- portability-detail-line-current-768.png — SHA256 12269291098890c6487542b21385309aec724516a6f3a395488b3c18d98e6e92
- portability-detail-line-current-390.png — SHA256 dc9c6f8ab916fbb392043acb4d943d178cb57faba9b1de13e3c22fa6f2c4bf70
- portability-detail-line-reference-390.png — SHA256 0956f36dcdbb7088ccbbe40f71584f4aa60ccbeda8cd0ad827a1c0992b04cdb6
- portability-detail-line-reference-768.png — SHA256 967322adf1c3d95ebf19ad84256f48975d56e2becad169cf2c55bd695a984428

Se han visto seis capturas: referencia vigente y referencia B después de retirar A, en 390/768/1440. Cabecera con cliente, operadores, fechas y enlaces; editor inferior parcialmente visible. Controles de cambio de contexto, navegación y UUID del fixture quedan fuera de la aceptación de producto. Los otros contextos y salida tienen aserciones, pero no aceptación visual individual en este informe.

HTTP/DTO controlado con componentes, repositorio y parsers reales. Auth/DB, JWT/RLS, Next integrado y modelo vivo: NOT_RUN; API de pago: 0. Matriz: 342 requisitos, 27 revisiones parciales, 315 sin reconciliar y 0 listos para release. Cinco HIGH y revisión W4 pendientes; IA comercial writes OFF, issue #10 OPEN y release NOT_ACCEPTED.

Los globales 1434 BC3 y 1479 de Agenda tienen fuentes distintas y no incluyen esta corrección. F736, B9, 981, 1266 y los fallos históricos de fixture/preparación se preservan. Fuentes ajenas, W3/W4/W5 y recurso nativo sin cambios.
