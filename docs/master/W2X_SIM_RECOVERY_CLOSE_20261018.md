# SIM/eSIM: recuperación y salida segura del alta

CLAIM 6254173236; ampliación6254229704. Padre `4b0e19941fcf34946c5730b401493044c66831d5`. Rama propia `codex/w2x-sim-recovery-close-20261018`.

El causal de SIM física a390px dejó **3FAIL/1PASS45,2s**: cancelación habilitada durante un envío incierto, cierre habilitado tras recibo y lectura fallida, y un panel imposible de cerrar después de una denegación definitiva. La cancelación previa al envío pasa.

Se conserva el log original, su exit1 y el banco original de24casos. Un intento adicional de Contrato reutilizó por error la carpeta de resultados: los archivos auxiliares originales de SIM están **NOT_AVAILABLE_OVERWRITTEN**. No se reconstruyen ni se inventa evidencia. El primer fallo de Contrato pertenece al fixture: su selector dependía del texto de un botón que cambia después del envío. Se conservan log, exit, banco fallido y auxiliares de ese intento. Se corrigió únicamente el selector a `dialog[aria-describedby]`, sin cambiar las aserciones y usando una carpeta distinta. Ese causal corregido deja1FAIL porque Cancelar sigue habilitado, después de observar el comando exacto. El efecto de Contrato es NOT_MEASURED y su recibo NOT_RUN.

El cambio W2 conecta `cancelDisabled=frozen` en el feedback existente de `useReviewedCommand`. Añade `closeBlocked`, derivado de los estados que ya existen, y SimCreate lo utiliza para el atributo de cierre y su guardia. Así se permite salir tras una denegación definitiva cuando ya no hay propuesta, pendiente o recibo, conservando el bloqueo ante incertidumbre o una creación confirmada pendiente de lectura. `locked`, save, callbacks, entradas, recibos y servicios permanecen iguales. No se añade otra primitiva, estado, efecto, algoritmo, SQL o servicio. La reversión exacta devuelve el padre y otra guardia reconstruye las24pruebas originales. El banco final27 coincide con el causal ampliado y corregido.

**297 passed (7.9m) propios.** Los27casos pertinentes son24SIM física/eSIM (incierto, lectura fallida, revisión previa y403 por390/768/1440) y3del consumidor ContractsInventory. Los270restantes son regresiones de SIM, portabilidad y portfolio, sin aceptar por ello todos sus comportamientos. En SIM, el reintento incierto conserva operación, input y command_id; el conjunto de efectos del harness contiene uno. Un recibo confirmado seguido de503 reintenta solo lectura y conserva un comando. Antes del envío hay cero comandos. Tras403 se observa cero efectos sintéticos, se cierra y reabre explícitamente, y una nueva orden distinta produce un efecto. No se activa ningún operador ni se revelan identificadores. Estos son efectos del harness, no idempotencia SQL ni aceptación AuthDB. Build66, lint, scan, diff, cola y bundle propios; funcionales NOT_RUN_EXISTING_UI_CONTROL_STATE_WIRING.

## Revisión visual parcial

Eighteen actually viewed frames:12SIMrecoveryuncertain/readfailed physical/eSIM3907681440,3postactionpositives390(review/deniedreopen),3Contractuncertain3907681440. Uncertainmodals show safemessage,disabledCancel/X,enabledsame-operationretry;SIMreceipt-readfailure shows savedstatus,disabledform/X andreadretry. Rootdrawerunderblur verifiedDOM only. Contractscopeonlyconfirmationcancel/X;parentContractclose NOT_EXERCISED. Postactioninventoryscreenpartial,notfullSIM/module/roleacceptance. Declarednullmasks/emptylists notabsence/private-data proof. Synthetic effectSet notSQLidempotency;contracteffectNOT_MEASURED,receiptNOT_RUN.

- shared-contract-uncertain-768.png — SHA256 0dff845cfe6a7e3e72ee056fc3c5cee5e64529c8c3ca9ad7ec9902f20673d614
- shared-contract-uncertain-1440.png — SHA256 8c277569625ae4274978446773e339ffa1b52faf3d9568ba919cd3b976326ec8
- shared-contract-uncertain-390.png — SHA256 5cb8014b73f66010c20618283194860035da66089f57ca2dc3450f5c96a6d7c3
- sim-recovery-physical-read_failed-1440.png — SHA256 fc1ed171012e8fcca072c5a53e1e92d736687d900e8458a33f2942b3d499b4de
- sim-recovery-physical-read_failed-390.png — SHA256 56641d596b1ee92eb4c255eca9c176a4ce84f032b039714126c1ed8cb48c2807
- sim-recovery-physical-uncertain-1440.png — SHA256 f8fdbacb18b8fbe2021cc9a427711262bb46cef20d970203fb680024f6ecfe69
- sim-recovery-physical-uncertain-768.png — SHA256 21c3e0474246c651c6a0daa8368188be9f9d054b3c0d16306a8950339628d683
- sim-recovery-esim-read_failed-768.png — SHA256 2735197e012f902af71a1dace40871b5c6dd5eb27643816346b78efb974eefa7
- sim-recovery-physical-uncertain-390.png — SHA256 f746c752d32ca4c886a88b5064819f969d3f140197041a367e21c8372dd1b992
- sim-recovery-physical-read_failed-768.png — SHA256 681278ab66d0b6c372a004318aec219839718999aa90abb38da8b9267234e46e
- sim-recovery-esim-read_failed-390.png — SHA256 2b6174ddc3b888fb31462bcf85705f334ff2aca2af5874e521c3988e60a105d7
- sim-recovery-esim-read_failed-1440.png — SHA256 27f46c07e1d389eba3a9ab5cde45ed0727197c0d161af774082f13b6c2a4a8ed
- sim-recovery-esim-denied-390.png — SHA256 210bdceee15675fe7e18cd005f4ddf395686ddd2028c3ff99be7c1e36e05e153
- sim-recovery-esim-uncertain-1440.png — SHA256 513286235e9f5a3ffee131127ac8bd40274c09142c3b3891cbb70c8a92a516c9
- sim-recovery-esim-uncertain-390.png — SHA256 1948d8235198b8ab377e7592dbcab26660389cfc98041634afac9a65020ecdfa
- sim-recovery-esim-uncertain-768.png — SHA256 af27580f8ce83c2685d3b6364c14cb695d5533d0c4e2f7b197cd2d3f2031b96e
- sim-recovery-physical-denied-390.png — SHA256 77ae017feae279447598879951e4c85b966d12f80354f0489e039a405053d8eb
- sim-recovery-physical-review-390.png — SHA256 1307bdcd1f30b9d7a9027e707951ea2a3fd9da651a6e32707dcf47243df5d709

Las respuestas HTTP, los DTO y los efectos son sintéticos; componentes, repositorio y parsers son reales. AuthDB/JWT/RLS/SQL/Next integrado y modelo vivo: NOT_RUN, API0. Counts, máscaras nulas y vacíos declarados no acreditan ausencia. No se acepta autoridad, durabilidad, seguridad independiente ni módulos completos. Matriz342/31PARTIAL/311sin reconciliar/0READY. HIGH5/W4 pendientes, IA writesOFF, issue10OPEN, releaseNOT_ACCEPTED.

Solo SIM consume la política de cierre en esta unidad. El cierre del panel raíz de Contrato y Portabilidad no se ha ejercido; las tres pruebas de Contrato cubren únicamente la confirmación. La revalidación del alta bloqueada sin recibo tampoco se ha ejercido; se verifica salida y reapertura.

1887source78 activo46411 y1908source80 waiter56843 conservan sus pines. La colección1956/113 está preparada (1908+21casos82+27SIM/Contrato83), NO_SOLICITADA. Se coalescerá con la próxima unidad de Contrato antes de otra regresión global; ningún resultado se hereda ni se retargetea, cancela o duplica un control activo. La semántica W178 mantiene pendiente la revisión y el consumo del propietario. F736/B9/981/1266 y los demás fallos y fixtures conservan su alcance. Fuentes y ramas ajenas, PR38/142/153/main/W3core/W4/W5 y el recurso nativo permanecen intactos. Siguiente: reproducir el cierre del panel de contrato manual y consumir la política existente si procede, con pruebas y publicación propias.
