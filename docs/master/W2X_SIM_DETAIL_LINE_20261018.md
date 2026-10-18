# SIM/eSIM: vigencia de los padres de la línea asignada

CLAIM 6251524669. Base `dfeb8228e3b56b785049d111a9ee48349d956a69`; rama propia `codex/w2x-sim-detail-line-20261018`.

La reproducción original terminó con un fallo y un caso correcto en 19,3 s. Se retuvo el punto de línea después de `sim.get`. Cambiar de recurso permitía completar el detalle nuevo, pero la respuesta antigua todavía iniciaba las consultas del servicio y contrato anteriores. El control que conserva la SIM física vigente pasa.

El lector de detalle entrega ahora su predicado `isCurrent` existente al `readLineContext` de la línea asignada. No cambia el helper, ningún servicio, estado, efecto, comando, recibo o CAS. La reversión textual del único argumento devuelve exactamente el archivo padre. El control existente de selección de línea para asignación permanece intacto.

La colección propia contiene 120 casos: 30 de la nueva ventana para SIM física/eSIM y cinco contextos en tres anchos; 30 de la frontera previa al detalle; y 60 de recuperación postcomando. Termina con **120/120 correctos en 3,1 minutos**. Los positivos consultan ambos padres; retirar recurso, empresa, actor o rol evita nuevas consultas de los padres anteriores después de liberar el punto. El banco nuevo no envía comandos; las regresiones incluyen acciones manuales simuladas.

No se cancela la solicitud de línea ya enviada. Las cantidades registran dos peticiones concretas de interfaz; no acreditan ausencia de efectos SQL, autoridad, permisos reales ni recuperación durable. Lint, build66, scan, diff, cola y publicación propios quedan registrados en el checkpoint externo, sin herencia de otros SHAs.

## Capturas revisadas

- sim-detail-line-physical-current-1440.png — SHA256 c943dbd9c6595397f7f3a65dca1a813d3d992546e3e8b7c8825a04af8c9bebbc
- sim-detail-line-physical-current-390.png — SHA256 f238d68bbe1affbede6fdf78b4712fe73f5b0274026d791b4387ccbe7010f238
- sim-detail-line-physical-current-768.png — SHA256 ff75927490a7f27beeedb5e5170b2a9bc3a8d07bc6734ae5161898cd26638ed5
- sim-detail-line-esim-current-1440.png — SHA256 10bda2bbb24924d3993fecbb7898bc8bf40a10cf4623550841c710f1179e17f9
- sim-detail-line-esim-current-390.png — SHA256 c402f65b48abbc879701311c5a63f8f5b34f289c76d57715cb50f82ee4208f5d
- sim-detail-line-esim-current-768.png — SHA256 0dabf0a2b0e70c3074339c99f3bfd557ec293a2c9c28f01789751397741d6f27

Se han visto seis capturas vigentes: física y eSIM en 390/768/1440. Cliente, operador, estado, ICCID/EID enmascarados, fechas y enlace de línea legibles; paneles de sustitución e historial parcialmente visibles. No se revisan visualmente todos los contextos retirados ni las secciones inferiores móviles. Navegación de prueba, controles de empresa/actor/rol y UUID del fixture quedan fuera de la aceptación de producto. Las capturas no prueban ausencia de solicitudes: esa medición proviene de los registros HTTP.

Componentes, repositorio y parsers reales; HTTP/DTO sintético. Auth/DB, JWT/RLS, Next integrado y modelo vivo: NOT_RUN; API de pago: 0. Matriz342/27 PARTIAL/315 sin reconciliar/0 READY. Cinco HIGH y W4 pendientes; IA comercial writes OFF, issue #10 OPEN y release NOT_ACCEPTED. Global1479 de Agenda separado y sin esta corrección. F736/B9/981/1266 y fallos históricos de fixture/preparación preservados. Fuentes ajenas, W3/W4/W5 y recurso nativo intactos.
