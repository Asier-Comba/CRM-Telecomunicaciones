# W3 — Dos campos físicos más para inspectScenario v3

El nuevo inspector consume el SQL port del fixture nativo existente; no crea/
reinicia un recurso W5. Reutiliza snapshotDurableBindingScopeV3, la función de
admisión de scope ya existente en audit13, ahora exportada con comportamiento
intacto, y estados existentes IDEMPOTENCY_STATES. Query fija mide todas las
filas de workspace+operationRef y comprueba actor/capability/digest en respuesta:
no filtra una identidad incorrecta para presentar un cero engañoso.

Solo admite una fila completa con vínculo exacto y estado conocido. Return
inmutable operationCount/state. Sin fila, duplicado, vínculo incorrecto o error
son UNAVAILABLE, no ausencia verificada. No serializa filas/IDs/SQL/error raw.
No calcula autorizaciones, efectos, filas ajenas, transiciones prohibidas,
dispatch sin registro ni redispatch automático. Audit13 + estos2 =15/21 campos
medibles; los6 restantes y controller completo continúan pendientes.

Los probes se añaden tras inspección original al mismo fixture de completion y
reconciliación existentes: deben leer1/completed en cada uno después del trabajo
real. No cambia carreras/mutantes/restauración/SQL de negocio. Native markers
nuevos deben proceder del nuevo SHA; prueba física NOT_RUN hasta job propio.
Tres tests SQL controlados prueban scope retenido, bindings erróneos, ausencia
no autorizativa, errores privados y rechazo por validador full21; NO PostgreSQL.

Nueva fuente exige1286 (543+743)/340/native85_320 con audit13, conexión y dos
probes operationCount/state/Supabase107, Case33/19/14. Composición SIM futura
35/216/220,38/22/16 y1304 (548+756)/340 propios. Driver exportado solo connectWorker,
cinco métodos/full23/recurso/reinicio W5 y revisión W4/cincoHIGH pendientes.
Modelo NOT_RUN, IA writes OFF, release NOT_ACCEPTED. Fallos21F y previos intactos.
