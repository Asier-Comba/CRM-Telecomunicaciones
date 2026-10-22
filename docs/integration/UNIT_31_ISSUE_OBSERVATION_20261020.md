# Unidad31 — observar emisión incierta sin repetir el original

Continúa REQUEST6300012899 y el caller20, no una reparación causal.
Fuente1a127d2ca5aa83d0b7de309be6f3927b54805a17/treeaada4356c2a17726a9b194a2990d0d708d4d3609.
Original run39458747653 sigue causa/efecto UNKNOWN; artefacto12282737717 y hash
retenidos en29. Su teardown PASS impide una consulta retrospectiva del DB destruido.
Ninguna reemisión original, nuevo backend o consulta de datos alojados.

Se amplía el caller EXISTENTE de aceptación Supabase local. El mismo stack/fixtures
ya definidos por run-stack.mjs/productBrowserAcceptance son el único destino:
GITHUB_ACTIONS=true y origen exacto http://127.0.0.1:3109, cuyo padre exige
Supabase http://127.0.0.1:54321. El actor sintético ownerA ya autenticado se pasa
explícitamente a las lecturas. La reproducción siguiente identifica run/SHA/árbol
y el command mediante fingerprint SHA256, nunca se vincula al efecto original.
El helper no emite: sólo SELECT, limitado a workspace+actor+command y factura.

## Correlación añadida

| Fase | Observación segura |
|---|---|
|Clic|click_attempted y click_returned separados; no afirmar envío por intentarlo |
|Solicitud|request_intercepted; cantidad y cuerpos iguales, fingerprint del command en snapshots |
|API/transporte|backend_returned/status; validación del recibo real antes de inyectar pérdida/JSON inválido |
|Antes/después backend|conteos exactos de ledger/recibo/auditoría/entidad, versión/estado emitido; coherencia de UUID+versión+estado+número entre recibo, auditoría y factura |
|UI|alert observado, guardia de cierre observada, fase20 precisa al salir |
|Salida/replay|segunda lectura incluso si falla la aserción; cantidad de solicitudes/cuerpo estable; requisitos originales siguen ejecutándose |

Auth/autorización y entrada/salida de RPC NO tienen span directo añadido.
La ruta observada es commands/POST → billingHttpV1 → createBillingUserServiceV1 /
createProductUserPortV1 → resolveTenantContext/current user → BillingServiceV1
owner/admin → billing_v1_invoice_issue → recibo validado. Su resultado puede
correlacionarse con la prueba SQL; no atribuir una latencia a un subtramo sin span.
No se registran cookies/JWT/perfiles/notas, SQL/error crudo, receipt body, nombres
ni identificadores originales. Las lecturas fallidas quedan UNAVAILABLE; no PASS.

La observación es una instantánea: si backend_returned=false y el efecto aún no
aparece, no demuestra ausencia definitiva. Detener y conservar el comando; no
generar otro. Si API/DB coherentes pero UI falla, investigar consumo/observador
en esa fase sin eliminar la exigencia de alerta/replay/efecto único.

Se conservan INTACTAS las28expresiones de aserción/fallo del caller comparadas por
AST contra63a5477d, sus siete operaciones, timeouts, alertas, bloqueo de cierre,
cuerpo/command estable, efecto/versión/ledger/audit únicos y total de facturas.
Ningún error se convierte en éxito. HTTP200 se documenta como respuesta, no commit.

Pruebas locales:13/13 Node PASS (cinco guardias/redacción/ausencia/incoherencia del
observador y ocho billing-v1 existentes), lint dirigido y sintaxis de cuatro
módulos PASS. Los cinco controles del observador usan SQL simulado: consulta SQL
REAL/DB/escenario físico de31 NOT_RUN al escribir este checkpoint. La siguiente
CI sobre la fuente publicada debe ejecutar y conservar las observaciones; no se
promueve por estas pruebas unitarias. Código de producto sigue siendo30 y conserva
su lint global/tipos/defaultbuild44 y18UI/15contratos propios, no aceptación alojada.

Referencias verificadas: [PostgreSQL15 JSON](https://www.postgresql.org/docs/15/functions-json.html)
y [changelog Supabase](https://supabase.com/changelog.md), consultados20/10.
Índices existentes (sin DDL nuevo): PK de factura y PK workspace/actor/command
de ledger/auditoría acotan cada lectura. No upgrade/runtime/config o migración.

W5 mantiene disponibilidad/limpieza del recurso y gates de plataforma. Oier
revisa las observaciones del run exacto y el arreglo causal si aparece. Para un
ensayo interactivo, siguen pendientes recurso/fixture/ventana autorizados; la
aceptación habitual CI usa exclusivamente sus fixtures nuevos y teardown.
OriginalUNKNOWN, telecom3altas físicoNOT_RUN, CORE162 sin ampliar, hosted87,
Storage/IAwritesOFF y RELEASE_NOT_ACCEPTED permanecen visibles.

El run anterior de29/f315 terminó después:39488102448SUCCESS,115UI/4042backend/87
y teardownPASS; ambas variantes de siete comandos PASS. No contiene las lecturas31
ni demuestra la causa original; se conserva como evidencia separada del próximo run.
