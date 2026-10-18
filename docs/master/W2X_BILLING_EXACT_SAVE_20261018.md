# Guardar borrador: exigir previsión exacta en el editor integrado

CLAIM6251720544. Base `2a8597537737cec349650496e874d86ca6e5633a`; rama propia `codex/w2x-billing-exact-save-20261018`.

La reproducción original termina con dos fallos y un caso correcto en 50,6 s. Un precio100.001 con precisión excesiva y un total superior al límite del contrato muestran previsión «—» y aviso, pero marcar la revisión habilitaba Guardar. El caso válido pasa. No se ha reproducido una escritura SQL inválida: las validaciones del repositorio permanecen intactas.

Se reutiliza `exact`, calculado previamente por `invoicePreviewTotals`, para deshabilitar el botón y proteger el callback de guardado cuando el editor integrado no puede calcular la previsión. Dos expresiones cambian; su reversión devuelve exactamente el padre. No se modifica cálculo, contrato, validación, comando, recibo, CAS, campos ni comportamiento por defecto de la vista de demostración. No se añade estado o efecto.

La colección propia contiene **63 casos y termina con 63/63 correctos en 1,7 minutos**: 18 de precisión/límite/positivo en creación y edición, 18 de recibos, 18 de recuperación de lectura registrada y nueve de revisión manual de propuesta. En los dos estados inválidos no se envía comando; corregir importes desmarca la revisión y mantiene Guardar deshabilitado hasta revisarlos de nuevo. Después una acción manual simulada confirma484, con payload y versión esperados. El positivo directo pasa; no se emite factura. La batería nueva se ejecuta completa sobre esta candidata; las evidencias antiguas conservan su SHA y fallos originales.

Build66, lint sin errores y tres warnings conservados, scan, diff, cola y publicación se registran en el checkpoint externo. No se heredan resultados globales.

## Capturas realmente vistas

- billing-exact-create-precision-768.png — SHA256 102ab169ffcaaf7c2693f8aa68fac5a47a70b1ea452ac26175ad9957965b9359
- billing-exact-create-precision-1440.png — SHA256 bf0ffaee89a02e96c55b42780b153315b0864d69d82609989d7561b0df4e1b7e
- billing-exact-update-overflow-1440.png — SHA256 932eb354dbd540e60dc9fded1598b29940b3fab02c9136ba9652adebb1e6f8a2
- billing-exact-create-precision-390.png — SHA256 d4f13665b40176c60772ce3d105de335503f13e22ac42d884ac5019a52027ba8
- billing-exact-update-overflow-390.png — SHA256 8dffd59f6af2a191ca6427454bffe8ac1fedfd2a54969f5d27306a36e63feabd
- billing-exact-update-overflow-768.png — SHA256 653d5811893cc51c45f0af98244015a576dd00236ea52999b71f43270226a0e2

Se han visto creación con precisión inválida y edición con exceso de total en390/768/1440. Conceptos, cantidades, importes, totales no disponibles, aviso, revisión marcada y botón Guardar deshabilitado legibles. Cliente, identidad fiscal y fechas superiores quedan fuera de estas capturas; los positivos corregidos se verifican en el banco HTTP. Fondo de fixture excluido. No se acredita el editor completo, accesibilidad completa ni aceptación fiscal.

Componentes, repositorio y parsers reales; HTTP/DTO sintético. Auth/DB, JWT/RLS, Next integrado y modelo vivo NOT_RUN; API0. Global1479 fuente53 y1575 fuente57 separados y sin esta corrección. Matriz342/27 PARTIAL/315 sin reconciliar/0 READY; cinco HIGH/W4 pendientes, IA writes OFF, issue10 OPEN, release NOT_ACCEPTED. F736/B9/981/1266 y fallos históricos de fixture/preparación preservados. Fuentes ajenas, W3/W4/W5/recurso nativo intactos.
