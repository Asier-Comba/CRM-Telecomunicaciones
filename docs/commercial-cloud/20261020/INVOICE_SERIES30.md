# Facturación: filtro de serie exacta — Oier30

Claim [6302911632](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6302911632). Rama exclusiva `codex/oier-invoice-series30-20261020`, desde `8ee0b9ba61cd45072fbce75f12c6e684e3f3e6a6`. Código y pruebas ejecutados en **d5299a6239fd403b5204741102b3436243b04c7d**; el commit posterior incorpora solamente esta evidencia. Los dos archivos afectados seguían idénticos en la candidata de Asier **285348a66f4cacdbcfb6d018caaa2effbb2df54e**, comprobado antes de modificar. No se escribe en su rama.

## Comportamiento

El listado no exponía el filtro `invoice.list.series` que el lector existente ya admite. Ahora permite aplicar una serie exacta de hasta ocho letras ASCII, números o guiones; convierte minúsculas a mayúsculas y vacío vuelve a todas las series. Enter y el botón ejecutan la misma consulta. No es búsqueda textual global ni un filtro local de las primeras 50 filas.

El filtro se envía al lector junto con cliente y estado. La clave de paginación incluye la serie: cambiarla retira el cursor anterior y la respuesta tardía del filtro anterior no sustituye la lista actual. Un 403 conserva el error y no se presenta como lista vacía; aplicar de nuevo la misma serie vuelve a consultar. El resumen financiero conserva únicamente su periodo global y su texto aclara el alcance de cliente/serie. No se modifica dinero, editor, dictado, permisos, contratos, SQL ni operaciones de escritura.

## Pruebas y fallos conservados

[Manifest con cada caso, clasificación y hashes](series30/acceptance.safe.json). Banco existente `billing-financial-refresh.spec.ts`, sin nuevo runner o fixture compartido. Se conservan todos los intentos:

| Intento | Resultado | Interpretación |
|---|---|---|
| Antes del producto, b4c15424 | 3 FAIL | Control inexistente en 390/768/1440; factura inicial sí cargada. |
| Primera implementación, 335206ca | 16 PASS / 6 FAIL | Error del banco nuevo: una sola fila con cursor no nulo; el lector estricto exige una página completa de 50. No es fallo causal del producto. |
| Fixture corregido, 78751dee | 19 PASS / 3 FAIL | Validación HTML del nuevo control no rechazaba `BAD?`; la guarda explícita sí impedía enviar la consulta. |
| Negativo adicional, 046d9da1 | 3 FAIL | Aplicar la misma serie después de 403 no enviaba una nueva lectura; esperado 3, observado 2. |
| Corrección final, d5299a62 | **22 PASS** | Se escapa el guion del patrón HTML y se recarga al aplicar una serie ya seleccionada. Sin reintentos, skips o flaky. |

Las 22 pruebas incluyen seis casos nuevos (dos recorridos por cada anchura), doce de selección actual y tres de foco con lista tardía, más el caso financiero anterior. Se comprueban: 50 filas y cursor real del DTO, página siguiente, cliente/estado preservados, cambio A→B sin cursor, A tardía, resumen global, limpieza, formato inválido sin consulta, 403, reintento idéntico y recuperación; cero comandos y cero errores de página en los seis casos nuevos. No se rebajan aserciones, permisos, límites ni timeouts.

Las seis capturas de controles y lista cargada se revisaron directamente. El control cabe en 390 px y la factura B/2026/000021 queda visible como tarjeta; tablet y escritorio conservan la tabla. Esta revisión corresponde al componente con HTTP controlado, no al sitio alojado ni a todos los estados del módulo.

Comprobaciones globales y compilación: véase el manifest final. No se vuelven a ejecutar por rutina los 42 casos de voz ni los bancos físicos completos de fuentes anteriores. Los resultados no se transfieren a la sucesora de Asier: tras su selección necesita sus propios controles.

## Integración y límites

Asier revisa y selecciona los dos archivos funcionales, preservando su trabajo 32–34 de `PromptBuilder`. Este cambio cubre sólo la lectura por serie; PAR-103 completo y la búsqueda libre continúan sin aceptación. Auth/DB real desechable, RLS, cloud y micrófono real no se han ejecutado en esta unidad. No se activan escrituras IA ni contenido Storage.

Presupuesto **0 EUR**. Netlify Free, despliegues, dominios y protecciones intactos. Los cinco HIGH, historial/vendor, W4 independiente, Storage y backup mantienen sus controles separados. Los fallos históricos UNKNOWN conservan su alcance; no se reemiten efectos originales. **DEMO_NOT_READY; RELEASE_NOT_ACCEPTED.**
