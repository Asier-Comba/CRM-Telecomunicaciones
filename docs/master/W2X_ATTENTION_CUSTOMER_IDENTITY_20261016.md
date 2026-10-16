# Identidad visible del cliente filtrado en atención

CLAIM 6212889445, base 991022ddd9aebff79fc7450584f44cffd131b995. Antes de modificar producto, el control loaded1440 falla porque no existe una identidad comercial visible ni un enlace contextual al cliente filtrado; el selector solo dice Cliente seleccionado. Se conserva el original.

El filtro muestra Cliente filtrado y reutiliza NamedCustomer, su lectura normal customer.list por identidad y su enlace a Customer360. No se muestran identificadores raw ni campos privados. La clave de vida contiene cliente, empresa, actor y rol; al cambiar cualquiera se retira el nombre anterior mientras se consulta el actual. La denegación se representa Cliente no disponible, sin convertirla en identidad inexistente ni borrar el filtro. Limpiar filtros retira el bloque.

Banco propio recogido: 78 casos en 5 archivos, 18 de identidad (carga, cambio de cliente, empresa, actor, lector y denegación en 390/768/1440), más 60 regresiones Customer360/atención. Se mantienen peticiones retenidas y aserciones de nombre anterior ausente antes de resolver. Las pruebas consumen componentes, repositorio y parsers reales con HTTP/DTO sintético. Cambio de contexto del fixture no acredita JWT/RLS/revocación real.

Nueve capturas cargadas/lector/denegadas fueron realmente revisadas, con nombre y enlace legibles a 390/768/1440. Revisión parcial; parte inferior móvil fuera del viewport, no aceptación visual del módulo entero. El checkpoint externo registra controles finales reales y sus hashes; no hereda ningún PASS previo.

No se modifica NamedCustomer, selector compartido ni contrato de lectura; no hay nuevo servicio o pantalla. Navegación Next integrada, Auth/DB y modelo vivo NOT_RUN; API pagada0. Global1266 de2741fb8 es otra fuente. CincoHIGH visibles, W4 pendiente, IA writesOFF, issue10OPEN y releaseNOT_ACCEPTED; fallos históricos intactos. No se tocan fuentes W3/W4/W5 ni recurso nativo.
