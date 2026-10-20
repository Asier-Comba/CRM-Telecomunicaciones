# Paridad29: líneas/importes y búsqueda de facturas

CLAIM6302805975. Referencia sólolectura **iazticontact/crm-inmobiliario-demo@ad3c06e5e6dca8e9cf0342845f670b1b48478851**, árbolaf29eb5018d742c8092f9e769b493e857d85d76b; Telecom **8ee0b9ba61cd45072fbce75f12c6e684e3f3e6a6**. [Fuentes y observaciones](billing29/parity.safe.json). No escritura/importación/runtime de la referencia, comparación de negocio inmobiliario ni auditoría general nueva.

PAR-121/122/123/125: ambas UI permiten cantidad/precio/descuento/IVA/retención y muestran totales. Telecom transforma a enteros milli/minor/bps y usa cálculo canónico exacto para la previsión integrada; no se demuestra defecto monetario nuevo en esta lectura acotada. No copiar el cálculo de la referencia ni promover esas filas completas por fuente/compilación. Sus decisiones de junio son históricas, no prueba de backend actual.

PAR-103: la referencia implementa búsqueda textual en su conjunto de filas; Telecom ofrece cliente/estado/paginación y el resumen financiero tiene su propio periodo. El contrato publicado invoice.list admite **series** exacta además de customer_id/status/from/to/cursor. El listado integrado no expone serie; es una mejora funcional acotada realizable con el lector existente. La búsqueda textual global requiere otro contrato y no se sustituirá por filtrar la primera página50.

Siguiente unidad30: control de serie exacta en la pantalla existente, manteniendo paginación/cliente/estado/resumen global, resultados tardíos y errores; pruebas de ausencia antes y aceptación después390/768/1440. Sin nuevo DTO/API/SQL/permiso, búsqueda libre inventada o pantalla nueva. Asier32/34 conserva PromptBuilder/banco de voz; Oier no los toca. PR177 continúa congelada durante sus propios checks; una propuesta independiente sobre otro archivo no debe cancelar esos checks ni importar toda esa rama.

No nuevas pruebas del banco monetario ya verde sin cambio; esta unidad es revisión de fuente, no AuthDB/cloud/aceptación comercial completa. Presupuesto0EUR, NetlifyFree/deploy intactos, IA negocio writesOFF, Storage/revisión/5HIGH/backup pendientes, RELEASE_NOT_ACCEPTED.
