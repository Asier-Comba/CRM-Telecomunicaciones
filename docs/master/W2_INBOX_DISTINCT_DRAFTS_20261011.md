# Inbox: conservar la nota al cancelar una conversación nueva

La nota de una conversación existente y la primera nota de una conversación nueva compartían `draft`. Abrir «Nueva conversación» borraba el texto pendiente de la conversación anterior. Escribir en el panel nuevo y cancelarlo dejaba ese texto en el formulario de la conversación anterior.

Se mantienen ahora dos borradores independientes. Abrir una conversación nueva inicia únicamente su primera nota. Cancelar el panel conserva la nota original y devuelve el foco al botón que lo abrió. Reabrir el panel inicia otra primera nota vacía. Crear la conversación usa exclusivamente su propio borrador; el comportamiento existente de seleccionar la conversación recién guardada y limpiar el formulario se conserva.

## Evidencia local

Fuente anterior: `582d6110b46f4811cdec78302f917887c18832fd`, árbol `00398928445c78e5027fa4d0fae225accc52e4c5`.

En 390, 768 y 1440 se reproducen seis fallos válidos:

- Cancelar el panel vacío: se esperaba la nota original de A y se observaba una cadena vacía.
- Escribir la primera nota de B y cancelar: se esperaba la nota original de A y se observaba la primera nota de B.

Los tres controles positivos de creación ya pasan en esa fuente. La corrección pasa **9/9**: seis cancelaciones conservan el texto y el foco, y tres creaciones envían exactamente una operación `conversation.create_internal` con el texto nuevo, sin identificador ni versión de una conversación anterior. La recepción sintética se valida con el repositorio real y se relee la conversación nueva. Ninguno de los seis recorridos de cancelación envía comandos.

Se reutiliza el componente Inbox y la infraestructura de navegador de paginación de contactos. La detección de comandos de ambas pruebas reconoce ahora el endpoint Inbox compartido por consultas y comandos mediante la operación, además de los endpoints terminados en `/commands`. El fixture de creación devuelve el campo publicado `receipt`; no utiliza el sobre de consulta `data`.

El primer ensayo individual tenía ese manejo de comandos incorrecto y su fallo de creación se conserva como **fallo del fixture**, sin atribuirlo al producto. Las reproducciones de producto se sustentan en `work/inbox-draft-context-parent-valid-browser.txt`: seis fallos de cancelación y tres creaciones PASS. La versión inicial del fixture y su salida se conservan por separado.

La comprobación final incluye tipos estrictos ES2017, lint y diff limpio. Las tres capturas finales revisadas muestran la nota conservada en móvil y tableta, y el texto de la conversación nueva en escritorio. El diseño resulta legible en esos encuadres; la captura móvil no muestra toda la página desplazable. Los 12 controles de paginación vuelven a ejecutarse con el borrador separado y la detección corregida de comandos.

Prueba: `tests/e2e-preview/inbox-draft-context.spec.ts`. Salidas preservadas: `work/inbox-draft-context-final-browser.txt`, tipos, lint, capturas y `work/inbox-draft-context-pagination-regression.txt`.

## Alcance de aceptación

Las respuestas son HTTP sintético con DTO cerrados; no hay autenticación, base de datos, mutación real, RLS ni proveedor en estos recorridos. El éxito de creación demuestra la selección del texto y su validación de contrato en la interfaz, no persistencia real. No se declara envío externo.

La nueva fuente requiere sus propios controles completos. La candidata anterior 582 tiene 1142 pruebas, preview256 y PostgreSQL85/320 cerrados al redactar; Supabase propio seguía pendiente. Esos resultados no se heredan. Preview previsto del conjunto: 274, por los nueve casos nuevos en cada uno de los dos proyectos. IA comercial OFF, cinco HIGH, W4 y durabilidad física completa pendientes; lanzamiento NOT_ACCEPTED.
