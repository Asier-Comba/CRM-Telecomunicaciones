# Negativos del recibo del handler de alta — propuesta al integrador

Prueba9cec6aeb desde propia37/ffd6a20a; API blobfb24f52eb4d5ad51720c0a5c561f0f67aac05338
idéntico al integrador48e. Ningún archivo de producto/backend/SQL modificado.

Ejecuta el handler TypeScript real y NextResponse instalado; únicamente inyecta
createUserServerClient con respuestas Auth/RPC sintéticas. No reimplementa el
handler. Comando: `node --test tests/bootstrap/onboarding-route-result.test.mjs`.
Resultado original **exit1,6PASS/3FAIL**, sin supresión, TODO o relajación.
Lint inicial señaló el nombre local module en el harness:2cf8bcd7 lo renombra
sin cambiar reglas. Lint posterior PASS; la ejecución de ese harness mantiene
exactamente6PASS/3FAIL y exit1. El fallo original también se conserva.

| Respuesta RPC controlada | Respuesta real del handler | Negativo |
|---|---|---|
| data:null, error:null | HTTP200 | Confirma sin fila |
| data:[], error:null | HTTP200 | Confirma sin fila |
| fila con ID inválido, created:true | HTTP201 | Confirma recibo inválido |

Los controles positivos prueban201nuevo/200existente y los rechazos503sin
configuración/401sin identidad/409duplicado/403suspendido. Se verifica getUser antes
del RPC, ausencia de RPC si no hay identidad/configuración y mensajes internos
no publicados en esas denegaciones. Son llamadas controladas, no autorización,
transacción, aislamiento, persistencia ni suspensión reales acreditadas.

**Alcance causal:** son negativos inyectados del límite RPC, no se ha observado
que Supabase entregue esas respuestas ni se demuestra un exploit. El UUID tipado
de PostgreSQL limita la posibilidad ordinaria del ID inválido. La propuesta
identifica que el handler no valida su confirmación, y complementa la defensa de
UI37 sin convertir el control de UI en contrato backend aprobado.

**Decisión pedida a Asier:** acordar validación de fila canónica antes de200/201,
respuesta segura no exitosa cuando el resultado no esté confirmado y consulta
autenticada para recuperación durable tras recarga, sin reenviar automáticamente
provisioning. Determinar semántica para ausencia/suspensión/resultado incierto y
mantener la transacción/RLS. W5 conserva SQL y ventana cloud. No se implementa
otro RPC, command_id, permisos o política desde esta rama.

Este banco conserva tres negativos rojos deliberadamente. **No seleccionarlo
como suite verde ni incorporarlo aislado sin resolver/revisar la decisión.**
Su ubicación bootstrap hará visibles esos fallos en npm test si se selecciona.
No se ejecutan nuevamente las suites verdes del producto por añadir sólo QA.

[Proyección saneada](onboarding38/result.safe.json). Original privado:
work/onboarding38-route-original.log (hash en proyección). Revisión de contrato
pendiente, no corrección causal de fallos históricos ni aceptación de release.
RELEASE_NOT_ACCEPTED, IA writesOFF, cincoHIGH/W4/StorageP0 preservados, coste0EUR.
