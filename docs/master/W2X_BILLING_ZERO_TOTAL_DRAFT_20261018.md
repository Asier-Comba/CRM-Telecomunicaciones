# Borrador de total cero: propuesta, revisión y guardado manual

CLAIM6252130268. Base `56fbaee765fb4681aa43943cec4e305eb2afbd67`; rama propia `codex/w2x-billing-zero-total-draft-20261018`. Unidad QA: no cambia producto ni tests previos, ni se declara un defecto previo no reproducido.

Banco nuevo **18/18 correctos en31,6s**: crear/editar, sin revisar/revisado/revisión reiniciada,390/768/1440. Crear parte del texto con descuento100%; editar revisa un borrador existente. Cantidad1/precio100/descuento100%/IVA21/IRPF0 producen base/IVA/IRPF/total exactos cero. Antes de revisar no hay comando; pulsación nativa de Guardar disabled no guarda. Revisar permite el guardado aunque el total sea cero. Modificar notas reinicia revisión, bloquea otra vez Guardar y exige confirmar de nuevo.

Los doce positivos enviaron un único comando manual simulado con payload de descuento10000bps y versión esperada en edición. Recibo estricto válido y lectura posterior muestran borrador con total cero; los seis casos sin revisar no envían comando ni consultan una factura supuestamente creada. No hay emisión, numeración o llamada de modelo. Este banco no prueba persistenciaSQL, idempotenciaSQL o permisos reales.

Los controles funcionales propios de esta candidata dan **49/49 correctos en868,9198ms**: siete bancos de facturación/parser/modelo/diagnóstico/PDF/contratos con stubs locales. El original fuente58 de40=35PASS/5FAIL y los cinco corregidos de fuente60 conservan su fuente y resultado; no se convierten por herencia en49PASS. Esta ejecución49 es nueva, sobre la candidata actual con los cambios de parser63 y el adaptador60. Build66/lint/scan/diff/cola/publicación propios quedan en checkpoint.

## Capturas realmente vistas

- zero-total-create-reviewed-390.png — SHA256 698cbec21c4a55ad348def329255b7b60047d1056920e7883fe386afd7811826
- zero-total-create-reviewed-1440.png — SHA256 33bf2253275901117ee9a9ce13a0029b81fc6c078514b8ff107ba75c224eb73e
- zero-total-update-unreviewed-768.png — SHA256 b8ed396bd9db1c278ba68c1512535412027c728da1c63bdf8be8b186c762be49
- zero-total-create-reviewed-768.png — SHA256 5a714492e51ca7aac7041871d3e18ea11d439499798a479af218346cc1bc6d7b
- zero-total-update-unreviewed-390.png — SHA256 e739da9c26dab3340742ac9167980c26036b0f9d66047e42117e9fb195a77d80
- zero-total-update-unreviewed-1440.png — SHA256 0731f42912095dbd70bb403652688199bda92ef13ee1147aa2c306ad214d192d

Seis capturas inferiores: creación revisada y edición sin revisar en390/768/1440. Se ven concepto/cantidad/precio/descuento100, porcentajes y todos los totales cero. Revisión marcada y Guardar habilitado frente a revisión desmarcada y Guardar disabled. Cliente/fiscal/fechas superiores y detalle guardado no tienen aceptación visual en estas capturas. Fixture excluido. La lectura posterior se verifica en HTTP, no como persistencia real en una imagen.

El primer listado previo de la regresión agrupada mezcló CLI de checkout15 con testDir de checkout14 y falló por instancias distintas de Playwright. Se conserva el log original. Un config exclusivo del listado alinea CLI15/testDir15 y confirma1755/101, sin ejecutar casos. El controlador real mantiene CLI14/testDir14; no se despachó desde la combinación incorrecta. Los18/49/build propios no se repiten por este fallo de preparación.

Componentes/repositorio/parsers reales; HTTP/DTO sintético. AuthDB/JWT/RLS/Next integrado/modelo vivo NOT_RUN/API0. Matriz342/27PARTIAL/315sinreconciliar/0READY; cincoHIGH/W4 pendientes, IA writesOFF, issue10OPEN, releaseNOT_ACCEPTED. F736/B9/981/1266 y fallos propios/históricos de fixture/preparación preservados. Fuentes ajenas/W3/W4/W5/recurso nativo intactos. Un único controlador85193 espera esta publicación y el cierre1575fuente57 antes de la regresión1755/101 sobre el SHA exacto de esta unidad. Ningún PASS global se hereda.
