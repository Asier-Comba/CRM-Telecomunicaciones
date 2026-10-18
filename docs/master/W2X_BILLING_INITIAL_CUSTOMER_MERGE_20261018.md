# Facturación: conservar cliente buscado ante identidad inicial tardía

CLAIM6252473013. Base `2b7dd80ff93e22ac8fc8bd75ff48d99fb396502a`; rama propia `codex/w2x-billing-initial-customer-merge-20261018`.

Original: **un fallo y un caso correcto en23,5s**. Se retiene customer.editor inicialA, se busca y seleccionaB y después se liberaA. El identificadorB sigue seleccionado, pero la respuestaA reemplaza la colección de clientes: B queda como «Cliente sin verificar» y Nuevo borrador aparece disabled en el contexto de error capturado. El control inicial sin búsqueda pasa. Se conservan log/exit1/contexto y test original.

Solo se cambia ese setter de identidad inicial por una actualización funcional: reemplaza la entrada del mismoidA y conserva las otras entradas actuales. No se añade estado, efecto, petición, permiso o comando. Vigencia de solicitud y selección permanecen; los avisos65 no cambian. Revertir la única expresión devuelve exactamente el padre. Parser, cálculo, contrato, repositorio y editor intactos.

Controles propios: **78/78 browser en1,8min y49/49 funcionales en830,8381ms**. Dieciocho nuevos: Aactivo/archivado, búsqueda sin seleccionarB/selecciónB/control inicial,390/768/1440. La identidadA actualiza su entrada sin borrarB; el seleccionadoB conserva nombre y disponibilidad de borrador. Aarchivado sigue bloqueando preparación cuando es el cliente seleccionado. El banco final añade escribir texto antes de liberarA y verificar que permanece después de la corrección. No se atribuye ese resultado al test original, que no tenía esa aserción; se conserva snapshot original y una guardia prueba que solo se añadieron esas dos operaciones sin relajar comprobaciones.

No hay comandos en el banco nuevo; una identidad y una búsqueda cuando procede, filtros invoice.list siempreA/B explícitos sin ampliación al espacio. Las60regresiones cubren filtro tras errores, archivo, preparación y contexto de propuesta. Build66, lint/scan/diff/cola/publicación propios quedan en checkpoint. No hay herencia de PASS global.

## Capturas realmente vistas

- initial-customer-active-selected-1440.png — SHA256 d1b4af0f31eb8c588d4ade7879a0a8f087e08491714a0c911e65f5fcf58ddbcc
- initial-customer-archived-selected-768.png — SHA256 0f3914a729c2956d9baef30b8bb9f3da6cee42b88c5b4209608438a02aa93b5b
- initial-customer-archived-selected-390.png — SHA256 d706b5ebac254594f45c69b88205ebb207f8ca123430f379fd18e971f5356329
- initial-customer-archived-selected-1440.png — SHA256 d1b4af0f31eb8c588d4ade7879a0a8f087e08491714a0c911e65f5fcf58ddbcc
- initial-customer-active-selected-768.png — SHA256 acc02d575b85c43993804be03301f01a5f75bf14097797aa18b70be038f02bb4
- initial-customer-active-selected-390.png — SHA256 d706b5ebac254594f45c69b88205ebb207f8ca123430f379fd18e971f5356329

Seis capturas deB seleccionado en390/768/1440 conAactivo/archivado. Se ven búsqueda, nombreB, Nuevo borrador habilitado y texto conservado; no aparece aviso de archivo incorrecto paraB. EstadoA y otras opciones del select cerrado se verifican en HTTP/DOM, no como píxeles visibles. La lista vacía es fixture controlado, no ausenciaSQL; en móvil se recorta la zona inferior. Banner/navegación del fixture excluidos. Visual parcial, no aceptación completa del módulo o de autorización multiempresa.

Componentes/repositorio/parsers reales; HTTP/DTO sintético. AuthDB/JWT/RLS/Next integrado/modelo vivo NOT_RUN/API0. Matriz342/28PARTIAL/314sinreconciliar/0READY; cincoHIGH/W4 pendientes,IA writesOFF,issue10OPEN,releaseNOT_ACCEPTED. Global1755fuente64 y1773fuente65 separado/enespera sin esta corrección ni18casos nuevos. F736/B9/981/1266 y fallos de fixture/preparación preservados; esta causa de estado de UI no se atribuye a aquellos fallos. Fuentes ajenas/W3/W4/W5/recurso nativo intactos. Próximo: revisión individual de listado/búsqueda/filtro de facturación y continuación de controles propios sin cancelación/duplicación.
