# Incidencias: cierre y cancelación coherentes durante recuperación

CLAIM6254086824. Padre `c44e5c57e713f78f67b894fbbbd46f55fefaeddc`;rama propia `codex/w2x-case-recovery-close-20261018`.

Causal **3FAIL/2PASS48,3s** a390:cancelar/cerrar confirmación de creación incierta aparece habilitado aunque elguard loignora;Xdecreación conrecibo confirmado/lecturafallida aparecehabilitada sin efecto;cancelación deactualizaciónincierta también. Los positivos decancelaciónprevia yactualizaciónconfirmada conlecturafallida pasan. Observaciones/exit1/banco causal conservados. No es causa deB9/F736 ni reproduce datos reales.

Tres propiedades enCases.tsx:closeDisabled=busy||frozen||reading enelDrawerNuevaIncidencia ycancelDisabled=frozen enlasdosConfirmDialogexistentes. Se reutilizan primitivas,estados yguardias;sin cambiar callbacks,comandos,inputs,recibos,lecturas,idempotencia,contratos,permisos oservicios. Reversiónexacta devuelvepadre;finalidénticoalcausal.

81 passed (2.0m) propios:21nuevos(create/update inciertos,lectura posteriorfallida,review previo y403×3907681440),60regresionesdecontratos,retirada/cambiodecontexto,lecturaspostcomando ynotaspaginadas. Enlos21nuevos,elabortHTTPseproduce despuésdelúnicoefectosintético;reintento envía exactamente lamisma operación/command_id/input yelSetdelharnessmantieneunefecto. Recibo confirmado seguido503 reintenta sololectura,uncomando. Antesdeenviar,cancelación habilitada ysincomando.403definitivoefectocero/cancelación/cierrepermitidos. Esto no acredita transacciónSQL ni idempotenciaAuthDB. Escapeclicsprogramáticosnocircunvalanbloqueos. Build66/lint/scan/diff/cola/bundle propios;funcionalesNOT_RUN_UI_CONTROL_PROPS_ONLY,sinPASSheredado.

## Visual parcial

Twelve actually viewed frames:9 recovery createuncertain/createreadfailed/updateuncertain3907681440 plus3postactionpositives390. Uncertain modals show safe error,disabledcancel/X andvisible retry;receipt-readfailure drawer shows frozenform,savedstatus,disabledX andread-onlyretry. Rootdrawerclose underneath modal checkedbyDOM,not visible throughblur. Three postaction images show returnedinventory(case review/403) orlower editor(update confirmed);confirmed header isaboveviewport andverifiedbyDOM only. No full visual ofall21new or81aggregate cases. Harness/emptyfixture excluded fromrealabsence. Synthetic effectSet counts arenotSQLidempotency.

- case-recovery-create_uncertain-390.png — SHA256 719f9205e3f12a165e0d18a268da405181d49e076f8b18a4056efc303d126cd7
- case-recovery-create_uncertain-1440.png — SHA256 f73a2db87a372199961fbb8bc830f7ade33b9569914ff4314381b29dd223cef5
- case-recovery-update_read_failed-390.png — SHA256 ec226ec3d06dc4dcfe8c346f3b05567ab1341f5148b424a55fa0bd783063c521
- case-recovery-create_read_failed-1440.png — SHA256 5ea2bbcbed870c68ea0e5601378536552124e4a60c3d33e70b9ce9ac698cad29
- case-recovery-update_uncertain-1440.png — SHA256 1b1f7af4a64c57ab9da7ffe3680dd507ebc1579015ccd785d6d8d9f9fee45be2
- case-recovery-update_uncertain-768.png — SHA256 a287f5ca18528a24f0e6f78c9bd2871153251f12b56b91ed1988ad3e5a44dcae
- case-recovery-create_read_failed-768.png — SHA256 8e113b0ccc92b7846c823499935079865b27bfc7da735fdad33d3898aba9e80d
- case-recovery-create_read_failed-390.png — SHA256 d709177f8225d1f65b66a68185f505302af7b92726309d4eefe9ed8ba43ac35c
- case-recovery-update_uncertain-390.png — SHA256 b560ace0f188165dcd91bd3f0d813342d29a0a6b59a5fef94d0c3e89180a0d1a
- case-recovery-create_uncertain-768.png — SHA256 44a894147d2bc741f1edfa011b70a26c185db1e4418b222eb3a1b97bea892345
- case-recovery-create_denied-390.png — SHA256 80a2d3acc9d33e76e017605cda823e9c4e5e822131feb7dbfca7c297b9463ac8
- case-recovery-create_review-390.png — SHA256 80a2d3acc9d33e76e017605cda823e9c4e5e822131feb7dbfca7c297b9463ac8

HTTP/DTO yefectos sintéticos concomponentes/repositorio/parsersreales;AuthDB/JWT/RLS/SQL/Nextintegrado/modelovivoNOT_RUN/API0. Camposdecontador yvacíos sonfixtures,nototalesSQL ni ausenciademostrada. Noacepta autoridad,durabilidad,seguridadindependiente o módulo completo. Matriz342/31PARTIAL/311sinreconciliar/0READY de metadata81;fuentesglobalesanterioresconservan sumatrizpropia. HIGH5/W4pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED.

1887source78activo46411/1908source80waiter56843 noincluyen21casos82 yno se retargetean,cancelan oduplican. W178semánticapendienterevisión/consumo. F736/B9/981/1266/fixtures/preparaciónconservados. Ramas/fuentesajenas/PR38/142/153/main/W3core/W4/W5/recursointactos. Siguiente:reproducir recuperación deSIM/eSIM conhookW2existente,considerandodenegacióndefinitiva,antesdecualquiercorrección;coalescerregresiónglobalposterior.
