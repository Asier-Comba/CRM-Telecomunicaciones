# W2 — vida de la copia temporal de imágenes

El componente real creó una URL de imagen después de desmontarse, conservó una imagen al cambiar actor/espacio y aceptó una descarga antigua tras ese cambio. Tres fallos reproducidos con React de producción, HTTP local y bytes sintéticos; control de cierre normal PASS.

La copia visible queda asociada al actor, espacio, rol, documento, versión y formato. Cada vida del panel conserva exclusivamente su propia intención/ticket/URL; al terminar invalida respuestas y revoca su URL. Una respuesta tardía del ticket no inicia la descarga. El servidor sigue autorizando cada lectura; este control de presentación no sustituye Auth/RLS.

Los fallos de transporte incierto conservan la misma intención o el ticket ya recibido para el reintento explícito. No hay lectura automática ni repetición de comandos de negocio. Se mantienen validación PNG/JPEG y tamaño, descarga privada y contenido/controles del panel. Los PDF siguen como adjuntos.

La regresión cubre descarte al desmontar/cambiar contexto, revocación al cerrar/consultar de nuevo, ticket tardío y reintentos inciertos de ticket/bytes. El repositorio, presentación y bytes son sintéticos: no acredita Auth/Storage reales, Next Image nativo, permisos empresariales, instalación persistente o producción. Comprobaciones completas y capturas propias pendientes. IA de negocio OFF; revisión W4, driver físico, cinco HIGH, modelo y Windows siguen pendientes.
