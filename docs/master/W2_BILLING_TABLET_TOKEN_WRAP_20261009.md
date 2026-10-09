# Estados e importes completos en tablet

## Defecto observado y reproducción

La composición a03564a15578196551f0297c92aa20ee3ea67338, ejecutada como
2e43955c83c0ad9cedff3171f14b739bbd4238de (árbol idéntico
04d3bd89650583cb59d47084a9caea7a27876116), terminó Supabase
37957116328/job113910333057 SUCCESS107/107. Sus 33 capturas se revisaron.
Las capturas `billing-confirmed-current-invoice-768.png` y
`billing-complete-invoice-row-768.png` mostraban Borrador y Cobrada partidos
en dos líneas, y el símbolo USD separado. El resultado funcional permanece
PASS; este defecto impide considerar cerrada la aceptación visual premium.

Chromium reprodujo exactamente esos tres saltos usando el componente
InvoiceRows, Status, Badge, React19, Tailwind instalado y los archivos Geist
del build local existente. Se utilizaron cinco filas sintéticas en memoria,
con los estados y monedas de la captura y sin vencimiento. No se usaron Auth,
SQL ni una instalación persistente. Con una fuente de sistema la primera
reproducción no mostraba el defecto; se corrigió el entorno de reproducción.

La causa es `overflow-wrap:anywhere` heredado de las celdas: bajo la presión
de las cinco columnas en tablet permite romper los estados y el símbolo de
moneda. El ajuste se limita a los textos de estado e importe de InvoiceRows:
`white-space:nowrap` y `overflow-wrap:normal`. Los demás campos conservan su
adaptación. No cambia Badge global, puntos de ruptura, DTO, cliente, permisos,
calculo, callbacks, comandos, API ni dependencias.

## Comprobaciones

La reproducción previa mostró dos líneas en Borrador, Cobrada y USD a768,
una a1440/390. Con el ajuste, las cinco filas mantienen todos los estados e
importes en una línea a1440/768/390, sin overflow ni errores de página. Las
cinco celdas permanecen visibles y las diez acciones, incluido Enter para
abrir factura, conservan el identificador exacto.

También se comprobaron cinco filas con importes de1e12 unidades menores en
EUR/USD a las tres anchuras: tokens completos y sin overflow. Lint de los dos
archivos modificados, tipos completos y sintaxis del helper PASS local. El
helper actualizado pasó entero con IntegratedBilling/repositorio/parsers
reales y adaptadores de memoria:0comandos,5lecturas,1registro,0pageerrors. Esta
prueba conserva su alcance explícito sin Auth/DB ni aceptación visual real.

El helper integrado comprueba ahora estados e importes de todas las filas
del listado realmente recibido, además de la factura seleccionada. Conserva
las comprobaciones de identidad, cliente, versión, resumen, detalle, ausencia
de escrituras y capturas. No quita checks ni aumenta tiempos individuales.

La nueva fuente necesita su propio107/107 SUCCESS, los jobs de calidad y
33capturas frescas revisadas antes de consumo canónico. El PASS de a035 y sus
capturas no acreditan automáticamente el nuevo árbol. F09FAIL106/107 y
311FAILtemprano siguen conservados. Issue29, issue10, revisión independiente
W4 e instalación Windows persistente continúan abiertas; escrituras IA OFF.
