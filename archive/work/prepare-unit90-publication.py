from pathlib import Path
w=Path('work');old='w2x-portability-recovery-close';p='w2x-sim-identifier-recovery-close'
s=(w/('close-'+old+'.ps1')).read_text(encoding='utf-8-sig').replace(old,p).replace('session=8017','session=9109').replace('fix(portabilities): align panel close with reviewed command recovery','fix(sims): preserve identifier operation recovery on panel close')
a=s.index('$body=');b=s.index('foreach($n',a)
s=s[:a]+'''$body='HANDOFF W2-X90 — Identificadores de SIM/eSIM: cierre durante creación,retirada y recuperación.'+$nl+'Fuente '+$sha+'; árbol '+$tree+'; rama '+$cp.branch+'; padre '+$cp.base+'; CLAIM '+$cp.claim+'. Controles propios: '+$cp.browser_summary+' (48 casos pertinentes y189 regresiones),build66,lint,scan,diff,cola ybundle verificado. Funcionales:NOT_RUN_EXISTING_CONTROL_POLICY_CONSUMPTION. No resultado heredado de metadata89 o fuentes anteriores.'+$nl+'Original conservado:12FAIL/4PASS2,9min,log/exit/banco48 y16observaciones;crear/retirar ICCIDfísico/EIDeSIM,incertidumbre/lectura fallida/403 con X habilitada o sin efecto;cancelación normal positiva. Se refinó solo el fixture eSIM:su ICCID101 ya proyectado por sim.get figura ahora como compañero en identifier.list,con IDs ordenados y DTO coherente. No aserción relajada;no fue causa de los12fallos de UI. Producto intacto en la comprobación complementaria:uncierto1FAIL/revisión1PASS23,4s. Original yrefinamiento separados yreconstruibles.'+$nl+'El panel consume closeBlocked existente en closeDisabled y su guardia,conservando setRaw vacío al salir. No cambio de hook,Drawer,ConfirmDialog,locked,contratos,servicios,backend,SQL o reglas de autorización. Incertidumbre repite la misma orden y un efecto sintético;recibo+503 solo repite sim.get,un comando/dos lecturas posteriores;403 permite salir,reabrir vacío ynueva confirmación con nuevo command_id. Retirada conserva id/expected_version1 yrecibo2;no aceptación CAS/SQL real. Tras recuperar,se vuelve a consultar la lista enmascarada,con estado retirado ysin volver a ofrecer esa retirada. No valor completo en texto oinputs renderizados al salir;no borrado de memoria,cifrado o privacidad real.'+$nl+'32capturas realmente vistas:24recuperaciones críticas (ambas acciones/tipos y3anchos),4denegaciones390 y4revisiones1440. Alcance visual parcial,controles de recuperación y formularios/máscaras declaradas;padre bajo confirmación porDOM,campos/footers según viewport detallados en documento. HTTP/DTO/efectos sintéticos con componentes/repositorio/parsers reales. AuthDB/JWT/RLS/SQL/Nextintegrado/modelo vivoNOT_RUN/API0. Sin ausencia/quiescencia/reinicio/handler/full23.'+$nl+'Global1968/source84 cerrado con sus cinco discrepancias conocidas;2007/source86 activo41016 y2043/source88 waiter93361 mantienen pines yno acreditan90. No añadir otrofull solicitado hasta revisar coalescencia/backlog;2091 solo candidatoDEFERRED si se prepara. Matriz342/31PARTIAL/311sinreconciliar/0READY,HIGH5/W4 pendientes,IA writesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9 y evidencias anteriores preservadas. Main,PR38/142/153 yfuentesW3/W4/W5/recurso intactos;consumo principal pendiente de ACK exacto. Continuar defecto comercial reproducido en Cartera uotra unidad útil.'

''' +s[b:];(w/('close-'+p+'.ps1')).write_text(s,encoding='utf-8-sig')
s='''from pathlib import Path
import json,hashlib,re
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';p='w2x-sim-identifier-recovery-close';cp=w/(p+'-checkpoint.json');j=json.loads(cp.read_text(encoding='utf-8-sig'))
allframes=sorted((w/(p+'-final-results')).rglob('sim-identifier-recovery-*.png'));assert len(allframes)==48
frames=[f for f in allframes if any('-'+m+'-' in f.name for m in ['uncertain','read_failed']) or '-denied-390.png' in f.name or '-review-1440.png' in f.name];assert len(frames)==32
obs=sorted(f.parent/'observations.json' for f in allframes);assert len(obs)==48
for f in obs:
 o=json.loads(f.read_text(encoding='utf-8'));m=o['mode'];assert o['errors']==[] and o['unexpected']==[] and o['effects']==(0 if m=='review' else 1) and len(o['commands'])==(0 if m=='review' else 1 if m=='read_failed' else 2)
 assert len([q for q in o['reads'] if q['operation']=='sim.get'])-o['simReadsBefore']==(0 if m=='review' else 2 if m=='read_failed' else 1)
 if m=='uncertain':assert o['commands'][0]==o['commands'][1] and o['controls']=={'closeDisabled':True,'cancelDisabled':True}
 if m=='read_failed':assert o['controls']=={'closeDisabled':True}
 if m=='denied':assert o['effectsAfterDenied']==0 and o['commands'][0]['input']['command_id']!=o['commands'][1]['input']['command_id']
j['visual_review']={'status':'ACTUALLY_VIEWED','scope':'32frames:24criticaluncertain/readfailed allkind/action/width combinations;denied390/review1440all4contexts. Maskedtypedfixtures,parentblurDOMonly,notfullaccessibility/security/storage acceptance.','frames':[{'path':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in frames]}
j['interaction_observations']=[{'path':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in obs]
j['fixture_snapshot']=[{'path':str(w/n),'sha256':hashlib.sha256((w/n).read_bytes()).hexdigest()} for n in [p+'-causal-test.ts',p+'-refined-test.ts',p+'-fixture-refinement.json']]
j['known_remaining_defects']={'whole_product':'NOT_RECONCILED','security':'W4_PENDING_HIGH5','authority':'NOT_RUN_AUTHDB','privacy':'CONTROLLED_DOM_NOT_MEMORY_ERASURE_ENCRYPTION_STORAGE','release':'NOT_ACCEPTED'}
b=(w/(p+'-browser.txt')).read_bytes();log=b.decode('utf-16') if b.startswith(b'\\xff\\xfe') else b.decode('utf-8-sig');m=re.search(r'(?m)^\\s*237 passed[^\\r\\n]*',log);assert m;j['browser_summary']=m.group().strip();j['next']='Publish90;preserve2007source86/2043source88controllers. Any2091candidateonlyDEFERRED,no fourthwaiteruntilbacklog/coalescingreviewed. Reproduce genuine Cartera long-label defect ifpresent or anothercommercialunit;no fullmodule acceptance.';cp.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\\n',encoding='utf-8')
s=f"""# Identificadores SIM/eSIM: cierre y recuperación de operaciones

CLAIM {j['claim']}. Rama `{j['branch']}`, desde `{j['base']}`. El padre89 era metadata sin pruebas runtime propias;la evidencia de88 no se hereda.

## Reproducción y fixture

El causal original dejó **12FAIL/4PASS en2,9min**:crear/retirar ICCIDfísico yEIDeSIM,en incertidumbre,lectura fallida tras recibo odenegación,mostraba X habilitada o sin efecto tras cancelar. Las cuatro cancelaciones normales pasaban. Se conservan log,exit,banco48 y16observaciones,con errores de página yoperaciones inesperadas vacíos. Los inciertos/lecturas fallidas tenían un comando/un efecto sintético;denegación un comando/cero efectos;revisión cero comandos/efectos.

Se refinó una sola respuesta del fixture:el ICCID101 que sim.get ya proyectaba en la eSIM aparece ahora como compañero deEID en identifier.list,con IDs ordenados y DTO coherente. Es una mejora de coherencia de datos,no un fallo de aserción ocausa de los12fallos de UI. Producto intacto en la comprobación complementaria eSIMcrear:uncierto1FAIL/revisión1PASS en23,4s. Se conserva el banco original yel refinado;las guardias reconstruyen el primero ycomprueban que no se relajaron aserciones.

## Cambio y controles propios

El panel consume closeBlocked existente en closeDisabled y la guardia del callback. Se conserva el vaciado de raw al salir cuando está permitido. No se cambia hook,Drawer,ConfirmDialog,locked,contratos,servicios,backend,SQL oautorización. La reversión exacta del único fragmento devuelve el padre.

**{j['browser_summary']} propios:**48casos pertinentes (crear/retirar×ICCIDfísico/EIDeSIM×incertidumbre/lectura fallida/revisión/denegación×390/768/1440) y189regresiones. Es una ejecución fresca de este candidato;no hereda189de88 o metadata89.

Incertidumbre conserva y reintenta la misma orden,con un efecto sintético. Recibo confirmado con503 reintenta solo sim.get:un comando,dos lecturas posteriores. Denegación permite salir,reabrir vacío yexige nueva confirmación con nuevo command_id,cero efectos antes yuno después. Retirar conserva el identificador yexpected_version1;el recibo2 respeta el parser. Se vuelve a consultar la lista enmascarada,que muestra el identificador retirado y no ofrece retirarlo otra vez. Cancelar revisión no escribe. Al salir,no queda el valor completo en texto oinputs renderizados. Esto no prueba idempotencia/CAS/commitSQL real,borrado de memoria,cifrado oalmacenamiento protegido. Todos los identificadores son sintéticos.

Build66,lint,scan,diff,cola ybundle propios antes de publicar. Funcionales:NOT_RUN_EXISTING_CONTROL_POLICY_CONSUMPTION.

## Visual parcial y límites

32capturas realmente vistas:24recuperaciones críticas (incertidumbre/lectura fallida,todas las combinaciones de tipo/acción/3anchos),cuatro denegaciones390 ycuatro revisiones1440. Los paneles bajo la confirmación se verifican también por DOM. Máscaras,filas,cantidades yfechas son declaradas. Tras reabrir,el tipo del formulario vuelve a su valor inicial;las filas conservan el EID/ICCID yestado comprobados. No se acepta toda la accesibilidad,móvil,matriz de roles oprivacidad del módulo.

HTTP/DTO yefectos sintéticos con componentes,repositorio yparsers reales. AuthDB/JWT/RLS/SQL/Nextintegrado/modelo vivo:NOT_RUN;API0. Sin ausencia/quiescencia nativa,reinicio,handler o full23. Los cinco campos no medidos siguen sin medir.

Global1968/source84 cerrado con sus cinco discrepancias de lectura conservadas;2007/source86 activo41016 y2043/source88 waiter93361 mantienen pines y no acreditan90. No crear otrofull solicitado antes de revisar coalescencia/backlog;2091 solo candidatoDEFERRED si se prepara. Matriz342/31PARTIAL/311sinreconciliar/0READY;HIGH5/W4 pendientes,IA writesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9 y evidencias anteriores conservan su alcance. Main,PR38/142/153 yfuentesW3/W4/W5/recurso intactos;consumo principal pendiente de ACK exacto. Continuar defecto comercial reproducido en Cartera uotra unidad útil.

"""
for f in j['visual_review']['frames']:s+='- '+Path(f['path']).name+' — SHA256 '+f['sha256']+'\\n'
(r/'docs/master/W2X_SIM_IDENTIFIER_RECOVERY_CLOSE_20261018.md').write_text(s,encoding='utf-8');print(j['browser_summary'])
''';(w/('record-'+p+'-visual.py')).write_text(s,encoding='utf-8')
