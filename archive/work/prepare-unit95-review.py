from pathlib import Path
import json,subprocess,hashlib
w=Path('work');r=w/'crm-w2x-document-upload-uncertain';p='w2x-customer-services-review'
def read(f):return json.loads(f.read_text(encoding='utf-8-sig'))
def save(f,j):f.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
source=read(w/'w2x-customer-domain-title-wrap-checkpoint.json');assert source['publication']=='PUBLISHED' and source['checks']['browser']=='75_PASS_OWN_SOURCE' and source['checks']['build']=='66_PASS' and source['checks']['scan']=='PASS'
sha=source['sha'];assert sha=='3baf2ebef46e3ea8d48e84078f4841d9048f492a';assert subprocess.check_output(['git','-C',str(r),'rev-parse','HEAD']).decode().strip()==sha
f=r/'docs/master/PRODUCT_RELEASE_REVIEWS.json';j=read(f);assert 'PAR-046' not in j['row_reviews'] and len(j['row_reviews'])==31
save(w/(p+'-reviews-before.json'),j);save(w/(p+'-queue-before.json'),read(r/'docs/master/PRODUCT_RELEASE_QUEUE.json'))
paths=['src/features/customers/CustomerDomainPages.tsx','tests/e2e-preview/customer-domain-title-wrap.spec.ts','tests/e2e-preview/customer-domain-page-focus.spec.ts','tests/e2e-preview/customer-domain-scope.spec.ts','docs/master/W2X_CUSTOMER_DOMAIN_TITLE_WRAP_20261019.md','docs/master/W2X_CUSTOMER_SERVICES_INDIVIDUAL_REVIEW_20261019.md']
j['row_reviews']['PAR-046']={'source_sha':sha,'owner':'W2-X Customer360 services UI; W1 contract/backend; W4 independent security acceptance','priority':'P1','stages':{'IMPLEMENTED':'PARTIAL','PROVEN_BACKEND':'NOT_RECONCILED','CONSUMED_UI':'PARTIAL','BROWSER_ACCEPTED':'PARTIAL','VISUAL_ACCEPTED':'PARTIAL','SECURITY_ACCEPTED':'NOT_RECONCILED'},'permissions':'Controlled owner-context HTTP fixture and403response only;no actualAuth/JWT/RLS/role or tenant isolation acceptance.','mobile':'PARTIAL_CONTROLLED_HTTP_390_768_1440','external_blocked':'BLOCKED','pending':'Browse/pagination/status-filter/scope-retirement/focus/title consumption only. No realAuthDB/RLS/roles,write/create/edit/suspend/end/change-plan operations,full service/customer relation acceptance,all table columns or accessibility/touch sign-off. W4 and release remain unaccepted.','evidence':[{'source_sha':sha,'kind':'SOURCE','scope':'PARTIAL_ROW_CONTROLLED_HTTP','stage':'CONSUMED_UI','positive':'Own75 contains15pertinent cases:9long/ordinary/denied title cases and6scope/pagination/focus cases. Client-specific service.list scope/cursor/status/limit,exactservicehref,operator label,keyboard next/previous and latest collection are consumed through realrepository/parsers with controlledHTTP.60Case/SIM/Contract cases are contextual,not additional service capabilities.','negative':'Same-source403removes rows andrawprivatebody;oldcollection delayed response cannot replace current selection;cursor/status reset on change. Original parent title long390fails/ordinarypasses1FAIL1PASS21.8s retained separately;not a second own94execution. No SQL/current-membership proof.','execution':'3BAF2EB_OWN75_PASS2.1M_BUILD66_LINT_EXIT0_3WARN_SCAN_QUEUE;15PERTINENT60CONTEXT;AUTH_DB_MODEL_NOT_RUN_API0','paths':paths},{'source_sha':sha,'kind':'VISUAL','scope':'PARTIAL_ROW','stage':'VISUAL_ACCEPTED','positive':'Nine actually viewed source94frames:long/ordinary/denied3907681440. Full service title/card at390768,normal fields/operator andsafeerror shown. Exacthashes below in individualreview.','negative':'Desktop1440uses unchanged table with intentionalhorizontal scroll;longtitle may put other columns outside viewport. No allcolumns,otherdomains,commercialshell,roles,a11y or touch acceptance. New reviewmetadataSHA has no runtime execution.','execution':'3BAF2EB_9FRAMES_ACTUALLY_VIEWED_RAW_SHA256_IN_REVIEW_DOC','paths':['docs/master/W2X_CUSTOMER_SERVICES_INDIVIDUAL_REVIEW_20261019.md']}]}
save(f,j)
frames=source['visual_review']['frames'];assert len(frames)==9
for x in frames:assert hashlib.sha256(Path(x['path']).read_bytes()).hexdigest()==x['sha256']
doc='''# W2-X95 — Revisión individual PAR-046 Customer360: Servicios

CLAIM6255954582. Evidencia de fuente `'''+sha+'''`, árbol `'''+source['tree']+'''`, rama94 publicada. Esta revisión no ejecuta runtime ni convierte sus resultados en PASS del SHA de metadata.

Solo PAR-046 pasa de NOT_RECONCILED a PARTIAL. Quedan32 revisiones parciales,310 sin reconciliar,342 requisitos y0READY. Las341 filas y31 revisiones previas mantienen exactamente sus estados y evidencia; no se promocionan otras capacidades, fuentes o release.

## Fuente y alcance individual

75 propios en2,1min,build66,lint exit0 con3avisos preservados,scan/cola/diff/bundle ycuatro handoffs. De esos75,15 son pertinentes:9 de título/denegación3907681440 y6 de paginación/foco/cambio de colección. Los60 de Incidencias/SIM/Contratos son regresiones contextuales, no60 capacidades de Servicios. Banco actual no modificado respecto al causal original1FAIL1PASS21,8s en el padre.

Se comprueban consulta scoped del cliente,limit20/orden/cursor y filtro de estado,botones siguiente/anterior,foco de teclado,retirada de filas/filtro/cursor al cambiar de cliente,descarte de respuesta tardía,denegación HTTP segura,sin lecturas dependientes en403,nombre completo yhref exacto del servicio. Se usan componente/repository/parsers reales yHTTP sintético. No se pulsa el enlace para afirmar navegación integrada a otra página.

No aceptación de AuthDB/JWT/RLS/roles reales,membresía vigente,multiempresa física,altas/edición/suspensión/baja/cambio de tarifa,todas las relaciones,modelo vivo o producción. Un403simulado no demuestra seguridad de servidor. Sin reinicio,ausencia,quiescencia,handler o full23. API0,IA comercial writesOFF,cincosHIGH/W4 pendientes,issue10OPEN,releaseNOT_ACCEPTED. F736/B9 yfallos originales siguen con su alcance ycausa conocidos/desconocidos.

## Revisión visual propia ya realizada

Nueve imágenes de fuente94 realmente vistas:tarjetas390/768 ytabla1440,largo/ordinario/denegado. En escritorio el título largo conserva tabla con scroll horizontal intencional;otros campos pueden quedar fuera del cuadro. No se aceptan todas las columnas,dominios,roles,accesibilidad,táctil ni pantalla comercial completa. Los hashes siguientes identifican las imágenes originales; no son imágenes de este SHA de metadata.

| Imagen original | SHA256 de bytes |
| --- | --- |
'''
for x in frames:doc+='| '+Path(x['path']).name+' | `'+x['sha256']+'` |\n'
(r/'docs/master/W2X_CUSTOMER_SERVICES_INDIVIDUAL_REVIEW_20261019.md').write_text(doc,encoding='utf-8')
save(w/(p+'-checkpoint.json'),{'unit':95,'claim':6255954582,'branch':'codex/w2x-customer-services-review-20261019','base':sha,'status':'METADATA_REVIEW_PREPARED','publication':'IN_PROGRESS','product_changed':False,'release':'NOT_ACCEPTED','checks':{'runtime':'NOT_RUN_METADATA_SHA','auth_db':'NOT_RUN','model':'NOT_RUN','paid_api':0,'global':'NOT_RUN_METADATA_SHA'},'matrix':{'total':342,'reviewed_partial':32,'unreconciled':310,'release_ready':0},'source_evidence':{'sha':sha,'tree':source['tree'],'own75':'PASS_SOURCE94_ONLY','pertinent':15,'context':60,'viewed_frames':9},'next':'Finish metadata guards/push/handoffs/checkpoint,then next independent useful commercial unit. Preserve2043/2109FIFO.'})
