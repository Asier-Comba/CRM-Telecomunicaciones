# Portabilidad: padres de línea tras el recibo de creación

CLAIM 6251598765. Base `de72a8096a3e4dbce2109fae5d8c750871615f0a`; rama propia `codex/w2x-portability-create-parents-20261018`.

La reproducción original termina con un fallo y un caso correcto en 27,4 s. Tras un recibo válido y la consulta de portabilidad, se retiene el punto de línea. Retirar el formulario permite todavía iniciar las consultas de servicio y contrato antiguos al liberar ese punto; el control vigente pasa. Se conserva el fallo original, separado de fallos de fixture históricos.

La lectura confirmada de creación entrega ahora `()=>mounted.current` al `readLineContext` existente. Se reutiliza su frontera de vigencia sin modificar helper, servicio, efecto, comando, recibo, CAS ni las protecciones previas de selección y detalle. Revertir el único argumento devuelve exactamente el archivo padre.

Los controles propios terminan con **114/114 correctos en 3,7 minutos**: 30 de la nueva ventana, 60 de recuperación del alta, 18 de selección de línea y seis de dirección. Entrada/salida y recurso/empresa/actor/rol retirados se ejercitan en 390/768/1440. Retirar el contexto impide encadenar los dos padres concretos después del punto retenido; los controles vigentes consultan ambos. Cada caso nuevo usa una acción manual simulada y conserva las referencias del comando y recibo. No se cancela una solicitud ya enviada ni se acredita persistencia o ausencia de efectos SQL, autoridad o durabilidad.

Build66, lint sin errores y tres warnings conservados, scan, diff, cola y publicación se registran en el checkpoint externo. No hay herencia de controles de otro SHA.

## Capturas revisadas

- portability-create-parents-current-inbound-1440.png — SHA256 2f370a15ca01aa89420b1444abcc0080c1eeade8c4015ca6c6e4475c5a0fd2c0
- portability-create-parents-current-inbound-768.png — SHA256 67740685ca95e676d90f6874efa034f7d23f74543bab540a2c0c235944abe889
- portability-create-parents-current-outbound-768.png — SHA256 61828b22fa07f90f961b09353da52e58d20c21a8c1ec9924bd320c9f67223380
- portability-create-parents-current-inbound-390.png — SHA256 863981ab01d312dece8ea05dfbe48cda011d2332d7958b44d7d7e444561ea9ae
- portability-create-parents-current-outbound-1440.png — SHA256 59dc5cd0bc25017ef496e01c0e84efa614c1192822a1b5ec82d1f1d02db901df
- portability-create-parents-current-outbound-390.png — SHA256 b2e28a8fc4bf1539fa96a9cadcb3f6f7c0a4f104d91897020562df680b0c2275

Se han visto seis capturas de entrada/salida vigentes en 390/768/1440: aviso y enlace registrados, número enmascarado, operadores, dirección, fechas, estado borrador y paginación. Los botones de cambio de contexto y navegación del fixture quedan fuera de la aceptación. Los contextos retirados no tienen aceptación visual individual. Estas imágenes no prueban persistencia real ni ausencia de solicitudes; las cantidades provienen del registro HTTP controlado.

Componentes, repositorio y parsers reales; HTTP/DTO sintético. Auth/DB, JWT/RLS, Next integrado y modelo vivo NOT_RUN; API de pago 0. Matriz342/27 PARTIAL/315 sin reconciliar/0 READY; cinco HIGH y W4 pendientes; IA comercial writes OFF, issue10 OPEN, release NOT_ACCEPTED. Global1479 de Agenda separado y sin las correcciones54–57. El global1575 está en espera de esta publicación y del cierre publicado de1479, sin duplicar ejecución. F736/B9/981/1266 y fallos anteriores de fixture/preparación preservados. Fuentes ajenas y W3/W4/W5/recurso nativo intactos.
