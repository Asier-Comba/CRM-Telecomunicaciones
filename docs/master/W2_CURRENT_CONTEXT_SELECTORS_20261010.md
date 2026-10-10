# W2 — selectores del contexto actual

Los componentes reales de empresa y responsable conservaron opciones del espacio anterior y aceptaron respuestas pendientes tras cambiarlo: cuatro fallos reproducidos, dos controles normales correctos, con React de producción y HTTP local. Sus archivos son idénticos en265 y en la base7d3 de esta unidad.

El estado de cada selector se reinicia cuando cambian actor, espacio o rol mediante una clave de componente. La búsqueda de empresa queda vacía; el responsable vuelve a consultar su primera página autorizada. Se eliminan opciones/error/paginación anteriores y la limpieza existente invalida respuestas pendientes. El valor controlado del formulario, el contrato de selección y sus escrituras no se cambian.

Se conservan debounce, límite, paginación, etiquetas, permisos del servidor y reintentos explícitos. No hay caché global ni lectura directa de tablas. La regresión usa componentes y React reales con HTTP/repositorio/contexto sintéticos; no prueba Auth/RLS real ni ejecución de negocio. Unidad apilada sobre128, pendiente de comprobaciones completas y55capturas propias. IA de negocioOFF; seguridad independiente, driver físico e instalación Windows pendientes.
