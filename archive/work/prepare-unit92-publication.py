from pathlib import Path
w=Path('work');old='w2x-portfolio-result-label-wrap';p='w2x-portfolio-selected-title-wrap'
s=(w/('close-'+old+'.ps1')).read_text(encoding='utf-8-sig').replace(old,p).replace('session=53509','session=50587').replace('fix(portfolio): keep full result labels within their cards','fix(ui): contain drawer titles without shrinking close controls')
a=s.index('$body=');b=s.index('foreach($n',a)
s=s[:a]+'''$body='HANDOFF W2-X92 — Título completo del editor y botón de cierre contenidos.'+$nl+'Fuente '+$sha+'; árbol '+$tree+'; rama '+$cp.branch+'; padre '+$cp.base+'; CLAIM '+$cp.claim+'. Propios '+$cp.browser_summary+' (9pertinentes y273regresiones representativas de Cartera,Contratos,Portabilidades,SIM y número protegido),build66,lint,scan,diff,cola ybundle verificado. Funcionales:NOT_RUN_UI_STYLE_ONLY. No237o36heredados;esta ejecución es nueva por el efecto compartido de CSS.'+$nl+'Causal1FAIL/1PASS21,9s conservado,con log/exit/banco y2observaciones. Tras corregir la tarjeta91,abrir una etiqueta válida160 expandía panel389útiles a1971de contenido;el foco/desplazamiento horizontal dejaba el inicio del título en-1561. Cerrar seguía visible por el foco,pero el título quedaba recortado. Ordinario26 pasaba. Se miden panel,header,título ybotón,nosolo el ancho de página.'+$nl+'Únicamente2atributos de clase en Drawer existente:envolver h2 con mínimo0 yevitar compresión del botón nativo. Negrita,color,texto completo,aria-labelledby,props,eventos,estado,callbacks,disabled ypolíticas de cierre idénticos. No nuevo componente,API,primitiva,lógica,consulta oservicio. Reversión exacta al padre;aserciones intactas. Un guard previo rechazó una suposición de clase font-semibold antes de tocar fuente;se ancló a la tipografía real font-bold/text-slate-900,sin repetir causal. Fallo de preparación separado de la causa del producto.'+$nl+'Seis geometrías positivas a390/768/1440 contienen título completo ybotón dentro del panel,sin scroll horizontal. Nombre del campo ylinks exactos cliente/contrato se conservan;clic real enCerrar devuelve a la misma tarjeta. Un search ydos lecturas de servicio por caso,sin comando.403en segunda lectura mantiene la tarjeta autorizada pero no abre editor nimuestra cuerpo privado. No aceptación de AuthDB/privacidad real.'+$nl+'Nueve capturas realmente vistas:header largo/ordinario yerror seleccionado. Valor completo del input yrelaciones también comprobados porDOM;no formulario/editor entero,otros tipos de activo,matriz de roles,táctil oaccesibilidad completa. HTTP/DTO/componentes/repositorio/parsers reales,sin escrituras;AuthDB/JWT/RLS/SQL/Nextintegrado/modelo vivoNOT_RUN/API0. Sin ausencia/quiescencia/reinicio/handler/full23.'+$nl+'Global2007/source86 activo41016 y2043/source88 waiter93361 mantienen pines yno acreditan90/91/92. Colección coalescida2109/121 verificada (2043+48SIM90+9tarjeta91+9título92);solicitar solo trasfuente92 propia publicada/cualificada y2043terminal/PUBLISHED/PASS. Sin reintentos,retarget o cancelación. Matriz342/31PARTIAL/311sinreconciliar/0READY,HIGH5/W4 pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9 y evidencias anteriores preservadas. Main,PR38/142/153,ramas congeladas yW3/W4/W5/recurso intactos;consumo principal pendiente de ACK exacto. Continuar otra unidad comercial útil.'

''' +s[b:];(w/('close-'+p+'.ps1')).write_text(s,encoding='utf-8-sig')
s='''from pathlib import Path
import json,hashlib,re
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';p='w2x-portfolio-selected-title-wrap';cp=w/(p+'-checkpoint.json');j=json.loads(cp.read_text(encoding='utf-8-sig'))
frames=sorted((w/(p+'-final-results')).rglob('portfolio-selected-title-*.png'));assert len(frames)==9
obs=sorted(f.parent/'observations.json' for f in frames);assert len(obs)==9
for f in obs:
 o=json.loads(f.read_text(encoding='utf-8'));assert o['commands']==[] and o['errors']==[]
 if o['mode']!='denied':
  g=o['geometry'];assert g['titleLeft']>=g['panelLeft']-1 and g['titleRight']<=g['panelRight']+1 and g['closeLeft']>=g['panelLeft']-1 and g['closeRight']<=g['panelRight']+1 and g['closeWidth']>=32 and g['panelScroll']<=g['panelClient']+1 and g['headerScroll']<=g['headerClient']+1 and g['titleScroll']<=g['titleClient']+1
 assert len([q for q in o['calls'] if q['operation']=='global.search'])==1 and len([q for q in o['calls'] if q['operation']=='portfolio.get' and q['input']['kind']=='service'])==2
j['visual_review']={'status':'ACTUALLY_VIEWED','scope':'9framesselectedlong/ordinary/denied3907681440;title/header/nativeclose only,fieldvalueandancestryalsoDOM;notwholeeditor/roles/a11y acceptance.','frames':[{'path':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in frames]}
j['interaction_observations']=[{'path':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in obs]
j['known_remaining_defects']={'whole_product':'NOT_RECONCILED','security':'W4_PENDING_HIGH5','authority':'NOT_RUN_AUTHDB','visual':'HEADER_AND_NATIVE_CLOSE_NOT_ENTIRE_EDITOR_ROLE_TOUCH_A11Y_MATRIX','release':'NOT_ACCEPTED'}
b=(w/(p+'-browser.txt')).read_bytes();log=b.decode('utf-16') if b.startswith(b'\\xff\\xfe') else b.decode('utf-8-sig');m=re.search(r'(?m)^\\s*282 passed[^\\r\\n]*',log);assert m;j['browser_summary']=m.group().strip();j['next']='Publish92;preserve2007source86/2043source88controllers. Requestonecoalesced2109/121fromthisqualifiedsourceonlyafterprior2043terminal/PUBLISHED/PASS. Continue anothercommercialunit or individualevidence review withoutmasspromotion.';cp.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\\n',encoding='utf-8')
s=f"""# Editor de Cartera: título completo y cierre contenidos

CLAIM {j['claim']}. Rama propia `{j['branch']}`, desde `{j['base']}`. Ramas congeladas intactas.

El causal independiente dejó **1FAIL/1PASS en21,9s**,con log,exit,banco ydos observaciones conservados. Tras la tarjeta corregida91,seleccionar una etiqueta válida de160caracteres generaba panel389útiles/1971de contenido. El foco y desplazamiento horizontal dejaban el inicio del título en-1561. El botón de cierre seguía visible por el foco,pero no el título completo. La etiqueta ordinaria26pasaba. La prueba mide panel,header,título ybotón;el ancho de página por sí solo no detectaría el recorte.

Se modifican únicamente dos atributos de clase del Drawer existente:el h2 puede reducir su mínimo y envolver el texto;el botón nativo conserva su ancho. Se mantienen negrita,color,texto completo,aria-labelledby,props,eventos,estado,callbacks,disabled ypolíticas de cierre. No se crea componente,primitiva,API,lógica,consulta oservicio. La reversión exacta devuelve el padre.

El primer guard de edición esperaba una clase font-semibold inexistente yse detuvo antes de escribir:src sin diferencias. Se corrigió el anclaje a la tipografía real font-bold/text-slate-900,conservándola. Se conserva el script original yel fallo de preparación;no se repitió el causal ni se cambió una aserción. No es causa del producto.

**{j['browser_summary']} propios:**9casos pertinentes y273regresiones representativas de Cartera,Contratos,Portabilidades,SIM ynúmero protegido. Se amplía la comprobación por el efecto compartido de CSS;los237/36de otrasfuentes no se heredan.

Seis geometrías positivas a390/768/1440 mantienen título completo ybotón dentro del panel,sin scroll horizontal. Se conserva el nombre del campo ylos links exactos acliente/contrato. El clic real enCerrar vuelve a la misma tarjeta. Cada caso hace un search ydos lecturas del servicio,sin comando.403en segunda lectura deja la tarjeta previamente autorizada pero no abre editor nimuestra cuerpo privado. No es aceptación de permisos reales.

## Visual parcial

Nueve capturas realmente vistas:selección larga,ordinaria ydenegada en los tres anchos. El objetivo es header ybotón de cierre;valor del input yrelaciones se verifican también porDOM. No se acepta todo el formulario,otros tipos de activo,matriz de roles,táctil oaccesibilidad. No se trunca el texto ni se insertan caracteres invisibles. Las respuestas del inventario/ImportJobs y cantidades son declaradas,no medicionesSQL oausencia.

Build66,lint,scan,diff,cola ybundle propios antes de publicar. Funcionales:NOT_RUN_UI_STYLE_ONLY. HTTP/DTO/componentes/repositorio/parsers reales,sin escrituras. AuthDB/JWT/RLS/SQL/Nextintegrado/modelo vivo:NOT_RUN;API0. Sin ausencia/quiescencia nativa,reinicio,handler o full23. Los cinco campos no medidos siguen sin medir.

Global2007/source86 activo41016 y2043/source88 waiter93361 conservan pines yno acreditan90/91/92. Colección coalescida2109/121 real verificada:2043+48SIM90+9tarjeta91+9título92. Solicitar una sola ejecución trasfuente92 publicada/cualificada y2043terminal/PUBLISHED/PASS;sin retarget,cancelación oduplicación. Matriz342/31PARTIAL/311sinreconciliar/0READY,HIGH5/W4 pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9 y evidencias anteriores mantienen su alcance. Main,PR38/142/153,ramas congeladas yW3/W4/W5/recurso intactos;consumo principal pendiente de ACK exacto. Continuar otra unidad comercial útil.

"""
for f in j['visual_review']['frames']:s+='- '+Path(f['path']).name+' — SHA256 '+f['sha256']+'\\n'
(r/'docs/master/W2X_PORTFOLIO_SELECTED_TITLE_WRAP_20261018.md').write_text(s,encoding='utf-8');print(j['browser_summary'])
''';(w/('record-'+p+'-visual.py')).write_text(s,encoding='utf-8')
