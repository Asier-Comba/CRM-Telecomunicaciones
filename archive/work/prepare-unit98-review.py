from pathlib import Path
import json,hashlib
w=Path('work');r=w/'crm-w2x-document-upload-uncertain';p='w2x-agenda-presentation-review'
def read(f):return json.loads(f.read_text(encoding='utf-8-sig'))
def save(f,j):f.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
source=read(w/'w2x-calendar-event-title-wrap-checkpoint.json');assert source['publication']=='PUBLISHED' and source['sha']=='93bf52435b1b8e10070880bd2c2109a8d282f170' and source['checks']['browser']=='72_PASS_OWN_SOURCE';sha=source['sha']
f=r/'docs/master/PRODUCT_RELEASE_REVIEWS.json';j=read(f);assert len(j['row_reviews'])==32 and len(j['row_reviews']['PAR-086']['evidence'])==2;save(w/(p+'-reviews-before.json'),j);save(w/(p+'-queue-before.json'),read(r/'docs/master/PRODUCT_RELEASE_QUEUE.json'))
review=j['row_reviews']['PAR-086'];review['evidence'] += [{'source_sha':sha,'kind':'SOURCE','scope':'PARTIAL_ROW_CONTROLLED_PRESENTATION','stage':'CONSUMED_UI','positive':'Nine pertinent cases in own72 source93:6long/ordinary Agenda title cases plus3Agenda/filter-focus cases at3907681440. Complete noncompact event title,upcoming bounds,real localdetail opening/closing;filtertype persistence,date selection andHoy covered by Calendar component.63others are context,not63Agenda capabilities.','negative':'These9use direct Calendar with synthetic in-memory entries andHTTP asset fixture,no repository/parsers/AuthDB or integratedcalendar acceptance. Source93original attempts stay distinct:2route fixture failures,2ambiguous selectors,1real geometry failure+1wrong close-name test;ordinary corrected control1PASS12s on unchanged parent. Not reclassified as1FAIL1PASS.','execution':'93BF524_OWN72_PASS1.8M_BUILD66_LINT0ERRORS3WARN_SCAN_PUBLISHED;9PERTINENT63CONTEXT;AUTH_DB_MODEL_NOT_RUN_API0','paths':['src/features/calendar/Calendar.tsx','tests/e2e-preview/calendar-event-title-wrap.spec.ts','tests/e2e-preview/calendar-agenda-focus.spec.ts','tests/e2e-preview/fixtures/calendar-focus-entry.tsx','docs/master/W2X_CALENDAR_EVENT_TITLE_WRAP_20261019.md']},{'source_sha':sha,'kind':'VISUAL','scope':'PARTIAL_ROW','stage':'VISUAL_ACCEPTED','positive':'Six source93initial Agenda frames actually viewed,long/ordinary3907681440. Complete title wraps within event card;layout andcalendar controls shown. Exact rawimage hashes in newreview carrier.','negative':'Six detail frames of the same bank are context,not sixmoreAgenda views. Upcoming390/1440 partly below viewport,geometryDOMonly. No fullrows/roles/integratedcalendar/a11y/touch/security acceptance. Newreviewdoc is metadata carrier,not a runtime file executed in93.','execution':'93BF524_6_AGENDA_FRAMES_ACTUALLY_VIEWED_ORIGINAL_SHA256;METADATA_RUNTIME_NOT_RUN','paths':['docs/master/W2X_CALENDAR_EVENT_TITLE_WRAP_20261019.md','docs/master/W2X_AGENDA_PRESENTATION_INDIVIDUAL_REVIEW_20261019.md'] }]
save(f,j)
frames=[x for x in source['visual_review']['frames'] if '-detail-' not in Path(x['path']).name];assert len(frames)==6
for x in frames:assert hashlib.sha256(Path(x['path']).read_bytes()).hexdigest()==x['sha256']
doc='''# W2-X98 — Evidencia individual de presentación de Agenda (PAR-086)

CLAIM6256186931. Se añaden dos evidencias con fuente `'''+sha+'''` y árbol `'''+source['tree']+'''`. Se conserva la fuente primaria `282f2e1efb8d38d9d06682060ae80bd2d8042434`, sus dos evidencias, etapas y límites. Las31 otras revisiones y341 filas permanecen iguales; siguen32PARTIAL/310sinreconciliar/342/0READY.

## Evidencia propia de93

72 casos pasaron en1,8min, compilación66, analizador sin errores con tres avisos, scan y publicación propios. Nueve casos son pertinentes: seis títulos largo/ordinario y tres de foco/filtros de Agenda en390/768/1440. Los63 restantes son contexto; no se presentan como capacidades adicionales de Agenda ni se atribuyen al SHA de esta revisión.

Estos nueve montan Calendar directamente, con entradas sintéticas y HTTP para los assets; no atraviesan repository o parsers de calendario. Comprueban título completo en tarjeta, geometría de próximas citas, apertura/cierre local del detalle, filtro por tipo conservado, elección de fecha y Hoy. No navegación Next o calendario integrado, backend, AuthDB, seguridad multiempresa o roles reales aceptados. Los contextuales de la suite conservan solo su alcance.

Las causas originales de93 se mantienen separadas: dos rutas de fixture fallidas, dos selectores ambiguos, un fallo real de geometría y un nombre de cierre incorrecto en test. El control ordinario corregido pasó una vez en12s sobre el padre sin cambiar producto. También se conserva el guard fallido de preflight por recoger observaciones contextuales; su corrección no volvió a ejecutar la suite. No convertir los resultados originales en un1FAIL1PASS ni ocultar fallos de preparación.

## Visual y límites

Seis imágenes iniciales de Agenda realmente vistas en93: largo/ordinario en390/768/1440. Las seis del detalle son contexto. Próximas citas en390/1440 queda parcialmente fuera del primer cuadro, con geometría DOM como evidencia; no aceptación de imagen completa. Esta revisión solo indexa los hashes de los originales y no crea imágenes de su propio SHA.

| Imagen original | SHA256 de bytes |
| --- | --- |
'''
for x in frames:doc+='| '+Path(x['path']).name+' | `'+x['sha256']+'` |\n'
doc+='''
No se modifican etapas ni se promociona BROWSER_ACCEPTED, PROVEN_BACKEND, SECURITY_ACCEPTED o RELEASE_READY. Quedan pendientes la fila completa, calendario integrado, Auth/DB, roles, todos los estados/zonas/paginación, accesibilidad y W4. IA comercial writesOFF, modelo vivoNOT_RUN, API0, cincoHIGH visibles, issue10OPEN, releaseNOT_ACCEPTED; sin ausencia/quiescencia/reinicio/handler/full23. F736/B9 conservan su causa completa desconocida.

Los controles globales2043/source88,2109/source92 y2139/source97 siguen su FIFO y no acreditan esta metadata. No hay cambios de src/tests, datos reales, ramas principales/ajenas/congeladas, W3/W4/W5 o recurso nativo.
'''
(r/'docs/master/W2X_AGENDA_PRESENTATION_INDIVIDUAL_REVIEW_20261019.md').write_text(doc,encoding='utf-8')
save(w/(p+'-checkpoint.json'),{'unit':98,'claim':6256186931,'branch':'codex/w2x-agenda-presentation-review-20261019','base':'8d1f8e6bb73056f8f0dafde1479f63591e165a4b','status':'METADATA_APPEND_PAR086_PREPARED','publication':'IN_PROGRESS','product_changed':False,'release':'NOT_ACCEPTED','checks':{'runtime':'NOT_RUN_METADATA_SHA','auth_db':'NOT_RUN','model':'NOT_RUN','paid_api':0,'global':'NOT_RUN_METADATA_SHA'},'matrix':{'total':342,'reviewed_partial':32,'unreconciled':310,'release_ready':0},'source_evidence':{'sha':sha,'tree':source['tree'],'own72':'PASS_SOURCE93_ONLY','pertinent':9,'context':63,'viewed_frames':6},'next':'Finish append-only evidence guard/push/handoff,then next useful independent commercial unit;preserve2043/2109/2139FIFO.'})
s=(w/'checkpoint-w2x-customer-services-review.py').read_text(encoding='utf-8').replace('customer-services-review','agenda-presentation-review').replace("'unit':95","'unit':98").replace('6255954582','6256186931').replace('3baf2ebef46e3ea8d48e84078f4841d9048f492a','8d1f8e6bb73056f8f0dafde1479f63591e165a4b').replace('PUBLISHED_METADATA_PAR046_PARTIAL32','PUBLISHED_METADATA_PAR086_APPEND_PARTIAL32');(w/'checkpoint-w2x-agenda-presentation-review.py').write_text(s,encoding='utf-8')
f=w/'reconcile-w2x-current-continuation.py';s=f.read_text(encoding='utf-8').replace("'customer-list-filter-priority']","'customer-list-filter-priority','agenda-presentation-review']").replace('units49-97','units49-98').replace("'active_unit':97","'active_unit':98");f.write_text(s,encoding='utf-8')
