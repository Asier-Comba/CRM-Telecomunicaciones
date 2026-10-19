from pathlib import Path
import json,hashlib
w=Path('work');r=w/'crm-w2x-document-upload-uncertain';p='w2x-customer-pagination-review'
def read(f):return json.loads(f.read_text(encoding='utf-8-sig'))
def save(f,j):f.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
source=read(w/'w2x-customer-list-page-focus-checkpoint.json');sha=source['sha'];assert sha=='f40091a9f0e03d52ae9792ba002721c1709a0e66' and source['publication']=='PUBLISHED' and source['checks']['browser']=='78_PASS_OWN_SOURCE'
for x in source['observations']:
 cursor=[q for q in x['reads'] if q['operation']=='customer.list' and q['input'].get('after_id')];assert len(cursor)==1 and cursor[0]['input']=={'limit':20,'sort':'id_asc','after_id':'10000000-0000-4000-8000-000000000020'}
 assert x['commands']==[] and x['errors']==[] and x['unexpected']==[]
frames=source['visual_review']['frames'];assert len(frames)==12
for x in frames:assert hashlib.sha256(Path(x['path']).read_bytes()).hexdigest()==x['sha256']
f=r/'docs/master/PRODUCT_RELEASE_REVIEWS.json';j=read(f);assert len(j['row_reviews'])==32 and 'PAR-030' not in j['row_reviews'];save(w/(p+'-reviews-before.json'),j);save(w/(p+'-queue-before.json'),read(r/'docs/master/PRODUCT_RELEASE_QUEUE.json'))
j['row_reviews']['PAR-030']={'source_sha':sha,'owner':'W2-X customer inventory pagination; W1 contract/backend; W4 independent acceptance','priority':'P1','stages':{'IMPLEMENTED':'PARTIAL','PROVEN_BACKEND':'NOT_RECONCILED','CONSUMED_UI':'PARTIAL','BROWSER_ACCEPTED':'PARTIAL','VISUAL_ACCEPTED':'PARTIAL','SECURITY_ACCEPTED':'NOT_RECONCILED'},'permissions':'Controlled owner HTTPfixture and403response only,no actualAuth/JWT/RLS/roles or currentmembership proof.','mobile':'PARTIAL_CONTROLLED_HTTP_390_768_1440','external_blocked':'BLOCKED','pending':'No realAuthDB/RLS/role acceptance,arbitrary multi-page dataset or concurrent insertion/deletion ordering,terminalbutton boundary assertion,all filters/accessibility/touch or independentW4. Fixture20+1is not realcustomer count.','evidence':[{'source_sha':sha,'kind':'SOURCE','scope':'PARTIAL_ROW_CONTROLLED_HTTP','stage':'CONSUMED_UI','positive':'Twelve pertinent browser cases in own78:success,denial,chosenfocus,filter_supersedes3907681440. Validfixture20+1;observednextrequest exactlylimit20/sortid_asc/after_id20. Enter starts nextpage,oldrows retire whileheld,responseorerror gets focus unlessanothercontrolchosen;previousafter403recoverspage1bykeyboard. Filter retires oldfocusintent andlatepage21.66othercases arecontext,notpaginationcapabilities.','negative':'Original2FAIL1PASS49.6s onsameparent:success/denied focusBODY despitevisible result;chosenBUTTONpositive. Same-source403leaves no rows/privatefixturebody;notbackendsecurity proof. No terminalbutton limit orreal dataset acceptance.','execution':'F40091A_OWN78_PASS1.7M_BUILD66_LINT_EXIT0_3WARN_SCAN_QUEUE_PUBLISHED;12PERTINENT66CONTEXT;AUTH_DB_MODEL_NOT_RUN_API0','paths':['src/features/customers/IntegratedCustomers.tsx','src/features/customers/Customers.tsx','tests/e2e-preview/customer-list-page-focus.spec.ts','docs/master/W2X_CUSTOMER_LIST_PAGE_FOCUS_20261019.md']},{'source_sha':sha,'kind':'VISUAL','scope':'PARTIAL_ROW','stage':'VISUAL_ACCEPTED','positive':'Twelve originalsource99frames actuallyviewed,success/denied/chosen/filter_supersedes at3907681440. Result/alert focus outline andchosenbutton are visible;hashes revalidated inreview.','negative':'Screenshotdeniedprecedeskeyboardreturntofirstpage (DOMassertionafterimage). Filter390recordbelowviewportwhilefiltersopen,DOMonly. No allcolumns/fields/roles/a11y/touch or integratedNextnavigation acceptance. Newreviewdoc is metadata carrier,not runtimefile executedin99.','execution':'F40091A_12_FRAMES_ACTUALLY_VIEWED_RAW_SHA256_IN_REVIEW_DOC;METADATA_RUNTIME_NOT_RUN','paths':['docs/master/W2X_CUSTOMER_LIST_PAGE_FOCUS_20261019.md','docs/master/W2X_CUSTOMER_PAGINATION_INDIVIDUAL_REVIEW_20261019.md']} ]}
save(f,j)
doc='''# W2-X100 — Revisión individual PAR-030 Clientes: Paginación

CLAIM6256323517. Evidencia de fuente `'''+sha+'''`, árbol `'''+source['tree']+'''`. Esta metadata no ejecuta runtime ni hereda78 pruebas de99.

Solo PAR030 pasa a PARTIAL. Las341 filas y32 revisiones previas, sus evidencias, metadata global y src/tests permanecen iguales. Matriz342/33PARTIAL/309sinreconciliar/0READY; ninguna aceptación completa o de release.

## Evidencia individual de99

78 casos propios pasaron en1,7min con compilación66, analizador sin errores y tres avisos conservados, scan/cola/bundle/publicación. Doce casos son pertinentes: éxito, denegación, foco elegido y filtro que sustituye página pendiente en390/768/1440. Los66 restantes son contexto.

Los registros originales de esos doce casos verifican una consulta posterior exacta: limit20, sortid_asc y after_id terminado en20. Se usa un fixture válido20+1; no se presenta como recuento real del CRM ni como aceptación individual de todos los registros. Enter activa siguiente, las filas anteriores desaparecen mientras se espera, y el resultado o error recibe foco si el usuario no eligió otro control. Tras denegación se recupera la primera página con teclado. Un filtro vigente descarta el resultado antiguo y su intención de foco. Primarios sin comandos ni errores de página.

El original2FAIL1PASS49,6s conserva BODY en éxito/error y BUTTON elegido como control positivo. HTTP403simulado prueba consumo seguro de la respuesta, no aislamiento físico. No aceptación de AuthDB/JWT/RLS/roles, membresía vigente, orden con cambios concurrentes, dataset arbitrario, límites finales de botones, todos los filtros, accesibilidad completa o táctil. Backend y seguridad siguen NOT_RECONCILED, externalBLOCKED y RELEASE_READY falso.

## Visual propia de99

Doce imágenes originales realmente vistas y hashes revalidados. En error la imagen precede a la recuperación por teclado, que es evidencia DOM posterior. Con filtros abiertos en390, el registro filtrado queda debajo del cuadro y conserva únicamente evidencia DOM. No se aceptan todas las columnas o campos ni navegación Next integrada. El documento nuevo solo indexa las imágenes de99.

| Imagen original | SHA256 de bytes |
| --- | --- |
'''
for x in frames:doc+='| '+Path(x['path']).name+' | `'+x['sha256']+'` |\n'
doc+='''
CincoHIGH y W4 pendientes, IA comercial writesOFF, issue10OPEN, releaseNOT_ACCEPTED; modelo vivoNOT_RUN/API0, sin ausencia/quiescencia/reinicio/handler/full23. F736/B9 y originales conservan su causa y alcance.2109/source92 y2139/source97 mantienen su FIFO y no acreditan esta metadata. Sin cambios a main, ramas principales/ajenas/congeladas, W3/W4/W5, recurso nativo o producción.
'''
(r/'docs/master/W2X_CUSTOMER_PAGINATION_INDIVIDUAL_REVIEW_20261019.md').write_text(doc,encoding='utf-8')
save(w/(p+'-checkpoint.json'),{'unit':100,'claim':6256323517,'branch':'codex/w2x-customer-pagination-review-20261019','base':sha,'status':'METADATA_PAR030_PREPARED','publication':'IN_PROGRESS','product_changed':False,'release':'NOT_ACCEPTED','checks':{'runtime':'NOT_RUN_METADATA_SHA','auth_db':'NOT_RUN','model':'NOT_RUN','paid_api':0,'global':'NOT_RUN_METADATA_SHA'},'matrix':{'total':342,'reviewed_partial':33,'unreconciled':309,'release_ready':0},'source_evidence':{'sha':sha,'tree':source['tree'],'own78':'PASS_SOURCE99_ONLY','pertinent':12,'context':66,'viewed_frames':12},'next':'Finish metadata guard/push/handoff,then next independent useful commercial defect;preserve2109/2139FIFO.'})
s=(w/'checkpoint-w2x-customer-services-review.py').read_text(encoding='utf-8').replace('customer-services-review','customer-pagination-review').replace("'unit':95","'unit':100").replace('6255954582','6256323517').replace('3baf2ebef46e3ea8d48e84078f4841d9048f492a',sha).replace('PUBLISHED_METADATA_PAR046_PARTIAL32','PUBLISHED_METADATA_PAR030_PARTIAL33');(w/'checkpoint-w2x-customer-pagination-review.py').write_text(s,encoding='utf-8')
f=w/'reconcile-w2x-current-continuation.py';s=f.read_text(encoding='utf-8').replace("'customer-list-page-focus']","'customer-list-page-focus','customer-pagination-review']").replace('units49-99','units49-100').replace("'active_unit':99","'active_unit':100");f.write_text(s,encoding='utf-8')
