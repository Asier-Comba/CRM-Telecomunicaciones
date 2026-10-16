# Facturación: no ampliar automáticamente el filtro del cliente

CLAIM 6213045963. Base 43a314ad123b988290ebf94204a6847611371fcb; rama propia codex/w2x-billing-customer-filter-20261016.

El enlace de entrada de un cliente iniciaba invoice.list con customer_id. Si customer.editor fallaba, el catch vaciaba customerId y lanzaba una consulta general. Original a1440:4FAIL (403/404/transporte/DTO malformado) y1PASS vigente53.7s. En cada fallo se observó una consulta general inesperada (esperado0, recibido1). Evidencia y test originales conservados. Es un defecto del filtro UI, no una prueba de fuga de datos o de autorización backend.

El fallo de identidad conserva el filtro. El selector representa el cliente como Cliente sin verificar y el alta sigue deshabilitada mientras su identidad actual no esté disponible. La lectura válida mantiene el nombre y alta habitual. Actualizar facturas conserva customer_id; solo elegir Todo el espacio lo elimina. El resumen financiero sigue siendo del espacio y su texto lo explica; no se cambia su contrato ni se filtran sus cifras como si fueran del cliente.

Se reutilizan componente, repositorio y fixture de facturación. El opt-in customer_scope=1 del fixture elimina la selección inicial de factura y pasa el cliente, sin alterar defaults ni crear servidor/servicio nuevo. No se ejecuta ningún comando comercial en el nuevo banco.

## Refinamiento visual conservado

Primer banco43PASS59.8s, lint y build propios: la revisión real390 detectó que el texto largo del selector sobresalía de su tarjeta aunque la aserción de ancho de página pasaba. No se publica ese candidato como visualmente aceptado. Logs, fuente, test y capturas originales se conservan. Tras terminar su build, un único refinamiento acorta la etiqueta y limita el ancho del selector al contenedor; se añade aserción de límites respecto a la tarjeta. Banco final43 completo vuelve a ejecutarse con lint/build; no se hereda el primer43. El checkpoint externo registra los resultados terminales y hashes reales.

43 casos:15 filtro por cinco modos/3anchos,18 estados activo/inactivo/archivado en entrada/preparación,9 vida de preparación y1 resumen financiero. HTTP controlado con componentes/repositorio/parsers reales; no Auth/DB/JWT/RLS ni efectos persistidos. Las capturas finales se revisan separadamente antes de publicar; su alcance es parcial, no aceptación de todo el módulo ni de todos los documentos fiscales.

Auth/DB, navegación Next integrada y modelo vivo NOT_RUN; API pagada0. Global1266 de2741fb8 y1311 de4221edc son fuentes distintas; ninguno se hereda. Cola342/22PARTIAL/320sinreconciliar/0READY. HIGH5/W4 pendientes,IA writesOFF,issue10OPEN,releaseNOT_ACCEPTED; F736/B9/981 original/primer210/script33 preservados. Fuentes W3/W4/W5/recurso y ramas ajenas intactos.
