# Facturación: retirar el detalle al navegar a otro contexto inicial

La ruta de Facturación solo tenía una key de creación/listado. Cambiar su referencia inicial de factura podía conservar el detalle y las acciones anteriores durante la nueva consulta, incluso después de proteger las respuestas tardías de selección manual.

El export `IntegratedBilling` delimita ahora el componente con una key de factura inicial, cliente inicial y modo de creación. Cambiar ese contexto retira sus estados y consultas; mantenerlo conserva el componente. La selección manual dentro del contexto sigue utilizando la generación del cambio anterior. No cambia las APIs de Next, la consulta de parámetros de ruta, SQL, recibos ni comandos de Facturación.

`billing-initial-context.spec.ts` modifica las props del export real mediante controles de fixture que no aparecen en los recorridos normales. A390/768/1440, una consulta exitosa y una denegada de la nueva factura comprueban que el detalle anterior y «Marcar como cobrada» desaparecen mientras la consulta está pendiente; seleccionar de nuevo el mismo contexto no añade otra lectura. Usa respuestas HTTP cerradas, repositorio y parsers reales. No realiza comandos ni autentica usuarios reales.

La primera variante usó una URL con query que el servidor de fixture no reconocía: sus seis fallos eran de fixture antes de cargar el CRM, y quedan excluidos de las reproducciones de producto. La prueba corregida activa sus controles mediante un fragmento de URL que no altera la petición al servidor. Con el componente del padre5B85, sus seis casos fallan por conservar el detalle anterior; con la key, pasan.

La verificación final conjunta pasa21 recorridos: seis de contexto inicial, doce de selección manual y las tres regresiones existentes de estabilidad tras cargar cincuenta filas. Lint, tipos estrictos ES2017 y diff pasan. Tres capturas finales del mismo árbol se revisan en móvil, tablet y escritorio; vistas acotadas con selección vigente o denegación vigente, sin aceptación visual integral ni W4.

El cambio de cliente inicial y modo de creación también queda delimitado por implementación, pero no se presenta aquí como nueva aceptación local de sus flujos completos. Sin prueba nueva de Auth/RLS, SQL, conservación de PDF, emisión, cobro ni durabilidad física. Los controles propios del árbol publicado todavía son necesarios. IA comercialOFF; issue10OPEN; Full23 y lanzamientoNOT_ACCEPTED.
