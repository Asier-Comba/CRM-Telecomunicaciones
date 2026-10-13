# W2-X — confirmación de contactos con respuesta perdida

CLAIM issue67 comentario6156727327; precisiones6156817582/6156842670. Base elegible verificada PR38 `60acdc5d6a2ae41ff3d751724582ade0c0762788`; rama propia `codex/w2x-contact-uncertain-20261014`. Integración pendiente de ACK del propietario principal.

## Defecto reproducido y cambio

Una creación de contacto puede persistir y perder su respuesta. El repositorio expresa transport_uncertain y el editor conserva la intención para reintentar. Sin embargo, cerrar el panel descartaba ese editor y su command_id. Una creación nueva podía duplicar el contacto. La reproducción en390 sobre la base demuestra que el panel desaparece después de esa incertidumbre.

ContactEditor conserva el panel y la confirmación mientras exista incertidumbre, bloquea cambios de campos y muestra una instrucción para reintentar la misma acción. Cerrar/cancelar quedan realmente deshabilitados; Escape y fondo no descartan la intención. El reintento sigue disponible y, al recibir confirmación, vuelve a leer el cliente y sus contactos. El cierre normal antes de una acción incierta continúa disponible.

Drawer.closeDisabled y ConfirmDialog.cancelDisabled son props opcionales con false por defecto. Solo ContactEditor las activa en este cambio. No se rehacen componentes ni se altera el repositorio, product.v1, SQL, RLS o permisos. No hay persistencia privada en navegador ni garantía nueva para recarga/cierre de la aplicación.

## Controles

- Chromium11/11: creación, edición y archivo con respuesta perdida en390/768/1440, dos peticiones iguales, un efecto simulado, campos bloqueados, cierre y Escape protegidos, retorno a lectura vigente; dos controles existentes de recuperación/denegación de lectura de contactos. Componente, repositorio, parsers y CSS reales; HTTP controlado, sin acreditar Auth/DB.
- Capturas de estado incierto inspeccionadas en390/768/1440. No desbordamiento horizontal. Build normal, TypeScript y lint del alcance pasan localmente.
- Se conserva la reproducción negativa original. Una primera ejecución del test de archivo tenía un locator ambiguo entre dos botones de reintento; se conserva como fallo de fixture separado y se corrige seleccionando el diálogo de archivo exacto.
- El consumidor Auth/DB desechable existente incorpora un escenario de creación normal que persiste antes de abortar su respuesta. Exige reintento idéntico y exactamente un contacto, un product_command y un evento de auditoría, más lectura ordinaria paginada actual y capturas de incertidumbre en tres anchuras. No simula el efecto SQL, no inserta otro servicio ni amplía timeout/permisos. Su ejecución en CI propia está PENDING; se prevé un control adicional sobre la base107, sin declarar108PASS antes de medirlo.

No se heredan1430/362/Sup107 de la base ni controles de PR152. PAR-042 conserva PARTIAL: roles, revocación, ciclo completo, alcance extranjero, staging y aceptación independiente no quedan cerrados por este escenario. W4 y cinco HIGH pendientes; IA writes OFF, issue10 OPEN, modelo NOT_RUN, release NOT_ACCEPTED y gasto de API0.

Siguiente: cerrar controles propios publicados sin sobrescribir checks activos y continuar inventario/paginación ordinaria de Contactos PAR-042 en una unidad independiente reclamada.
