# Facturación — resumen financiero vigente durante recarga

Problema observado en las capturas conectadas de FDC: la factura emitida ya
mostraba30,25EUR mientras el resumen financiero anterior seguía visible hasta
llegar la nueva consulta. Las capturas por sí solas no establecen la causa;
una reproducción sobre IntegratedBilling real la confirma: mantener pendiente
la respuesta de actualización del mismo periodo deja el antiguo panel financiero
visible en el padre04DD. No intervienen Auth, SQL ni un proveedor IA en esta
reproducción; se usa el fixture HTTP sintético existente y sus parsers reales.

El resumen ahora se admite por periodo y generación de recarga. Actualizar o
confirmar una factura invalida inmediatamente los KPI anteriores. Durante la
consulta aparece «Consultando resumen financiero actualizado…»; los nuevos
valores solo aparecen con el resultado admitido. Una respuesta retirada no
puede reemplazarlos. No cambian operaciones, filtros, permisos, importes,
paginación ni frecuencia de solicitudes.

Una prueba causal de navegador: resumen inicial, respuesta siguiente retenida,
ausencia del panel anterior, estado de consulta y nuevos valores tras liberar.
El padre falla porque conserva un panel; corregido pasa. El primer intento de
fixture omitía los contadores obligatorios y fallaba antes de cargar: se conserva
como fallo del fixture, separado de la reproducción causal corregida.

Local Chromium390 + tipos/lint; no nueva aceptación Auth/DB ni release. El nuevo
SHA exige suites propias, navegador completo y Supabase. La revisión parcial
PAR-107 conserva evidencia FDC; no acredita esta corrección ni hereda PASS.
CincoHIGH pendientes, IA writes OFF, modelo vivo NOT_RUN, release NOT_ACCEPTED.
