# PAR-083: cambio de estado, revisión individual parcial

CLAIM W2-X #67 / 6164441906. Base propia `97428782b38475f01aeeed0e1f3b9a06e54da6f7`. Solo se añade PAR-083; otras 341 filas y 10 revisiones previas se conservan.

## Evidencia y alcance

Fuente de tarjeta `c7eab4bcbf5547c3c8ae03f773a1fa731e3334c1`, árbol `7f76e9c7cdba6777452aec8b01ba260e52ec0cb2`: 21 pruebas HTTP controlado propias (12 recuperación y 9 regresiones). Fuente de reapertura `97428782b38475f01aeeed0e1f3b9a06e54da6f7`, árbol `bce61c058e9bce99115786a8ecd281d433e4d66d`: 39 pruebas propias (24 won/lost y 15 regresiones). Cada resultado conserva su SHA; no se hereda a esta revisión de metadata.

Se reproducen y corrigen la pérdida de intención de tarjeta y el botón de reapertura bloqueado. Se verifica reintento idéntico con un efecto simulado, denegación403 sin efecto y recuperación por consultas tras recibo válido. Son navegador y repositorio frontend reales con HTTP controlado, no Auth/DB real.

IMPLEMENTED, CONSUMED_UI y VISUAL_ACCEPTED: PARTIAL. PROVEN_BACKEND, BROWSER_ACCEPTED y SECURITY_ACCEPTED: NOT_RECONCILED. La capacidad abarca más estados y entidades que estos casos. Sin FULL_ROW/PASS; faltan matriz completa, permisos reales, staging, accesibilidad integral y W4.

## Capturas revisadas

Panel desplazado hasta el reintento: evidencia parcial en390/768/1440, no pantalla completa.
- `opportunity-reopen-won-transport-768.png` SHA256 `315e9a4c195e85e4d4bf0b10512c929922d669035dc3949c249dede7a9b8467e`.
- `opportunity-reopen-won-transport-1440.png` SHA256 `d72d2b8ecd1f58d5ca42585ef17518f6c165b5443b40781f80c8494d3e6da756`.
- `opportunity-reopen-won-transport-390.png` SHA256 `eb9158203888150b31b5956dbbba9ae73343c353896de7ccf7aa43b5c9665dc5`.

## Conservación del inventario

El preflight inicial esperaba11 revisiones, pero encontró10 en la rama974 y se detuvo antes de editar fuentes. PAR096 está en la rama de composición, no en esta base. El fallo de preflight queda preservado; esta unidad conserva las10 revisiones presentes y añadePAR083:342/11PARTIAL/331sinreconciliar/0READY. Una futura composición con849 deberá conservar tambiénPAR096 y medir12 revisiones, sin sobrescribir ninguna de las dos.

Controles propios de metadata: generador, diferencias UTF8 de341filas y10revisiones previas, headers/bloqueos intactos y escaneo. No repetir suites de producto por esta documentación ni atribuirlas al nuevo SHA. CincoHIGH pendientes, IA writesOFF, modeloNOT_RUN, issue10OPEN y releaseNOT_ACCEPTED.
