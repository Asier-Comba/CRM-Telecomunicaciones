# Unidad 06 — reintento fiscal visible al cambiar de tamaño

Fuente de código y pruebas: `4163d5c214830dca7f66d28f6304fa98ebebbf4f`, árbol `65bab6c1dc1ffdd377369145bb65f03e00d8505c`. Padre `c597891c730131072ad772584a382348a04982f5`. Sin migraciones ni cambios de contrato, guard, infraestructura o dependencias.

## Fallo original y causa acotada

Supabase local CI39293813758 sobre c597 terminó FAIL: 4042 checks backend PASS, producto109/110PASS, teardownPASS. Falló `billing_invalid_receipt:issuer.set:review_390` por timeout; no aceptación global. Su captura final ya había restaurado1440 en finally, por lo que no prueba el estado390. Artefacto producto12207329353 SHA256 `950a0eb02d8d708616bb60747f128432d40f6e6ef1d4fa7b541d713a13e04350` conservado.

Reproducción con componentes reales y HTTP controlado: al cambiar1440→390, scrollIntoViewIfNeeded deja el botón fiscal en y924.484375 con altura36 y viewport960. Se recortan0.484375px; intersectionRatio0.9865451455. El banco estricto de emisor y cliente produce2FAIL sobre producto c597. Añadir `scroll-my-4` al botón fiscal produce2PASS sin modificar ratio1, tiempos ni reintentos. Capturas antes/después inspeccionadas. Un ensayo diagnóstico anterior fue interrumpido por texto nuevo con codificación incorrecta; se conserva como error de preparación, no evidencia causal.

La regresión añadida conserva los tamaños iniciales existentes y revisa390/768/1440 después de un recibo inválido en los dos paneles fiscales abiertos inicialmente a1440. La comparación de intención/efecto único permanece.

## Verificación propia de4163

- Facturación: dos invocaciones, misma fuente y sin cambios entre ellas:80PASS/1FAIL de81 y7PASS de7, total87PASS/1FAIL de88. No se declara88PASS. El fallo es `invoice.trash invalid receipt recovery at1440`: el segundo POST estaba pendiente hasta la comprobación de cierre del diálogo. Traza conserva mismo cuerpo para los dos comandos; el segundo no tenía respuesta completada. Causa completa UNKNOWN, no se modifica producto por conjetura ni se aumenta el plazo.
- Los dos casos fiscales con transición y visibilidad completa pasan dentro de la regresión. No cubren Auth/DB hospedados.
- Lint y tipos PASS; compilación y cierre exactos en UNIT_06_EVIDENCE.json, que se genera tras terminar.
- Supabase local sobre la corrección y nueva CI: pendientes de ejecución remota. Los resultados c597 no se atribuyen a4163.

## Evidencia anterior conservada

Sobre c597: local590 terminó588PASS/2FAIL, sin retries ni skips. Login→dashboard y Customer360 dejaron peticiones pendientes con FastRefresh; causa completa UNKNOWN. Fue necesario cerrar exclusivamente el servidor preview propio para emitir el informe; no clean-lifecyclePASS. CI remoto590PASS, nativo86fresh/restoredPASS, bootstrap620/assistant825/lint/types/build66PASS; audit5HIGH, W4/all-ref y EnterpriseFAIL. Los resultados locales/remotos se mantienen separados.

No release ni aceptación completa de342 requisitos. Continuar diagnóstico de los fallos pendientes y nuevas unidades comerciales, con revisión W4 independiente y coordinación Cowork para activación hospedada.
