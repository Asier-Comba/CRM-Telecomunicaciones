from pathlib import Path
w=Path('work');old='w2x-contract-create-read-retirement';p='w2x-portability-recovery-close'
s=(w/('close-'+old+'.ps1')).read_text(encoding='utf-8-sig').replace(old,p).replace('session=12245','session=8017').replace('fix(contracts): avoid starting dependent read after create form unmount','fix(portabilities): align panel close with reviewed command recovery')
a=s.index('$body=');b=s.index('foreach($n',a)
s=s[:a]+'''$body='HANDOFF W2-X87 — Portabilidades: cierre coherente durante recuperación y denegación.'+$nl+'Fuente '+$sha+'; árbol '+$tree+'; rama '+$cp.branch+'; padre '+$cp.base+'; CLAIM '+$cp.claim+'. Controles propios: '+$cp.browser_summary+' (24 casos nuevos y 153 regresiones), build66, lint, scan, diff, cola y bundle verificado. Funcionales: NOT_RUN_EXISTING_CONTROL_POLICY_CONSUMPTION.'+$nl+'Original: seis fallos y dos positivos en1,5min, con log, exit, banco y ocho observaciones conservados. En entrada y salida, X estaba habilitada durante incertidumbre y lectura fallida; tras403, cancelar la revisión dejaba X habilitada pero sin efecto. Los dos positivos de revisión/cancelación normal pasaban. El panel consume closeBlocked existente tanto en closeDisabled como en su guardia de cierre. No se modifica el hook, locked, comandos, lecturas, servicios, parsers ni SQL. Reversión exacta al padre; banco final idéntico al causal.'+$nl+'Los24casos cubren cuatro modos por dos direcciones y tres anchos. Incertidumbre recupera con la misma orden y un efecto sintético; recibo confirmado con503 reintenta solo la lectura (un comando, dos GET alID exacto); denegación permite salir y reabrir con nuevo command_id, efecto0 antes y1 después de nueva confirmación; cancelar revisión no envía orden. Se conservan dirección, línea, número enmascarado, operadores y fecha. Dieciséis capturas revisadas:12recuperaciones críticas a390/768/1440 y4positivos de salida/denegación. Controles externos del fixture y cantidades declaradas no acreditan datos reales ni aceptación integral.'+$nl+'HTTP/DTO/efectos sintéticos con componentes, repositorio y parsers reales. AuthDB/JWT/RLS/SQL/Nextintegrado/modelo vivo NOT_RUN;API0. Sin ausencia/quiescencia/reinicio/handler/full23 ni aceptación W4. Global1968/source84 y waiter2007/source86 conservan sus pines; ninguno acredita esta fuente87. No repetición de verdes ni PASS heredado. Matriz342/31PARTIAL/311sinreconciliar/0READY;cinco HIGH y W4 pendientes,IA comercial writes OFF,issue10 OPEN,release NOT_ACCEPTED. F736/B9 y evidencias anteriores preservadas. Consumo principal requiere ACK exacto;ramas y fuentes ajenas intactas.'

''' +s[b:]
(w/('close-'+p+'.ps1')).write_text(s,encoding='utf-8-sig')
s='''from pathlib import Path
import json,hashlib,re
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';p='w2x-portability-recovery-close';cp=w/(p+'-checkpoint.json');j=json.loads(cp.read_text(encoding='utf-8-sig'))
allframes=sorted((w/(p+'-final-results')).rglob('portability-recovery-*.png'));assert len(allframes)==24
frames=[f for f in allframes if any('-'+m+'-' in f.name for m in ['uncertain','read_failed']) or f.name in {'portability-recovery-inbound-review-390.png','portability-recovery-inbound-denied-390.png','portability-recovery-outbound-review-1440.png','portability-recovery-outbound-denied-1440.png'}];assert len(frames)==16
obs=sorted(f.parent/'observations.json' for f in allframes);assert len(obs)==24
for f in obs:
 o=json.loads(f.read_text(encoding='utf-8'));m=o['mode'];assert o['errors']==[] and o['effects']==(0 if m=='review' else 1) and len(o['commands'])==(0 if m=='review' else 1 if m=='read_failed' else 2)
 if m=='uncertain':assert o['commands'][0]==o['commands'][1] and o['controls']=={'closeDisabled':True,'cancelDisabled':True}
 if m=='read_failed':assert o['controls']=={'closeDisabled':True}
 if m=='denied':assert o['effectsAfterDenied']==0 and o['commands'][0]['input']['command_id']!=o['commands'][1]['input']['command_id']
j['visual_review']={'status':'ACTUALLY_VIEWED','scope':'16frames:12critical uncertain/readfailed bothdirections390/768/1440;review/denied inbound390/outbound1440. ParentrootblurDOMonly;declaredmaskedrows/inventory notSQL.','frames':[{'path':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in frames]}
j['interaction_observations']=[{'path':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in obs]
j['known_remaining_defects']={'whole_product':'NOT_RECONCILED','security':'W4_PENDING_HIGH5','authority':'NOT_RUN_AUTHDB','release':'NOT_ACCEPTED'}
b=(w/(p+'-browser.txt')).read_bytes();log=b.decode('utf-16') if b.startswith(b'\\xff\\xfe') else b.decode('utf-8-sig');m=re.search(r'(?m)^\\s*177 passed[^\\r\\n]*',log);assert m;j['browser_summary']=m.group().strip();j['next']='Publish87;global1968source84 and2007source86 unchanged. Reproduce next independent commercial defect or reconcile one requirement with individual evidence;no wholemodule acceptance.';cp.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\\n',encoding='utf-8')
s=f"""# Portabilidades: cierre del panel durante recuperación

CLAIM {j['claim']}. Rama `{j['branch']}`, desde `{j['base']}`.

La reproducción original dejó **seis fallos y dos positivos en 1,5 minutos**, en entradas y salidas a390px. Durante incertidumbre o lectura fallida, X estaba habilitada aunque no podía cerrar. Tras una denegación, cancelar la revisión dejaba X habilitada pero sin efecto. Los dos positivos de revisión/cancelación normal pasaban. Se conservan el log, exit, banco y ocho observaciones; los casos incierto/lectura fallida tenían un comando y un efecto sintético, denegación un comando y cero efectos, revisión cero comandos y efectos. No hubo errores de página.

El panel consume la política existente `closeBlocked` tanto en `closeDisabled` como en su guardia de cierre. No cambia el hook compartido, `locked`, las órdenes, lecturas, servicios, parsers o SQL. No se rehace una primitiva. La reversión exacta devuelve el padre; el banco final es idéntico al causal.

**{j['browser_summary']} propios:**24 casos nuevos y153 regresiones. Los cuatro modos cubren entrada/salida a390/768/1440. Incertidumbre repite la misma orden, conservando un efecto sintético. Recibo confirmado más503 reintenta solo la lectura:un comando,dos GET al ID exacto. Denegación permite salir y reabrir con nuevo command_id; cero efectos antes y uno tras la nueva confirmación. Cancelar revisión no envía orden. Se conservan línea,número enmascarado,dirección,operadores y fecha. Compilación66,lint,scan,diff,cola ybundle se verifican antes de publicar. Funcionales:NOT_RUN_EXISTING_CONTROL_POLICY_CONSUMPTION.

## Evidencia visual parcial

Dieciséis capturas revisadas:las doce recuperaciones críticas(incertidumbre/lectura fallida,en ambas direcciones y tres anchos),más revisión y denegación en entrada390 y salida1440. El cierre del panel padre bajo el diálogo se verifica también por DOM; su apariencia desenfocada no acredita todo el panel. Cantidades, filas y números enmascarados del fixture son declarados,no datos reales o mediciones SQL. Los controles externos del fixture no son interfaz comercial.

HTTP/DTO y efectos sintéticos con componentes, repositorio y parsers reales. AuthDB/JWT/RLS/SQL/Nextintegrado/modelo vivo:NOT_RUN;API0. No ausencia/quiescencia nativa,reinicio,handler o full23. No aceptación integral de portabilidades,roles,privacidad o seguridad W4.

Global1968/source84 y waiter2007/source86 conservan sus pines; ninguno contiene este cambio87. No resultados heredados. Matriz342/31PARTIAL/311sinreconciliar/0READY;cinco HIGH y W4 pendientes,IA comercial writes OFF,issue10 OPEN,release NOT_ACCEPTED. F736/B9 y evidencias anteriores conservan su alcance. Consumo principal pendiente de ACK exacto;main,PR38/142/153 y fuentesW3/W4/W5 intactas.

"""
for f in j['visual_review']['frames']:s+='- '+Path(f['path']).name+' — SHA256 '+f['sha256']+'\\n'
(r/'docs/master/W2X_PORTABILITY_RECOVERY_CLOSE_20261018.md').write_text(s,encoding='utf-8');print(j['browser_summary'])
'''
(w/('record-'+p+'-visual.py')).write_text(s,encoding='utf-8')
