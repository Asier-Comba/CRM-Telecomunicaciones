# Portabilidad: no encadenar lecturas de una línea retirada

CLAIM 6251383126. Base `4deb73d92f5136a6ce511af586fd5c98f329a9bf`. Rama propia `codex/w2x-portability-line-retirement-20261018`.

La reproducción original terminó con **2 fallos y 1 caso correcto en 34,2 s**. Después de seleccionar B, retener su consulta puntual y volver a A o cerrar el formulario, la respuesta de B todavía iniciaba `portfolio.get` para su servicio y contrato. El estado visual ya se protegía, pero las dos consultas adicionales seguían saliendo. El caso que mantiene B seleccionado funciona como control positivo.

El efecto de selección pasa ahora su predicado `() => active` al `readLineContext` existente. Su control de vigencia impide iniciar esas consultas dependientes cuando la selección se ha retirado. No se modifica el helper, ningún servicio, contrato, comando, recibo ni lectura posterior a un comando. Una reversión textual de ese único argumento debe devolver exactamente el archivo del padre.

La colección propia contiene 84 casos: 18 de retirada/cierre/vigencia en entrada y salida a 390/768/1440; 60 de recuperación de creación; y 6 de dirección de portabilidad. Termina con **84/84 correctos en 2,4 minutos**. Los controles estáticos y la publicación se registran por separado en el checkpoint externo. No se heredan los resultados globales de otras fuentes.

En el banco nuevo se mide el número de peticiones a los dos padres concretos de B: cero tras retirada o cierre y dos cuando B sigue vigente. No se envía ningún comando. Se conserva la solicitud de línea que ya estaba en vuelo: esto no acredita cancelación de red, ausencia de efectos SQL, autoridad, permisos reales ni un método de durabilidad.

## Capturas revisadas

- portability-line-inbound-retired-1440.png — SHA256 a490744f1c3b19bbba3f6fb23ca7a84f3d7031873590335821fba0c2d40a67f2
- portability-line-inbound-current-390.png — SHA256 80e6a8df77870ff2126cadea13f45cb7a89eaca1c8c970ac0b8a87b71e0992c1
- portability-line-inbound-current-768.png — SHA256 357a57fd2c943932a1f1babcfd5c3a99f67433da9107fa0e31175ee4d9a17ab0
- portability-line-inbound-current-1440.png — SHA256 a149fdb5a7693f9909e8c7d153d4a542bb92c3a42b755bb45e379e2730aeb443
- portability-line-inbound-retired-390.png — SHA256 2bd4b370e85275598f238d607ff719e706db71dff057f0b3615f63f6d905268c
- portability-line-inbound-retired-768.png — SHA256 de4300b45b4b6ed5ee35a20212104994ae09f57272ca3ddc354802303db6ca41

Las seis capturas corresponden a entrada, con A vigente después de retirar B o con B todavía vigente, en los tres anchos. Se han visto selección, operador fijado y acciones del formulario incompleto. La nota inferior móvil queda parcialmente fuera del viewport. Cierre y salida tienen aserciones de navegador, pero no aceptación visual individual en este informe. Las capturas no prueban la ausencia de solicitudes: esa medición está en los registros HTTP.

Componentes, repositorio y parsers reales con transporte y DTO sintéticos. Auth/DB, JWT/RLS, Next integrado y modelo vivo: `NOT_RUN`; API de pago: 0. Matriz: 342 requisitos, 27 revisiones parciales, 315 sin reconciliar y 0 listos para release. Cinco HIGH y W4 pendientes; IA comercial writes OFF, issue #10 OPEN y release `NOT_ACCEPTED`.

Los globales 1434 de BC3 y 1479 de la fuente de Agenda son independientes y no incluyen esta corrección. Se preservan F736, B9, 981, 1266 y los fallos de fixture o preparación anteriores. No se modifican fuentes ajenas, W3/W4/W5 ni el recurso nativo.
