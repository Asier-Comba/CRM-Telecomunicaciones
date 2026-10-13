# Inbox: página de contactos ligada a la selección vigente

La consulta «Cargar más contactos» pertenecía al cliente capturado al iniciar la petición. Su error se aplicaba sin comprobar si la selección seguía vigente. Una respuesta de A también podía añadirse después de seleccionar B y volver a A: comprobar únicamente el identificador del cliente no distingue esas dos selecciones de A. El botón permitía iniciar dos peticiones simultáneas del mismo cursor.

## Cambio

`IntegratedInbox` invalida la lectura de contactos al cambiar de cliente, conversación o repositorio y al desmontarse. La primera página y las páginas posteriores aplican respuestas y errores únicamente a la generación vigente. El cambio de cliente retira contactos, selección y errores anteriores. Seleccionar de nuevo la referencia ya vigente conserva su estado.

Solo se admite una página pendiente. El botón se desactiva mientras se consulta y la comprobación inmediata evita un segundo envío antes de actualizar la interfaz. La respuesta se añade exclusivamente al cursor que inició esa petición. Un fallo de la página vigente conserva la primera página y permite reintentar; el éxito del reintento elimina su alerta. Una respuesta anterior no puede desbloquear una petición nueva.

## Reproducción y verificación acotada

Fuente anterior: `a8d985cd62915d58f2e74d36a4222969e148f360`, árbol `5b93c21abef412aa7399b9b824ab935f4d65a76a`.

El navegador utiliza el componente Inbox, selectores, repositorio y validadores reales. Los transportes HTTP son sintéticos y devuelven DTO cerrados publicados de Inbox, búsqueda y editores de contacto: primera página de 20 contactos, cursor igual al último UUID y segunda página de un contacto posterior. Los recorridos usan los controles normales de la interfaz.

Los nueve controles negativos fallan en la fuente anterior, tres anchuras por caso (390, 768 y 1440):

- A inicia página 2; se selecciona B; el rechazo tardío de A deja una alerta: esperado cero, observado uno.
- A inicia página 2; se selecciona B y se vuelve a A con una nueva primera página; la respuesta anterior añade un contacto: esperadas 21 opciones incluyendo «Sin contacto», observadas 22.
- Dos pulsaciones mientras la página está pendiente envían dos peticiones: esperada una, observadas dos.

La corrección pasa estos nueve casos. La verificación final añade el rechazo de la página vigente y el reintento correcto en las tres anchuras: **12/12 PASS**. El reintento mantiene la primera página, recibe la segunda una sola vez, elimina la alerta y retira el botón al agotarse el cursor. Se comprueba ausencia de comandos, errores de página y desbordamiento horizontal.

Tipos estrictos con objetivo ES2017, lint, sintaxis del servidor de prueba y revisión de espacios del diff: PASS. Tres capturas finales revisadas: rechazo tardío en 390, vuelta al mismo cliente en 768 y reintento en 1440. Controles, selección y cliente vigente resultan legibles dentro de esas capturas; las capturas móviles están desplazadas hasta el contexto.

Archivos de verificación: `tests/e2e-preview/inbox-contact-pagination.spec.ts` y `fixtures/inbox-contact-pagination-{entry.tsx,server.cjs}`. Evidencia local preservada fuera del repositorio: `work/inbox-contact-pagination-parent-browser.txt`, `work/inbox-contact-pagination-ready-final-browser.txt`, tipos, lint y capturas finales. El primer control negativo individual válido se conserva por separado.

## Límites

Estos recorridos prueban selección, paginación y manejo de respuestas en la interfaz; no demuestran autenticación real, SQL, permisos completos, RLS ni durabilidad de comandos. No se pulsó «Guardar vínculo» ni se hizo una mutación de negocio. Los errores tardíos reproducidos no se presentan como exposición de datos entre empresas.

La verificación propia de esta nueva fuente aún no se ha ejecutado al redactar este documento. La fuente anterior A8D tiene sus propios 1142 controles funcionales, preview 232 y PostgreSQL 85/320 cerrados; Supabase seguía pendiente durante esta autoría. Esos resultados no se heredan a la nueva fuente. Preview previsto para esta unidad completa: 256, al añadir 12 casos en cada uno de los dos proyectos configurados.

La integración 6975 tiene su propio Supabase 107/107; no contiene esta unidad ni las correcciones posteriores de A8D. La fuente 9C75 anterior conserva su fallo 106/107 en acceso a Cartera; esta corrección no se declara solución de ese fallo. IA comercial OFF, lanzamiento NOT_ACCEPTED, cinco avisos HIGH, W4 independiente y los escenarios físicos completos de durabilidad siguen pendientes.
