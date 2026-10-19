# W2-X — estado del cliente y acciones de contactos

CLAIM issue67 comentario6156910547. Base elegible60acdc5d6a2ae41ff3d751724582ade0c0762788, rama propia codex/w2x-contact-customer-state-20261014. No se publica encima de checks activos de PR152/153 ni se escribe rama principal sin ACK.

Las cuatro funciones product_v1_contact_create/update/archive/restore exigen cliente active en la migración20261003132000, sin redefiniciones posteriores. La interfaz ofrecía añadir para cliente inactive y editar para inactive/archived. La reproducción sobre base en390 falla porque existe «Añadir contacto» en un cliente inactivo.

Ahora añadir y editar requieren cliente activo y rol escritor. El historial y contacto principal continúan visibles; clientes no activos muestran una explicación de solo lectura. No se alteran consultas, repositorio, SQL/RLS, roles o contratos backend. El backend sigue siendo autoridad y puede rechazar una acción si cambia el estado después de la lectura.

Navegador Chromium18/18: active/inactive/archived × owner/viewer de interfaz ×390/768/1440, con componente/repositorio/parsers reales y HTTP controlado; contacto principal visible, acciones apropiadas, edición y cierre normal del caso activo, comandos0, lecturas sensibles explícitas0 y sin overflow. Typecheck y lint del alcance se registran localmente. No es certificación de Auth/DB ni permiso/tenant real; tampoco cierra PAR-042 completa.

La composición con la corrección de respuesta incierta de PR153 requiere terminar sus propios controles primero y nueva evidencia del SHA compuesto. Se mantiene esta entrega independiente publicada para recuperación, evitando otra PR innecesaria. W4/cincoHIGH/full23/staging/modelo pendientes, IA writesOFF, issue10OPEN y releaseNOT_ACCEPTED.
