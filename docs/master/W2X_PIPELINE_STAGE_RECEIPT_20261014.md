# Cambio de etapa: conservar una operación sin recibo verificado

W2-X, CLAIM #67 / 6163999291. Base propia `1b0ab8837a23b70d82ddb2ed9da2d4674422982b`.

La prueba previa aplica un cambio de etapa en el servidor HTTP controlado y devuelve JSON ilegible. La tarjeta conserva la etapa anterior, pero desaparece «Comprobar el mismo movimiento»: el catch había borrado `pendingMove`. La prueba original falla en esa ausencia, después del efecto simulado. Log original preservado en el checkpoint, separado de los fallos históricos de CI/Auth.

El catch de `moveStage` ahora conserva el comando pendiente tanto ante transporte incierto como ante un recibo no verificable (`internal_safe`). La tarjeta recupera el movimiento con el mismo identificador y cuerpo. Si ya existe recibo válido, el reintento solo consulta. Las denegaciones explícitas mantienen su recuperación mediante recarga. No cambian el catálogo, búsquedas, etapas de cierre, editor, roles, backend, RLS ni contratos.

## Verificación propia

21 pruebas de navegador con HTTP controlado:

- 12 casos en 390/768/1440: recibo inválido (JSON, UUID o sobre), pérdida de transporte, 403 sin efecto y fallo de consulta después de un recibo válido.
- Cada recuperación incierta exige dos cuerpos iguales y un solo efecto simulado. La recuperación tras recibo válido exige una sola escritura. El selector y arrastre permanecen inactivos durante la incertidumbre y se recuperan tras consultar la etapa guardada.
- 9 regresiones existentes sobre catálogo, etapas vacías, filtros, búsqueda y cambio de contexto.

Se inspeccionaron capturas de la recuperación inválida en los tres tamaños; el aviso y botón son legibles y alcanzables, sin desbordamiento horizontal. La captura móvil muestra una parte del tablero: no es aceptación visual integral del módulo.

SHA, build, lint, escaneo y hashes se fijan en checkpoint y handoff. No se heredan controles. Auth/DB real de esta unidad y modelo vivo NOT_RUN. No cambia ninguna fila de aceptación. HIGH5, W4 y consumo principal pendientes; IA writes OFF, issue10 OPEN, release NOT_ACCEPTED.

La integración en la composición propia requiere controles de su nuevo SHA. PR153 permanece en 7F con sus fallos preservados, a la espera de REQUEST6162715998 y REQUEST6162753210; sin reintentos, aumento de límites ni edición de fuentes propietarias.
