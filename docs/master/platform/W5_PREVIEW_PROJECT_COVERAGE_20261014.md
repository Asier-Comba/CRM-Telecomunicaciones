# Ejecución completa del navegador por proyectos aislados

REQUEST W2-X6162753210 expone cancelación del job7F tras20min, sin resumen de954casos. El índice943 no prueba943PASS. W5 CLAIM6166001398 entrega este cambio sobre PR150/base71880c, sin consumir productoW2-X ni editar sus tests/configuración.

Cada proyecto desktop/mobile tiene runner y servidor Next propios. Conserva20min por job, workers1, timeout180000ms y retries0. Ambos ejecutan también fixture de producción y comprobación del launcher. fail-fast=false evita que un fallo cancele el proyecto restante. Los artefactos tienen nombres distintos; no se comparte servidor, directorios ni puertos entre máquinas.

Cada runner recoge primero el inventario COMPLETO de ambos proyectos mediante Playwright --list JSON. La ejecución posterior selecciona únicamente su proyecto. El comprobador exige coincidencia exacta de IDs/proyecto, un resultado passed por caso, cero skipped/unexpected/flaky/retries, sin errores de discovery. Inventario y pruebas quedan vinculados al SHA realmente ejecutado, workflowrun y attempt; no se aceptan artefactos heredados de otros intentos. El cierre compara los dos inventarios completos y exige dos pruebas de proyecto distintas más el estado success de todos sus jobs, incluyendo producción/launcher. No basta un resumen parcial ni las pruebas de navegador si otro paso falla.

Validación local inicial:9 controles propios PASS, cubriendo ausencia/extra/duplicación/skips/fallos/retries/política/digest/source/run/attempt/cancelación y unión. La colección real del producto publicado71880c contiene362casos,181por proyecto. Es una colección local, NO362ejecuciones ni aceptación del nuevoSHA. La ejecución física de ambos jobs y del cierre se registrará con suSHA/árbol/run exactos en el checkpoint; controles existentes no se transfieren.

W2-X debe consumir la entrega publicada por merge normal y acuerdo exacto antes de probar su composición creciente. No se rerunea7F para buscar verde. Este cambio permite medir todos los casos en aislamiento; no garantiza por anticipado que cada futura fuente quepa en20min ni autoriza cambiar aserciones/times/skips. Una fuente nueva que exceda el presupuesto conserva suFAIL.

No aprobaciónW4, staging empresarial ni release. Se mantienen npm5HIGH/vendor/historial19 y demás bloqueos. IA escriturasOFF; W5no llamadas/reservas/gasto de modelo. PR151cache no adoptada.
