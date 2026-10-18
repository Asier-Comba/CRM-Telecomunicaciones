# Facturación: adaptar el test de fecha al callback actual

CLAIM6251822244 y ampliación en issue67. Base `6b03869d9c86a6876aaef37fa9408d954798de84`; rama propia `codex/w2x-billing-functional-date-20261018`.

Los seis bancos funcionales locales sobre fuente58 `b34f6d60b9b64a5ba218376ef0a8038c6135e39f` terminan con **35 correctos y cinco fallos de40, en770,0598ms**. Se conservan log y exit1. Los cinco fallos son las variantes de propuesta del banco de fecha: el adaptador AST obtiene el atributo `asOf` actual, ahora una función, y lo pasa como fecha al parser. La aplicación lo invoca al generar la propuesta. No se reproduce una fecha errónea en el producto; la causa completa de estos cinco fallos está en el test.

La base59 conserva src/tests idénticos a58 antes de la corrección. Solo el adaptador de propuesta invoca el callback como su consumidor real. Se añaden aserciones de tipo función y fecha esperada; las comprobaciones de cliente, fecha y vencimiento15días permanecen. Los diez positivos de fecha de borrador no cambian.

Se ejecutan únicamente los cinco casos fallidos: **5/5 correctos en617,5855ms** sobre la nueva candidata. Verano, invierno, cambio de año, año bisiesto y punto sin cambio de día. No se repiten los35verdes anteriores. Como hay un cambio de test y SHA, no se presenta35+5como40PASS de una fuente ni como complemento del mismoSHA.

Lint del archivo, diff, scan, cola y huellas propios se registran en checkpoint. Sin cambios en src/cola/revisiones y sin ejecutar build/navegador/visual por un cambio exclusivo de test. No se heredan los build66/63browser de58. No Supabase/AuthDB, JWT/RLS reales, modelo vivo ni API de pago. Servicio/HTTP/PDF/diagnóstico funcional con stubs locales no acredita persistencia ni seguridad independiente.

Global1479 de fuente53 cerrado y publicado; global1575 de fuente57 activo por su único controlador. Son fuentes separadas y sus defectos posteriores documentados impiden aceptación integral. Matriz342/27 PARTIAL/315sinreconciliar/0READY; cincoHIGH y W4 pendientes; IA writesOFF, issue10OPEN, releaseNOT_ACCEPTED. F736/B9/981/1266 y fallos de fixture/preparación anteriores permanecen intactos. Sin fuentes ajenas/W3/W4/W5/recurso nativo modificados.
