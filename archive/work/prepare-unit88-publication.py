from pathlib import Path
w=Path('work');old='w2x-portability-recovery-close';p='w2x-line-number-recovery-close'
s=(w/('close-'+old+'.ps1')).read_text(encoding='utf-8-sig').replace(old,p).replace('session=8017','session=50713').replace('fix(portabilities): align panel close with reviewed command recovery','fix(portabilities): recover protected number panel close safely')
a=s.index('$body=');b=s.index('foreach($n',a)
s=s[:a]+'''$body='HANDOFF W2-X88 — Número protegido de línea: cierre y limpieza de formulario.'+$nl+'Fuente '+$sha+'; árbol '+$tree+'; rama '+$cp.branch+'; padre '+$cp.base+'; CLAIM '+$cp.claim+'. Controles propios: '+$cp.browser_summary+' (9 casos nuevos y177 regresiones), build66, lint, scan, diff, cola y bundle verificado. Funcionales: NOT_RUN_EXISTING_CONTROL_POLICY_CONSUMPTION.'+$nl+'Causal conservado: dos fallos y un positivo en30,6s, log/exit/banco y3observaciones. Incertidumbre dejaba X habilitada; tras403 y cancelar, X no cerraba. La cancelación normal pasaba. El panel usa closeBlocked existente para closeDisabled y su guardia; conserva setRaw vacío al cierre permitido. No cambia hook, locked, parsers, órdenes, backend o SQL; reversión exacta al padre y banco final idéntico al causal.'+$nl+'Nueve casos a390/768/1440. Incertidumbre conserva el valor y reintenta la misma orden, con un efecto sintético; denegación permite cerrar y reabrir vacío, exige nueva confirmación y nuevo command_id, efecto0 antes y1 después; cancelar revisión no envía orden y reabre vacío. Tras éxito, el padre permanece, la selección no se cambia automáticamente y se ofrece el nuevo número enmascarado. No se crea una portabilidad ni se consulta identifier.get. El valor completo no queda en texto o inputs renderizados tras salir. Solo teléfono sintético reservado. No acredita borrado de memoria, cifrado, almacenamiento protegido o autoridad real. El callback de refresco es síncrono: no se inventa una recuperación interna por503.'+$nl+'Nueve capturas revisadas y alcance visual parcial documentado. HTTP/DTO y efectos sintéticos con componentes/repositorio/parsers reales. AuthDB/JWT/RLS/SQL/Nextintegrado/modelo vivo NOT_RUN;API0. Sin ausencia/quiescencia/reinicio/handler/full23 ni aceptación W4. Global1968/source84 y waiter2007/source86 conservan sus pines y no acreditan87/88. Coalescer siguiente full desde fuente propia cualificada, sin duplicar ni cancelar los controles en curso. Matriz342/31PARTIAL/311sinreconciliar/0READY;cinco HIGH y W4 pendientes,IA writes OFF,issue10 OPEN,release NOT_ACCEPTED. F736/B9 y evidencias anteriores preservadas. Consumo principal pendiente de ACK exacto;ramas y fuentes ajenas intactas.'

''' +s[b:];(w/('close-'+p+'.ps1')).write_text(s,encoding='utf-8-sig')
s='''from pathlib import Path
import json,hashlib,re
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';p='w2x-line-number-recovery-close';cp=w/(p+'-checkpoint.json');j=json.loads(cp.read_text(encoding='utf-8-sig'))
frames=sorted((w/(p+'-final-results')).rglob('line-number-recovery-*.png'));assert len(frames)==9
obs=sorted(f.parent/'observations.json' for f in frames);assert len(obs)==9
for f in obs:
 o=json.loads(f.read_text(encoding='utf-8'));m=o['mode'];assert o['errors']==[] and o['effects']==(0 if m=='review' else 1) and len(o['commands'])==(0 if m=='review' else 2)
 if m=='uncertain':assert o['commands'][0]==o['commands'][1] and o['controls']=={'closeDisabled':True,'cancelDisabled':True}
 if m=='denied':assert o['effectsAfterDenied']==0 and o['commands'][0]['input']['command_id']!=o['commands'][1]['input']['command_id']
 assert not any(q['operation'] in ['portability.create','identifier.get'] for q in o['reads'])
j['visual_review']={'status':'ACTUALLY_VIEWED','scope':'9framesuncertain/review/denied3907681440;protectedentryparentblurDOMonly,syntheticmask/emptyselections notrealstorage/privacyproof.','frames':[{'path':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in frames]}
j['interaction_observations']=[{'path':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in obs]
j['known_remaining_defects']={'whole_product':'NOT_RECONCILED','security':'W4_PENDING_HIGH5','authority':'NOT_RUN_AUTHDB','privacy':'CONTROLLED_DOM_ONLY_NOT_MEMORY_ERASURE_OR_STORAGE_ENCRYPTION','release':'NOT_ACCEPTED'}
b=(w/(p+'-browser.txt')).read_bytes();log=b.decode('utf-16') if b.startswith(b'\\xff\\xfe') else b.decode('utf-8-sig');m=re.search(r'(?m)^\\s*186 passed[^\\r\\n]*',log);assert m;j['browser_summary']=m.group().strip();j['next']='Publish88;preserve1968source84/2007source86. Coalesce next fullfromqualifiedruntimeownsource. Continue individualTEL040review or reproduce SIMidentifierclose;no fullmodule acceptance.';cp.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\\n',encoding='utf-8')
s=f"""# Número protegido de línea: cierre y limpieza del formulario

CLAIM {j['claim']}. Rama `{j['branch']}`, desde `{j['base']}`.

La reproducción original dejó **dos fallos y un positivo en30,6s**: incertidumbre conX habilitada y denegación conX sin efecto tras cancelar la revisión. La cancelación normal pasaba. Se conservan log,exit,banco y tres observaciones. Había un comando/un efecto sintético en incertidumbre,un comando/cero efectos en denegación y cero comandos/efectos en revisión;sin errores de página.

El panel consume `closeBlocked` existente para su propiedad de cierre y la guardia del callback. Se conserva el vaciado de `raw` al salir cuando está permitido. No cambia el hook, `locked`, los parsers, las órdenes, backend oSQL. No se crea una primitiva ni se duplica el recurso W5. La reversión exacta devuelve el padre y el banco final coincide con el causal.

**{j['browser_summary']} propios:**9 casos nuevos y177 regresiones. Incertidumbre conserva el valor introducido y reintenta la misma orden,con un efecto sintético. Denegación permite cerrar y reabrir vacío,exige nueva confirmación y nuevo command_id:cero efectos antes y uno después. Cancelar revisión no envía orden y reabre vacío. Después de confirmar,el padre permanece abierto,la selección de número queda vacía y el nuevo identificador se ofrece enmascarado. No se crea una portabilidad ni se consulta identifier.get. Tras salir,no queda el valor completo en texto o inputs renderizados. Se usa exclusivamente un teléfono sintético reservado. Compilación66,lint,scan,diff,cola ybundle se verifican antes de publicar;funcionalesNOT_RUN_EXISTING_CONTROL_POLICY_CONSUMPTION.

El callback de refresco es síncrono y cierra este formulario después del recibo. No se inventa aquí un modo de recuperación interna por503:la consulta del selector pertenece al padre y esta unidad no acepta esa recuperación completa.

## Alcance visual y de privacidad

Nueve capturas revisadas:incertidumbre,revisión y denegación a390/768/1440. El panel de entrada bajo la confirmación aparece desenfocado;su estado y valor retenido se verifican también por DOM. La limpieza se comprueba después de cerrar/reabrir y después de confirmar. Máscaras,filas y cantidades del fixture son declaradas. No se acredita borrado de memoria,cifrado,almacenamiento protegido,privacidad real o autoridad independiente.

HTTP/DTO y efectos sintéticos con componentes,repositorio y parsers reales. AuthDB/JWT/RLS/SQL/Nextintegrado/modelo vivo:NOT_RUN;API0. Sin ausencia/quiescencia nativa,reinicio,handler o full23. Cinco campos no medidos permanecen sin medir.

Global1968/source84 y waiter2007/source86 mantienen sus pines y no contienen87/88. Coalescer el siguiente full desde una fuente propia cualificada;sin duplicar,cancelar o heredar resultados. Matriz342/31PARTIAL/311sinreconciliar/0READY;cinco HIGH y W4 pendientes,IA writes OFF,issue10 OPEN,release NOT_ACCEPTED. F736/B9 y evidencias anteriores conservan su alcance. Consumo principal pendiente de ACK exacto;main,PR38/142/153 y fuentesW3/W4/W5 intactas.

"""
for f in j['visual_review']['frames']:s+='- '+Path(f['path']).name+' — SHA256 '+f['sha256']+'\\n'
(r/'docs/master/W2X_LINE_NUMBER_RECOVERY_CLOSE_20261018.md').write_text(s,encoding='utf-8');print(j['browser_summary'])
''';(w/('record-'+p+'-visual.py')).write_text(s,encoding='utf-8')
