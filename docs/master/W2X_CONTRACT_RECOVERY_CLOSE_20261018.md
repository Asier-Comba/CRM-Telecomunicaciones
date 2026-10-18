# Contrato manual: controles de cierre durante recuperación

CLAIM 6254341915. Padre `744c8c4430a59f8d835f9ec6f36578ca54adca39`;rama `codex/w2x-contract-recovery-close-20261018`.

Causal **3FAIL/1PASS47,5s** a390px: el cierre del panel aparece habilitado pero no actúa durante un envío incierto, tras un recibo confirmado con lectura fallida, y después de cancelar una denegación definitiva. La cancelación antes del envío funciona. Se conservan log,exit1,banco yarchivos de cada caso en una carpeta exclusiva de este intento.

El panel ContractCreate consume `closeBlocked`, ya derivado por el hook existente, tanto en `closeDisabled` como en su guardia. Es el único cambio de producto. No modifica el hook,estado,efectos,comandos,entradas,recibos,lecturas,contratos oservicios. La reversión exacta reconstruye el padre yel banco final es idéntico alcausal.

**117 passed (2.6m) propios:**12casos pertinentes(incertidumbre,lectura fallida,revisión previa y403 por390/768/1440),105regresiones deSIM,Incidencias,Customer360 yselección decontratos son contexto. Incertidumbre reintenta la misma operación/input/command_id con un efecto en el harness. Recibo+503 solo reconsulta portfolio.get,un comando ydos lecturas alID/kind exactos.403 observa efecto sintético0;permite cancelar/cerrar yreabrir para una nuevaorden explícita,distinto command_id yposterior efecto1. Revisión previa0comandos. El registro leído corresponde alcliente yse conserva elenlace alcontrato creado. No se activa ningún servicio nioperador. Son efectos sintéticos,no idempotenciaSQL niAuthDBreal. Build66,lint,scan,diff,cola ybundle propios;funcionalesNOT_RUN_EXISTING_CONTROL_POLICY_CONSUMPTION.

## Revisión visual parcial

Twelve actually viewed frames:uncertain/readfailed/review/denied at3907681440. Uncertainconfirmation shows safemessage,disabledCancel/X andenabledsameoperationretry;rootcloseunderblur isDOMevidenceonly. Receipt-readfailure shows frozenoperator/date/plan/assignee form,savedstatus,disabledX andreadretry. Deniedframes takenAFTERexplicitclose/reopen/success show registeredstatus/link;table rows aremostlybelowviewport,notacceptedvisually. Reviewframes show returnedContracts tab/emptydeclaredlist;mobilepaging andheaders partlyoutsideviewport. Counts1/null/emptypriority andlist arefixtures,notSQLtotals/absence. Partial product visual,notfullC360/contracts/securityacceptance.

- contract-recovery-denied-1440.png — SHA256 86b565b75e532d53fb0dd015ea0f1d9ae3e6c35ba6ab8fd3fdfbf5dea819b125
- contract-recovery-read_failed-768.png — SHA256 032856e050939878214a5341bc0c2da3f1aecb2334bbb49b6003178ac65ce867
- contract-recovery-review-768.png — SHA256 cab1147e417126e5c123026938816f22cd0e19df0823d4fd68dec5e6c7b4248f
- contract-recovery-review-390.png — SHA256 afc83637320222a08644c6d68004821c7fbcec811abfde37438af9e27add4fa1
- contract-recovery-uncertain-1440.png — SHA256 925435fceece3404737c7572d261d7df2cd2b04bff4082e5e05ae90e2c379efa
- contract-recovery-uncertain-390.png — SHA256 0a5c90cc2759a9e84d252ae700b18460a0c9f42843126bd797c2edbe3aaa98e8
- contract-recovery-denied-390.png — SHA256 518ed5e6ab67a22664eaaa296c5c155de1c022ffa53cfbf0cf484b6c38c09797
- contract-recovery-read_failed-1440.png — SHA256 780a30bd23f7a7658ab6207ebaaae1a865db57696bd8d7bec44e19becca85f16
- contract-recovery-read_failed-390.png — SHA256 b862f1febdfdf0dd168936f2cef9f74a8107ebb06e4c05d9a9296bd4b5df76af
- contract-recovery-review-1440.png — SHA256 d24325b6d70930918bd178d383e4836c4f03bfb3557e854795c2b50d81793760
- contract-recovery-uncertain-768.png — SHA256 b0ac52fee3a5f1439ca41f98955b89ddb499485dac4dde77e5f856043d1e206e
- contract-recovery-denied-768.png — SHA256 df1ad628718f9f00cb791a91ba3be46d8986533cc00792be8e4541469cee3638

HTTP/DTO/efectos sintéticos con componentes, repositorio yparsers reales. AuthDB/JWT/RLS/SQL/Nextintegrado/modelovivoNOT_RUN/API0. No se acepta ausencia,autoridad,durabilidad,seguridadindependiente ni módulo completo. La validación de campos constructor/versión de lectura posterior alrecibo queda fuera de estaunidad: se mantiene elchequeo de cliente existente yse reproducirá antes de cambiarlo.

Matriz342/31PARTIAL/311sinreconciliar/0READY. HIGH5/W4 pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED.1887source78 activo46411 y1908source80 waiter56843 conservan suspines.1968/114está coleccionado(1908+21Incidencias82+27SIMContrato83+12Contrato84) ysolo seencolará tras propia publicación/controles y1908terminal/PUBLISHED/PASS.1956quedó preparado/DEFERRED,nunca solicitado. No retarget,cancelación,duplicación oPASS heredado. W178revisión/consumopendiente. F736/B9/981/1266/fixtures/preparación yla pérdida auxiliar de83 conservan sualcance. Fuentes/ramasajenas/PR38/142/153/main/W3core/W4/W5/recurso intactos. Siguiente: comprobar invariantes de operador,fecha,tarifa,origen yrecibo según PORTFOLIO_V1 antes de cualquier ajuste adicional.
