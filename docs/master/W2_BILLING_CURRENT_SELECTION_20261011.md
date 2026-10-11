# Facturación: mantener la última factura seleccionada

## Problema y corrección

En `IntegratedBilling`, abrir otra factura no invalidaba la lectura anterior. Una respuesta lenta deA podía sustituirB, y una denegación deA podía borrarB y publicar un error anterior. La lectura de apertura inicial tenía una protección propia que tampoco reconocía una selección manual posterior. Mientras esperaba el nuevo detalle, las acciones de la factura anterior seguían visibles.

Las lecturas de apertura inicial y selección manual comparten ahora una generación. La selección manual retira el detalle anterior y muestra «Consultando factura seleccionada…». Solo la generación vigente puede publicar el detalle o su error. La limpieza invalida la generación. Preparar otro borrador, cambiar cliente, solicitar una propuesta o comenzar un comando también retira las lecturas anteriores; la lectura confirmada de un recibo conserva su protocolo independiente.

No cambia la aritmética, numeración, CAS, formato del recibo, idempotencia, PDF privado ni endpoints de negocio. El listado de cincuenta facturas sigue independiente del detalle seleccionado.

## Evidencia local

`tests/e2e-preview/billing-current-selection.spec.ts` ejecuta el componente de producto, su repositorio y sus validadores reales sobre respuestas HTTP cerradas del fixture de Facturación existente. Versiones iguales, identidades y números distintos. Comprueba cuatro intercalaciones a390/768/1440:

- Respuesta exitosa de una selección anterior después de cargar la vigente.
- Denegación anterior después de cargar la vigente.
- Respuesta de apertura inicial después de una selección manual.
- Denegación vigente: el detalle anterior se retira ya durante la consulta y no reaparece después.

Las doce pruebas fallan en el padre localB5AC, cuyo componente de Facturación es idéntico al de537. Con el cambio final, doce pasan. La regresión existente del detalle visible tras cargar cincuenta filas pasa en sus tres tamaños. Tipos estrictos ES2017, lint y diff pasan. El primer intento también pasó sus doce pruebas pero falló lint por actualizar estado sincrónicamente desde un effect; ese intento queda conservado y el código final usa la continuación asíncrona para la apertura inicial.

Tres capturas finales revisadas:390 después de denegación anterior conservaA/2026/000010,768 después de apertura inicial tardía conserva esa selección y1440 muestra la denegación vigente sin acciones del detalle anterior. Sin desbordamiento horizontal del documento ni errores de página en las pruebas; cero solicitudes a comandos de Facturación.

## Límites

Estas pruebas no prueban Auth/RLS, SQL, permisos reales, emisión, cobro ni conservación del PDF. Los números backend del fixture son datos sintéticos, y su estado de PDF pendiente no acredita un archivo conservado. No se invoca ninguna mutación. El retiro de lecturas al preparar borradores y comandos es un resguardo de implementación, no una nueva aceptación local de esos flujos completos. La publicación requiere los controles propios del árbol final; no hereda los107 deDEDD ni los de la integración911.

No se presenta Facturación completa ni lanzamiento aceptado. Los cinco HIGH, issue10, Full23, proveedores y revisión W4 siguen pendientes; IA comercialOFF.
