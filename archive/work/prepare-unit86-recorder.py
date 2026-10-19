from pathlib import Path
w=Path('work');p='w2x-contract-create-read-retirement'
s='''from pathlib import Path
import json,hashlib,re
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';p='w2x-contract-create-read-retirement';cp=w/(p+'-checkpoint.json')
j=json.loads(cp.read_text(encoding='utf-8-sig'))
frames=sorted((w/(p+'-final-results')).rglob('contract-retirement-*.png'));assert len(frames)==15
obs=sorted((w/(p+'-final-results')).glob('contract-create-read-retire*/observations.json'));assert len(obs)==15
for f in obs:
 o=json.loads(f.read_text(encoding='utf-8'));assert o['before']==0 and o['after']==(1 if o['mode']=='current' else 0) and o['effects']==1 and len(o['commands'])==1 and o['errors']==[]
j['visual_review']={'status':'ACTUALLY_VIEWED','scope':'15frames390/768/1440:reference/company/actor/viewer inventories declaredempty;current registeredstatus/link visible. Rowsoutsideviewport;fixtureharness excluded. OnlycontrolledProviderremount simulation,notAuthDB/nativequiescence/handler/full23.','frames':[{'path':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in frames]}
j['interaction_observations']=[{'path':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in obs]
j['known_remaining_defects']={'whole_product':'NOT_RECONCILED','security':'W4_PENDING_HIGH5','after_get':'NOT_EXERCISED_ALREADY_ISSUED_REQUESTS_NOT_CANCELLED','authority':'CONTROLLED_REMOUNT_ONLY_NOT_REAL_REVOCATION','release':'NOT_ACCEPTED'}
j['next']='Publish86;prepare2007/116afterown156/build66/lint/scan/visual,andrequestsinglewaiterafter1968terminal/PUBLISHED/PASS. Preserve1908/1968exactpins. ThenreproducePortabilityrootcloseifunclaimed.'
b=(w/(p+'-browser.txt')).read_bytes();log=b.decode('utf-16') if b.startswith(b'\\xff\\xfe') else b.decode('utf-8-sig');m=re.search(r'(?m)^\\s*156 passed[^\\r\\n]*',log);assert m;j['browser_summary']=m.group().strip()
cp.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\\n',encoding='utf-8')
doc=f"""# Contrato: lectura dependiente después de retirar el formulario

CLAIM {j['claim']}; padre `{j['base']}`; rama `{j['branch']}`.

Causal original4FAIL1PASS48,6s: referencia,empresa,actor yrol retiraban el formulario antes del recibo,pero la continuación iniciaba portfolio.get del contrato anterior. El contexto actual positivo sí debe consultar. Se conservan log,exit,banco y5observaciones originales;cada caso tenía0lecturas antes y1después,1comando,1efecto sintético y0errores de página.

Una referencia local registra montaje/desmontaje del formulario. La continuación consulta esa referencia antes de iniciar la lectura dependiente. Se conserva el resultado de la creación;no se cancela un efecto ni una petición ya emitida. No guardia después de GET,no nueva primitiva,servicio,comando,consulta,SQL oregla de autoridad. Reversión exacta del producto yde la extensión del fixture al padre. Banco final idéntico al causal.

{j['browser_summary']} propios:15 casos nuevos(referencia/empresa/actor/lector/actual×390/768/1440),141regresiones contextuales. Los12retirados no inician portfolio.get;los3actuales consultan1vez y muestran enlace alID exacto. Cada caso conserva1comando y1efecto sintético. Build66,lint,scan,diff,cola ybundle propios;funcionalesNOT_RUN_UI_COMPONENT_LIFETIME_BEFORE_DEPENDENT_READ.

Quince capturas vistas:inventario declarado vacío en contextos retirados,estado/enlace registrado enactual;filas fuera deviewport ycontrolesdelharness no son aceptación integral. Se reutiliza la entrada HTTP de recurso existente conContractsInventory yel Provider controlado. Cambios de ámbito simulan el desmontaje por las claves que usa el Provider deproducto,no sesiónJWT ni revocación real. No AuthDB/RLS/SQL/Nextintegrado/modelovivo/API. No ausencia/quiescencia nativa,reinicio/handler/full23 ni cinco campos no medidos. Cero peticiones cliente es una medición local del caso,no cero efectos comerciales reales.

1908source80 y1968source84 conservan pines.1968no contiene la correlación85 ni esta guardia86;no PASS heredado.1992/115solo preparado yno solicitado;colección coalescida2007/116verificada antes de futura ejecución,tras1968terminal/PUBLISHED/PASS.342/31PARTIAL/311sinreconciliar/0READY,HIGH5/W4pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9yfallos de fixture/preparación/pérdida auxiliar83conservados. No ramas ajenas,main,PR38/142/153,W3core/W4/W5/recurso modificados. Consumo principal requiere ACK exacto independiente.

"""
for f in j['visual_review']['frames']:doc+='- '+Path(f['path']).name+' — SHA256 '+f['sha256']+'\\n'
(r/'docs/master/W2X_CONTRACT_CREATE_READ_RETIREMENT_20261018.md').write_text(doc,encoding='utf-8');print(j['browser_summary'])
'''
(w/('record-'+p+'-visual.py')).write_text(s,encoding='utf-8')
