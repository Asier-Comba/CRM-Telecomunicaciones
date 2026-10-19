from pathlib import Path
w=Path('work');old='w2x-portability-recovery-close';p='w2x-portfolio-result-label-wrap'
s=(w/('close-'+old+'.ps1')).read_text(encoding='utf-8-sig').replace(old,p).replace('session=8017','session=53509').replace('fix(portabilities): align panel close with reviewed command recovery','fix(portfolio): keep full result labels within their cards')
a=s.index('$body=');b=s.index('foreach($n',a)
s=s[:a]+'''$body='HANDOFF W2-X91 — Cartera: nombre completo dentro de la tarjeta de resultado.'+$nl+'Fuente '+$sha+'; árbol '+$tree+'; rama '+$cp.branch+'; padre '+$cp.base+'; CLAIM '+$cp.claim+'. Propios '+$cp.browser_summary+' (9pertinentes y27regresiones del componente),build66,lint,scan,diff,cola ybundle verificado. Funcionales:NOT_RUN_UI_STYLE_ONLY. No237heredados de90.'+$nl+'Causal1FAIL/1PASS23,1s conservado con log,exit,banco y2observaciones. Etiqueta de servicio160válida para search/get:tarjeta llegaba a1720,14px enviewport390,mientras documentWidth seguía390 porrecorte. La etiqueta ordinaria26 abría/cerraba el editor yconservaba relaciones. No bastaba comprobar el ancho de página;la prueba mide tarjeta y título concretos.'+$nl+'Único fragmento:clases del h2 de resultado para envolver el texto completo yreducir su mínimo. No truncado,caracteres invisibles,nueva pantalla,estado,efecto,primitiva,consulta,referencia oacción. Reversión exacta al padre;aserciones idénticas al causal. Seis geometrías positivas acotadas a390/768/1440. Nombres160/26 completos,Ver activo/Añadir línea presentes;el ordinario conserva nombre del editor ylinks exactos acliente/contrato,sin comando.403controlado no muestra tarjeta,nombre ni cuerpo privado;no aceptación AuthDB.'+$nl+'Nueve capturas vistas:largas/ordinarias con tarjeta completa;en403390 el aviso queda bajo elviewport,se verifica porDOM,768/1440 muestran el estado sin tarjeta. Header/tablas/arnés parcialmente desplazados;inventario vacío eImportJobs403 declarados,no ausenciaSQL ni fallo de este cambio. No título largo del editor seleccionado:fuera de esta unidad ypendiente de reproducción independiente. No matriz completa de activos/roles/accesibilidad oaceptación integral de Cartera.'+$nl+'HTTP/DTO con componentes/repositorio/parsers reales,sin escrituras. AuthDB/JWT/RLS/SQL/Nextintegrado/modelo vivoNOT_RUN/API0;sin ausencia/quiescencia/reinicio/handler/full23. Global2007/source86 activo41016 y2043/source88 waiter93361 conservan pines;no acreditan90/91. No otrofull solicitado hasta coalescer backlog. Matriz342/31PARTIAL/311sinreconciliar/0READY,HIGH5/W4pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9 yfallos anteriores preservados. Main,PR38/142/153 yW3/W4/W5/recurso intactos;consumo principal pendiente de ACK exacto. Continuar defecto del título seleccionado si se reproduce.'

''' +s[b:];(w/('close-'+p+'.ps1')).write_text(s,encoding='utf-8-sig')
s='''from pathlib import Path
import json,hashlib,re
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';p='w2x-portfolio-result-label-wrap';cp=w/(p+'-checkpoint.json');j=json.loads(cp.read_text(encoding='utf-8-sig'))
frames=sorted((w/(p+'-final-results')).rglob('portfolio-result-label-*.png'));assert len(frames)==9
obs=sorted(f.parent/'observations.json' for f in frames);assert len(obs)==9
for f in obs:
 o=json.loads(f.read_text(encoding='utf-8'));assert o['commands']==[] and o['errors']==[]
 if o['mode']!='denied':
  g=o['geometry'];assert g['cardRight']<=o['width']+1 and g['titleRight']<=g['cardRight'] and g['titleScroll']<=g['titleClient']+1 and g['cardScroll']<=g['cardClient']+1
 assert len([q for q in o['calls'] if q['operation']=='global.search'])==1 and len([q for q in o['calls'] if q['operation']=='portfolio.get' and q['input']['kind']=='service'])==(2 if o['mode']=='ordinary' else 1)
j['visual_review']={'status':'ACTUALLY_VIEWED','scope':'9frameslong/ordinary/denied3907681440;full160label/cards/actions visible. Denial390alertbelowviewportDOMonly,7681440visible;harness/header/tablepartlyscrolled. Declaredemptyinventory/ImportJobs403notSQLabsence. LongselectededitortitleNOT_EXERCISED.','frames':[{'path':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in frames]}
j['interaction_observations']=[{'path':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in obs]
j['known_remaining_defects']={'whole_product':'NOT_RECONCILED','selected_long_title':'NOT_EXERCISED_REPRODUCE_INDEPENDENTLY_BEFORE_CHANGE','security':'W4_PENDING_HIGH5','authority':'NOT_RUN_AUTHDB','visual':'DENIAL390_ALERT_DOM_ONLY','release':'NOT_ACCEPTED'}
b=(w/(p+'-browser.txt')).read_bytes();log=b.decode('utf-16') if b.startswith(b'\\xff\\xfe') else b.decode('utf-8-sig');m=re.search(r'(?m)^\\s*36 passed[^\\r\\n]*',log);assert m;j['browser_summary']=m.group().strip();j['next']='Publish91;preserve2007source86/2043source88controllers. Coalesce90/91withnextreproducedselectedtitleunitbeforeanotherfull. Reproduce longselectedDrawer titlebeforechanging existingprimitive styling;no rebuild or hypotheticalfix.';cp.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\\n',encoding='utf-8')
s=f"""# Cartera: nombre completo dentro de la tarjeta de resultado

CLAIM {j['claim']}. Rama `{j['branch']}`, desde `{j['base']}`.

El causal dejó **1FAIL/1PASS en23,1s**,con log,exit,banco ydos observaciones conservados. Una etiqueta de servicio de160caracteres,aceptada por los parsers reales de search/get,expandía la tarjeta hasta1720,14px en una pantalla390. documentWidth seguía390 porrecorte;comprobar solo la página habría ocultado el fallo. La etiqueta ordinaria26pasaba,abría/cerraba el editor ymostraba los vínculos autorizados.

Se cambia un único fragmento de clases del h2 de resultado para reducir su mínimo ypermitir envolver el nombre completo. No se trunca ni se insertan caracteres invisibles. No cambia texto,estado,efecto,primitiva,consulta,referencia oacción. La reversión exacta devuelve el padre yel banco final es idéntico al causal.

**{j['browser_summary']} propios:**9casos pertinentes y27regresiones de búsqueda parcial,selección,cierre ysecuenciación del mismo componente. Seis geometrías positivas a390/768/1440 mantienen tarjeta,título ytexto completo dentro de sus límites. Ver activo/Añadir línea permanecen;el ordinario abre y cierra el servicio,conserva su nombre ylinks exactos acliente/contrato. No se envía ningún comando. Un global.search por caso yuna lectura del servicio;el ordinario añade la lectura al abrir.403controlado no muestra tarjeta,nombre ocuerpo privado. Esto no es aceptación de autoridad real.

## Visual parcial

Nueve capturas vistas:etiqueta larga,ordinaria ydenegación en los tres anchos. Las tarjetas positivas muestran texto completo yacciones. El aviso de denegación390 queda por debajo del viewport yse comprueba porDOM;768/1440 muestran el estado sin tarjeta. Header,tabla yarnés aparecen parcialmente desplazados. El inventario vacío yImportJobs403 son respuestas declaradas,no ausenciaSQL ni fallo causado por esta clase. No se invocan Añadir línea,edición,importación ocomandos;Ver activo ordinario sí conserva nombre yrelaciones porDOM.

El título largo del editor seleccionado no se ejercita en esta unidad. No se acepta toda Cartera,los otros tipos de activo,roles,accesibilidad oseguridad. La siguiente unidad debe reproducir ese título antes de cambiarlo.

Build66,lint,scan,diff,cola ybundle propios antes de publicar. Funcionales:NOT_RUN_UI_STYLE_ONLY. Los237de90 se conservan solo en8063ade,no se heredan aeste SHA. HTTP/DTO/componentes/repositorio/parsers reales,sin escrituras. AuthDB/JWT/RLS/SQL/Nextintegrado/modelo vivo:NOT_RUN;API0. Sin ausencia/quiescencia nativa,reinicio,handler o full23. Cinco campos no medidos permanecen sin medir.

Global2007/source86 activo41016 y2043/source88 waiter93361 conservan pines y no acreditan90/91. Coalescer los cambios90/91con la siguiente unidad reproducida antes de otrofull solicitado. Matriz342/31PARTIAL/311sinreconciliar/0READY,HIGH5/W4pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9 y evidencias anteriores mantienen su alcance. Main,PR38/142/153 yW3/W4/W5/recurso intactos;consumo principal pendiente de ACK exacto.

"""
for f in j['visual_review']['frames']:s+='- '+Path(f['path']).name+' — SHA256 '+f['sha256']+'\\n'
(r/'docs/master/W2X_PORTFOLIO_RESULT_LABEL_WRAP_20261018.md').write_text(s,encoding='utf-8');print(j['browser_summary'])
''';(w/('record-'+p+'-visual.py')).write_text(s,encoding='utf-8')
f=w/('checkpoint-'+p+'.py');s=f.read_text(encoding='utf-8-sig').replace('ONLY_EXISTING_CLOSE_POLICY_CONSUMPTION','ONLY_RESULT_LABEL_CLASSES_DATA_ACTIONS_UNCHANGED');f.write_text(s,encoding='utf-8')
