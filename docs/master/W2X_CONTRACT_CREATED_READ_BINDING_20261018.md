# Contrato creado: vincular la lectura a la orden confirmada

CLAIM 6254448897; precisión en el comentario de ampliación del checkpoint. Padre `b4a8505ebaf97c5b23185d1e0c61c557eb450d5f`; rama `codex/w2x-contract-created-read-binding-20261018`.

El causal original dejó6FAIL/2PASS1,9min. Son **cinco fallos de producto**, un fallo de fixture y dos positivos. Los cinco DTO estructuralmente válidos cambiaban operador, fecha inicial, versión de tarifa, origen o responsable en la misma versión: la pantalla aceptaba la lectura y cerraba el panel. Las7lecturas de los cinco negativos y dos positivos tienen parserChecks[true]. El caso older usaba un recibo2 inválido para creación: el parser exige1 y lo rechaza antes de portfolio.get; parserChecks[]. No demuestra un defecto de versión del producto. El guard de preedición detectó esta diferencia antes de cambiar código. Se conservan rawlog,exit,banco y8auxiliares originales.

Solo se corrigió ese fixture para comprobar el límite existente: recibo2 inválido,error seguro,cancelación bloqueada,sin lectura yreintento de la misma orden; el segundo recibo1 permite una lectura yel conjunto de efectos del harness sigue en1. Ese único caso corregido pasa1/1 en13,8s sobre el producto padre,sin repetir los cinco fallos o dos verdes. Se mantuvieron las aserciones de los cinco DTO contradictorios. El banco final coincide con la corrección documentada; otra guardia reconstruye el original.

El ref existente conserva ahora input yrecibo tipados, en lugar de solo elID. La lectura comprueba cliente,operador,fecha,tarifa yorigen frente a esos datos. El responsable debe coincidir cuando la versión leída es la delrecibo; una reasignación legítima posterior sigue siendo válida. `PORTFOLIO_V1_CONTRACT.md` documenta las identidades inmutables yla asignación local modificable. El parser existente sigue controlando las versiones válidas; no se añade una regla redundante ni se modifica W1. No hay otro estado,efecto,primitiva,servicio,SQL,comando oconsulta. Se conserva la recuperación por lectura,sin reenviar una creación confirmada,yla política de cierre. La reversión exacta devuelve el padre.

**141 passed (3.1m) propios:**24pertinentes(15negativos de cinco DTO×3anchos,3recibos inválidos y6positivos exacto/propietario posterior),117regresiones contextuales. En cada contradicción, el recibo permanece y la lectura correcta posterior recupera el panel:un comando,un efecto sintético,dos consultas alID/kind exactos. El recibo inválido mantiene la orden y la reintenta idéntica. Los positivos conservan un comando yuna lectura. Esto no acredita un productorSQL defectuoso,idempotencia real,JWTRLS o autoridad. Build66,lint,scan,diff,cola ybundle propios;funcionalesNOT_RUN_UI_POST_RECEIPT_READ_CORRELATION.

## Visual parcial

Fifteen actually viewed frames:operator/date/invalidreceipt3907681440,plan/source/assignee/exact1440,newerowner3901440. Five contradictoryDTOtypes show frozenoriginalinputs,savedstatus,safereaderror andread-onlyretry;badreturnedfieldvalues arenotdisplayed. Receiptinvalidity shows confirmationerror,disabledCancel/X andsameorderretry;it isnotasavedreceipt. Positives show registeredstatus/link;rowsbelowviewport,assignmentvalueitselfnotshownandvalidatedbyDTO/DOMflow only. No wholecontracts/C360/securityacceptance. Declaredsummary1/null/emptylists/harness excluded fromSQLtotals orabsence. Originalbadfixture retained,separatefromfiveproductcauses.

- contract-binding-receipt-1440.png — SHA256 44b5d2ca06d6859b884a65c716f53c8bc2561c2bfc92942bb7333f30643445db
- contract-binding-plan-1440.png — SHA256 9e83eeed3b0c2482f9fd61f5692d705c6a00de1280aa0952c05d943b6c7931db
- contract-binding-exact-1440.png — SHA256 e2e7b739ee203fea2328aa097552c13ad3fcdbcc842036fae458c7db2ce52314
- contract-binding-newer_owner-390.png — SHA256 518ed5e6ab67a22664eaaa296c5c155de1c022ffa53cfbf0cf484b6c38c09797
- contract-binding-source-1440.png — SHA256 9e83eeed3b0c2482f9fd61f5692d705c6a00de1280aa0952c05d943b6c7931db
- contract-binding-date-1440.png — SHA256 9e83eeed3b0c2482f9fd61f5692d705c6a00de1280aa0952c05d943b6c7931db
- contract-binding-newer_owner-1440.png — SHA256 e2e7b739ee203fea2328aa097552c13ad3fcdbcc842036fae458c7db2ce52314
- contract-binding-operator-390.png — SHA256 cba645911fede7886fb8af3f0d15c8d74a6c5327abf828e402239a29df30b91a
- contract-binding-date-768.png — SHA256 cae329aeba7f3ed3883d44355869a339f04d7b4a2e281e2f7be3357c407d5828
- contract-binding-date-390.png — SHA256 cba645911fede7886fb8af3f0d15c8d74a6c5327abf828e402239a29df30b91a
- contract-binding-assignee-1440.png — SHA256 b40003e399243009f6b92913f50b58407060ffc8a517eb731a2d0a9f0d3a18a4
- contract-binding-receipt-390.png — SHA256 3a46872c231d3d4d54363587a33f613ea3b7c4ade36eb82758335bfe64d00825
- contract-binding-operator-768.png — SHA256 cae329aeba7f3ed3883d44355869a339f04d7b4a2e281e2f7be3357c407d5828
- contract-binding-operator-1440.png — SHA256 b40003e399243009f6b92913f50b58407060ffc8a517eb731a2d0a9f0d3a18a4
- contract-binding-receipt-768.png — SHA256 514eb45a8d7020b2c8818fa59bbae09eb4c541b2bcb9b415a1444fbf96a6dea8

HTTP/DTO/efectos sintéticos con componentes, repositorio yparsers reales. AuthDB/JWT/RLS/SQL/Nextintegrado/modelovivoNOT_RUN/API0. Counts yvacíos declarados no son medicionesSQL ni ausencia. Coincidir con la bandera manual no verifica el origen legado mediante auditoría. No se acepta el módulo completo,la matriz completa de estados/roles,durabilidad o seguridad independiente.

1908source80 activo56843 y1968source84 waiter42972 conservan sus pines. La fuente84 tiene estos cinco defectos demostrados sobre su SHA exacto:su futuro resultado1968 no acredita esta corrección. Se mantiene ese control solicitado,sin cancelarlo oretargetearlo.1992/115 solo se preparará como1968+24; se coalescerá con la siguiente unidad de retirada delcallback si se reproduce. Matriz342/31PARTIAL/311sinreconciliar/0READY,HIGH5/W4 pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. W178revisión/consumopendiente. F736/B9/981/1266,fixtures,preparación yla pérdida auxiliar83 conservan su alcance. Fuentes/ramasajenas/PR38/142/153/main/W3core/W4/W5/recurso intactos. REQUEST W1: revisar la correspondencia de campos inmutables yresponsable por versión antes de consumir esta fuente en la integración principal; ninguna aceptación se infiere por silencio.
