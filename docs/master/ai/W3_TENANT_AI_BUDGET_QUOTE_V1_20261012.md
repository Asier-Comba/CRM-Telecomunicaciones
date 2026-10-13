# W3 — Cotización previa del presupuesto IA por empresa

Componente server-only sin registro de herramienta, ruta, modelo o activación.
Admite un snapshot cerrado del ledger/política cargado por el servidor: empresa,
epoch, revisión, periodo UTC, observación, techo, gasto, reservas y llamadas cuyo
coste sigue sin liquidar. Fija autoridad/valores antes de calcular; no acepta
accessors ni campos adicionales. Importes canónicos en microUSD mediante BigInt,
coste máximo redondeado hacia arriba una sola vez sobre el numerador conjunto.

La cotización exige misma empresa/actor/rol/epoch y observación de hasta60s dentro
del periodo. Resta gasto y reservas pendientes; cualquier cargo desconocido
impide cotizar. Reference/mock no se contabilizan como uso vivo. No devuelve
identificadores de empresa/actor, prompts, respuestas ni credenciales.

`reservation_required` significa que la estimación cabe en el snapshot; TODOS los
resultados incluyen `dispatchAuthorized:false`. Cotizar repetidamente no reserva
ni gasta. El servidor debe aportar techos de tokens conservadores obtenidos del
contenido realmente serializado y límites de salida; este módulo no tokeniza ni
acredita que un techo proporcionado representa ese contenido.

## Pendiente antes de habilitar llamadas

Ledger duradero multiempresa, carga autorizada real, reserva atómica con revisión
y periodo actuales, concurrencia física, liquidación idempotente de uso medido,
retención de reservas ante cargo desconocido y recuperación. Esa reserva es la
que puede autorizar transporte después de los demás permisos; esta cotización
no es un ticket. Sin API contratada ni llamada externa; pruebas de este módulo
son sintéticas, no Auth/DB real ni calidad de un modelo.

IA writes OFF, modelo vivo NOT_RUN, full23 NOT_RUN, release NOT_ACCEPTED. Revisión
W4 y recurso/reinicio W5 independientes; no se modifica ninguna fuente W4/W5.
