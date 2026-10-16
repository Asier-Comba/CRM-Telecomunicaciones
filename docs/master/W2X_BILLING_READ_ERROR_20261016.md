# Facturación: retirar el error de lectura que ya se ha recuperado

CLAIM6213990000; base5f5ca62677c0db962b4f93cbae5d9b39b9b21996; rama propia codex/w2x-billing-read-error-20261016.

Original1440:3FAIL/2PASS55.5s. Listado/resumen/configuración fallidos dejaban error global visible después de Actualizar, aunque las tres lecturas válidas y sus datos ya habían llegado. Identidad403 y comando incierto durante refresco pasan y son límites que deben conservarse. Log,test y trazas originales intactos.

El grupo de lectura recuerda la referencia exacta de su error; un éxito actual captura esa referencia y solo retira el error de pantalla si sigue siendo el mismo objeto. Después limpia su referencia. No compara códigos ni borra errores indiscriminadamente. Conserva active,keys,consultas,datos,handlers de comando,recibos,CAS,pending ybloqueos. Es una referencia de UI,no driver o mecanismo de autoridad/durabilidad. La referencia se captura antes de resetearla para que el updater React no consulte una referencia ya mutada.

Banco propio91:15 recuperación/listado-resumen-configuración y dos positivos de error ajeno en3anchos;42 recibos inválidos/denegados,15 filtro,18 propuesta y1 resumen financiero.91PASS2.1min antes de cierre de lint/build propios. Identidad403 no desaparece tras éxito de facturas. El positivo de comando inicia refresco retenido,luego una petición manual simulada invoice.mark_paid responde500:al completar la lectura se conservan error/reintento de misma acción/cancelación deshabilitada. No acredita efectoSQL ni ausencia;no se guarda o emite factura en el nuevo banco. HTTP/DTO sintético con componentes/repositorio/parsers reales.

Siete capturas realmente vistas:listado recuperado390/768/1440,identidad denegada390/1440 ycomando incierto390/1440. Error resuelto ausente,identidad no verificada ymensaje de permiso conservados;diálogo incierto mantieneCancelardeshabilitado/Reintentaractivo. Visual parcial;parte inferior móvil fuera del viewport,no todo módulo niAuth. El checkpoint externo registra lint/build66/scan/diff/cola yhashes propios,sin herencia.

Auth/DB/JWT/RLS,Next integrado ymodelo vivoNOT_RUN,API0. Cola342/24PARTIAL/318sinreconciliar/0READY. Global1311de4221edcPASS propio y1362deFA3 activo son otras fuentes. Original1266de2741fb8FAIL1253PASS13FAIL+13complementariosPASS16.1s mismoSHA intacto,no1266singlePASS. F736/B9/981 original/primer210/script33/source41harness preservados. HIGH5/W4 pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED;fuentes ajenas/W3/W4/W5/recurso sin cambios.
