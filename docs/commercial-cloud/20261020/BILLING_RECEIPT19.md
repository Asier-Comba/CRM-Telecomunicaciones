# Emisión: recibo inválido y denegación, control independiente19

CLAIM6296632348, seguimiento del fallo físico175 registrado en6296545586. Checkout propio **97a849c500307273b7b776b79248c4e234b80fdd**; código y banco idénticos a candidata **b9e1eefeea3342b40bdd9584747e9e7ff47bf1cd**. No cambios de producto, banco, fixture, permisos o SQL.

Banco existente `tests/e2e-preview/billing-invalid-receipt.spec.ts`, seleccionado por CLI para **invoice.issue invalid/denied ×390/768/1440**. Sin nuevo runner/config. **6 PASS,22.0s, un worker, sin retries/skips/flaky.**

- Recibo inválido: respuesta JSON rota, command_id diferente o envelope extra, según anchura; la interfaz conserva intención, explica resultado pendiente, impide Cancelar/Escape y permite reintentar el mismo cuerpo. La revisión posterior conserva versión esperada y nueva acción utilizable.
- Denegación403: alerta, cierre habilitado y ninguna mutación del modelo sintético.
- El contador de efectos está en memoria del fixture: **no DB real, transacción, auditoría persistida, Netlify o emisión real.** No se ha repetido el efecto incierto de175.

Las tres capturas del modal pendiente fueron revisadas: alerta y acción de reintento visibles, Cancelar deshabilitado, sin contenido sensible. No aceptación de toda la pantalla o de la nube.

El primer intento de selección devolvió **No tests found** antes de ejecutar casos: el filtro comenzaba con `^billing` y el título completo incluye el archivo. Log original conservado; la lista posterior identificó los seis casos exactos, y se usó salida nueva para la ejecución. No fallo de producto, prueba omitida o verde repetido.

**El fallo físico175 permanece FAIL114UI+1TIMEOUT, causa y efecto exacto UNKNOWN.** Estos seis controles no reproducen el timeout ni acreditan su reparación. El marcador físico agrupa click/alerta/commit/cierre; captura final no demuestra cuándo ocurrió cada condición. Hace falta la correlación original o reproducción desechable acordada, sin relajar tiempos/aserciones o repetir una emisión incierta. DockerLinux local no disponible, no infraestructura alternativa iniciada.

Evidencia: [receipt19/result.safe.json](receipt19/result.safe.json), capturas [390](receipt19/invalid-390.png), [768](receipt19/invalid-768.png), [1440](receipt19/invalid-1440.png). No repetir lint/build: fuente de aplicación y tests intactos respecto al build propio18; los resultados conservan su fuente y alcance.

W5 presupuesto privado pendiente6296238416, sin compra/cambio de protección. IA writesOFF, voz/modelo realesNOT_RUN, cincoHIGH y revisión independiente abiertos; releaseNOT_ACCEPTED.
