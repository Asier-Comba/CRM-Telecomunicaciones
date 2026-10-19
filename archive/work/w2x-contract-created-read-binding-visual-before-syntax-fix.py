from pathlib import Path
import json,hashlib,re
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';p='w2x-contract-created-read-binding';cp=w/(p+'-checkpoint.json');j=json.loads(cp.read_text(encoding='utf-8-sig'))
names={f'contract-binding-{mode}-{width}.png' for mode in ['operator','date','receipt'] for width in [390,768,1440]}|{f'contract-binding-{mode}-1440.png' for mode in ['plan','source','assignee','exact','newer_owner']}|{'contract-binding-newer_owner-390.png'}
frames=sorted(x for x in (w/(p+'-final-results')).rglob('contract-binding-*.png') if x.name in names);assert len(frames)==15
scope='Fifteen actually viewed frames:operator/date/invalidreceipt3907681440,plan/source/assignee/exact1440,newerowner3901440. Five contradictoryDTOtypes show frozenoriginalinputs,savedstatus,safereaderror andread-onlyretry;badreturnedfieldvalues arenotdisplayed. Receiptinvalidity shows confirmationerror,disabledCancel/X andsameorderretry;it isnotasavedreceipt. Positives show registeredstatus/link;rowsbelowviewport,assignmentvalueitselfnotshownandvalidatedbyDTO/DOMflow only. No wholecontracts/C360/securityacceptance. Declaredsummary1/null/emptylists/harness excluded fromSQLtotals orabsence. Originalbadfixture retained,separatefromfiveproductcauses.'
j['visual_review']={'status':'ACTUALLY_VIEWED','scope':scope,'frames':[{'path':str(x),'sha256':hashlib.sha256(x.read_bytes()).hexdigest()} for x in frames]}
obs=sorted((w/(p+'-final-results')).glob('contract-created-read-bind*/observations.json'));assert len(obs)==24
for f in obs:
 o=json.loads(f.read_text(encoding='utf-8'));positive=o['mode'] in ['exact','newer_owner'];receipt=o['mode']=='receipt';assert o['parserChecks']==([True] if positive orreceipt else [True,True]);assert len(o['commands'])==(2 if receipt else 1) and o['effects']==1 and o['errors']==[]
 if receipt:assert o['commands'][0]==o['commands'][1]
j['interaction_observations']=[{'path':str(x),'sha256':hashlib.sha256(x.read_bytes()).hexdigest()} for x in obs]
j['fixture_snapshots']=[{'path':str(w/x),'sha256':hashlib.sha256((w/x).read_bytes()).hexdigest()} for x in [p+'-causal-test.ts',p+'-corrected-causal-test.ts',p+'-fixture-correction.json']]
j['known_remaining_defects']={'whole_product':'NOT_RECONCILED','auth_db':'NOT_RUN','live_model':'NOT_RUN','security':'W4_PENDING_HIGH5','shared_semantics78':'W1_OWNER_REVIEW_CONSUMPTION_PENDING','created_callback_retirement':'NOT_EXERCISEDbythese24;reproducebeforeanylifetimechange','lifecycle_status_full_matrix':'NOT_RECONCILED;fieldcorrelationonly,noallstate/role/authorityacceptance','origin':'Manualflagmatchisnotlegacyprovenanceauditacceptance','release':'NOT_ACCEPTED'}
j['next']='Publish85. Preserve1968source84waiter42972 withknownfivecorrelationdefects;noPASSfor85fromthatbank. Prepare1992/115onlyandcoalescewithnextreproducedContractcallbackretirementunit86 beforeanotherfull.1908source80active56843 remainsfrozen. No W3core/native/owneredits.'
b=(w/(p+'-browser.txt')).read_bytes();log=b.decode('utf-16') if b.startswith(b'\xff\xfe') else b.decode('utf-8-sig');summary=re.search(r'(?m)^\s*141 passed[^\r\n]*',log);assert summary;j['browser_summary']=summary.group().strip();cp.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
doc=f'''# Contrato creado: vincular la lectura a la orden confirmada

CLAIM {j['claim']}; precisión en el comentario de ampliación del checkpoint. Padre `b4a8505ebaf97c5b23185d1e0c61c557eb450d5f`; rama `codex/w2x-contract-created-read-binding-20261018`.

El causal original dejó6FAIL/2PASS1,9min. Son **cinco fallos de producto**, un fallo de fixture y dos positivos. Los cinco DTO estructuralmente válidos cambiaban operador, fecha inicial, versión de tarifa, origen o responsable en la misma versión: la pantalla aceptaba la lectura y cerraba el panel. Las7lecturas de los cinco negativos y dos positivos tienen parserChecks[true]. El caso older usaba un recibo2 inválido para creación: el parser exige1 y lo rechaza antes de portfolio.get; parserChecks[]. No demuestra un defecto de versión del producto. El guard de preedición detectó esta diferencia antes de cambiar código. Se conservan rawlog,exit,banco y8auxiliares originales.

Solo se corrigió ese fixture para comprobar el límite existente: recibo2 inválido,error seguro,cancelación bloqueada,sin lectura yreintento de la misma orden; el segundo recibo1 permite una lectura yel conjunto de efectos del harness sigue en1. Ese único caso corregido pasa1/1 en13,8s sobre el producto padre,sin repetir los cinco fallos o dos verdes. Se mantuvieron las aserciones de los cinco DTO contradictorios. El banco final coincide con la corrección documentada; otra guardia reconstruye el original.

El ref existente conserva ahora input yrecibo tipados, en lugar de solo elID. La lectura comprueba cliente,operador,fecha,tarifa yorigen frente a esos datos. El responsable debe coincidir cuando la versión leída es la delrecibo; una reasignación legítima posterior sigue siendo válida. `PORTFOLIO_V1_CONTRACT.md` documenta las identidades inmutables yla asignación local modificable. El parser existente sigue controlando las versiones válidas; no se añade una regla redundante ni se modifica W1. No hay otro estado,efecto,primitiva,servicio,SQL,comando oconsulta. Se conserva la recuperación por lectura,sin reenviar una creación confirmada,yla política de cierre. La reversión exacta devuelve el padre.

**{j['browser_summary']} propios:**24pertinentes(15negativos de cinco DTO×3anchos,3recibos inválidos y6positivos exacto/propietario posterior),117regresiones contextuales. En cada contradicción, el recibo permanece y la lectura correcta posterior recupera el panel:un comando,un efecto sintético,dos consultas alID/kind exactos. El recibo inválido mantiene la orden y la reintenta idéntica. Los positivos conservan un comando yuna lectura. Esto no acredita un productorSQL defectuoso,idempotencia real,JWTRLS o autoridad. Build66,lint,scan,diff,cola ybundle propios;funcionalesNOT_RUN_UI_POST_RECEIPT_READ_CORRELATION.

## Visual parcial

{scope}

'''
for f in j['visual_review']['frames']:doc+='- '+Path(f['path']).name+' — SHA256 '+f['sha256']+'\n'
doc+='''
HTTP/DTO/efectos sintéticos con componentes, repositorio yparsers reales. AuthDB/JWT/RLS/SQL/Nextintegrado/modelovivoNOT_RUN/API0. Counts yvacíos declarados no son medicionesSQL ni ausencia. Coincidir con la bandera manual no verifica el origen legado mediante auditoría. No se acepta el módulo completo,la matriz completa de estados/roles,durabilidad o seguridad independiente.

1908source80 activo56843 y1968source84 waiter42972 conservan sus pines. La fuente84 tiene estos cinco defectos demostrados sobre su SHA exacto:su futuro resultado1968 no acredita esta corrección. Se mantiene ese control solicitado,sin cancelarlo oretargetearlo.1992/115 solo se preparará como1968+24; se coalescerá con la siguiente unidad de retirada delcallback si se reproduce. Matriz342/31PARTIAL/311sinreconciliar/0READY,HIGH5/W4 pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. W178revisión/consumopendiente. F736/B9/981/1266,fixtures,preparación yla pérdida auxiliar83 conservan su alcance. Fuentes/ramasajenas/PR38/142/153/main/W3core/W4/W5/recurso intactos. REQUEST W1: revisar la correspondencia de campos inmutables yresponsable por versión antes de consumir esta fuente en la integración principal; ninguna aceptación se infiere por silencio.
'''
(r/'docs/master/W2X_CONTRACT_CREATED_READ_BINDING_20261018.md').write_text(doc,encoding='utf-8');print(j['browser_summary'])
