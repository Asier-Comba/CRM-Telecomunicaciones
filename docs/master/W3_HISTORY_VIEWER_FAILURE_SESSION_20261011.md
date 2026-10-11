# Historial: evidencia de la sesión viewer antes del cierre

PR142 A4 (`a4b56dadb83f5e93418e68aa13a45894dd3eceee`, árbol `9092d45f55faa4eb510d029d769d1305476d5675`) pasó sus controles propios de código1145, navegador310 y PostgreSQL85/320. Supabase38154332793 falló en `W3_HISTORY_UI_CONTEXT_VIEWER_TIMEOUT`, antes de emitir totales o artefacto de producto. Auth, teardown y límite privado pasaron. Ejecución real `b9aa79d5d5cee96a9e481abf3898c44184d40108`; safe11707817744/history11707613020. El FAIL se conserva y A4 no es elegible para composición.

## Defecto demostrado en la evidencia

`assistant-history-browser.mjs` abría una segunda página para viewer, la cerraba en su finally y después el catch exterior capturaba la página del propietario. `failed-CONTEXT_VIEWER.png` muestra el contexto inválido anterior del propietario. No acredita el estado del viewer, su petición ni la causa del timeout. El código fuente exacto y la captura revisada coinciden en esa limitación.

`withHistoryViewerSession` captura exclusivamente la página viewer todavía abierta antes de cerrar su propio contexto. Conserva el error original si el diagnóstico falla; un fallo de cierre después de un recorrido exitoso sigue provocando FAIL. La restauración de membresía/perfil de las fixtures permanece en el finally exterior. El catch común ya no fotografía al propietario bajo una fase viewer.

En fallo se intenta guardar `failed-CONTEXT_VIEWER-current-session.png` y un JSON cerrado con el paso (`SETUP`, `NAVIGATION`, `SUMMARY_RESPONSE`, `SUMMARY_BODY`, `HEADING`, `REDACTION`, `IDENTITY`), estado HTTP de navegación/summary, petición summary observada, presencia de error de página y éxito de captura. No incluye URL, cookie, identidad, cuerpo ni texto de error. El límite de5s es solo para la captura posterior al fallo; los30s de aceptación no cambian. Los checks, redacción real, operaciones y SQL tampoco cambian. La promesa de respuesta se observa desde su creación para evitar una rejection sin manejar cuando la navegación falla primero.

## Verificación y límites

14 comprobaciones locales PASS: tres casos del ciclo de vida viewer y once regresiones existentes de historial. Cubren la página correcta aún abierta, orden captura/cierre, preservación del error frente a fallos síncronos/asíncronos de diagnóstico, fallo de cleanup tras éxito y limpieza si falla crear la página. Lint, sintaxis y diff PASS. Son pruebas de protocolo con navegador simulado; no equivalen a Auth/SQL ni demuestran la causa del timeout A4. Los controles propios de la siguiente fuente deben ejecutarse desde su árbol exacto.

PR38 C38 sigue siendo la integración funcional acreditada1142/274/107, con auditoría5HIGH FAIL. La última hoja elegible sigue siendo537; PR38 consume DEDD. Full23 físico, ausencia autoritativa, W5 y W4 pendientes. IA comercial OFF, issue10 OPEN, release NOT_ACCEPTED.
