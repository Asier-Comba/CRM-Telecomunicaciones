from pathlib import Path
w=Path('work');r=w/'crm-w2x-document-upload-uncertain';p='w2x-communications-page-focus'
(r/'docs/master/W2X_COMMUNICATIONS_PAGE_FOCUS_20261019.md').write_text('''# W2-X106: foco al paginar comunicaciones vinculadas

Sobre producto2560ceb3e4c1ec254eba04671a3d46194e8b30e4, la paginación de comunicaciones internas vinculadas dejaba el foco en BODY tras éxito,403 opágina vacía. Reproducción390px:3FAIL1PASS47,5s;Actualizar elegido durante la espera ya conserva foco. No se afirma reproducción previa768/1440: esos anchos se comprueban en banco final.

El primer intento4FAIL no es reproducción del producto: role=status también encontró dos output auxiliares del fixture. Se conserva íntegro en causal-results,log ybanco original. Se acotó el selector a Consultando conversaciones conservando rol yaserción; causal-v2 usa otra carpeta yproducto idéntico. Banco final igual a v2 yreversible al original cambiando solo ese selector.

CustomerCommunications añade refs nativas de estado/error,una intención de paginación yun efecto que orienta el foco solo cuando sigue en BODY. Los botones anteriores/siguientes marcan intención;Actualizar la retira. Se conservan consultaslimit20/cursor,filtrado local por customer_id,enlaces,roles,reglas de permiso yestado de errores. No se marca como leída la conversación,ni se consultan cuerpos de notas.

El fixture customer-resource existente incorpora solo modo opcional communications con el componente real. Los otros modos se conservan byte a byte tras revertir la importación yternaria. Repositorio yparser Inbox estrictos reales,HTTP sintético.12nuevos casos éxito/denegación/control elegido/vacío×3907681440 y9contextuales de cambio de recurso/cliente en detalle/contexto/resumen:21total/2archivos. Dos inbox.list exactas por primario,sin comandos/cuerpos privados/errores de página/operaciones inesperadas. Compilación66,lint0errores/tres avisos previos,scan,cola y12capturas actuales con hashes en checkpoint.

Las capturas acreditan foco/estado,página terminal yconversación sintética21 cuando procede;no todas las conversaciones/roles,a11y completa,navegación Next integrada omembresía real. AuthDB/JWT/RLS/modelo vivo NOT_RUN/API0. No ausencia/quiescencia/reinicio/handler/full23. No se heredan111 de la fuente previa ni2109 de source92.

Matriz342/33PARTIAL/309sinreconciliar/0READY intacta. HIGH5/W4pendientes,IA writesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9 conservan causa completa desconocida. FIFO2139source97/2172source102 intacto,sin cancelar/duplicar pruebas ni cambiar sus pines. Ramas principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos.
''',encoding='utf-8')
s=(w/'preflight-unit105.py').read_text(encoding='utf-8').replace('domain-retry-focus','communications-page-focus').replace('111 passed','21 passed').replace('111 tests in 10 files','21 tests in 2 files').replace('W2X_DOMAIN_RETRY_FOCUS','W2X_COMMUNICATIONS_PAGE_FOCUS').replace('src/features/customers/CustomerDomainPages.tsx','src/features/customers/CustomerCommunications.tsx').replace("'docs/master/","'tests/e2e-preview/fixtures/customer-resource-entry.tsx','docs/master/",1).replace('domain-retry-focus-*.png','communications-page-focus-*.png').replace('RETRY_OUTCOME_FOCUS_WITH_CHOSEN_CONTROL_PRESERVED','LINKED_CONVERSATION_PAGINATION_FOCUS_AND_CHOSEN_CONTROL').replace('OWN111_BUILD66_VISUAL12','OWN21_BUILD66_VISUAL12').replace('controls_session=84214','controls_session=26832').replace('111_PASS_OWN_SOURCE','21_PASS_OWN_SOURCE')
a=s.index("assert (r/paths[1]).read_bytes()");b=s.index("assert not git('diff'",a)
s=s[:a]+'''assert (r/paths[1]).read_bytes()==(w/(p+'-final-bank.ts')).read_bytes()==(w/(p+'-causal-v2-bank.ts')).read_bytes()
v=read(w/(p+'-bank-selector-reversal.json'));assert (r/paths[1]).read_text(encoding='utf-8').replace(v['after'],v['before'])==(w/(p+'-causal-bank.ts')).read_text(encoding='utf-8')
original=(w/(p+'-fixture-before.tsx')).read_text(encoding='utf-8');fixture=(r/paths[2]).read_text(encoding='utf-8');assert fixture=="import {CustomerCommunications} from '../../../src/features/customers/CustomerCommunications'\\n"+original.replace("kind==='case-create'?","kind==='communications'?<CustomerCommunications customerId={id}/>:kind==='case-create'?")
'''+s[b:]
s=s.replace('12retryoutcome focusframes success/denied/chosen/empty3907681440;focusedfooter may scroll;notallrecords/settleddependentlabels/fields/Nextnavigation/roles/a11yacceptance','12linkedcommunications paginationframes success/denied/chosen/empty3907681440;one syntheticterminalpage/record21;notallconversations/roles/Nextnavigation/a11yacceptance')
(w/'preflight-unit106.py').write_text(s,encoding='utf-8')
s=(w/'close-w2x-domain-retry-focus.ps1').read_text(encoding='utf-8-sig').replace('domain-retry-focus','communications-page-focus').replace('session=84214','session=26832').replace('preflight-unit105.py','preflight-unit106.py').replace('fix(customers): restore retry outcome focus in service collections','fix(customers): preserve pagination focus for linked conversations')
a=s.index('$body=@"');b=s.index('\nforeach($n in',a)
s=s[:a]+'''$body=@"
HANDOFF W2-X106 — foco al paginar comunicaciones internas vinculadas del cliente.

Fuente $sha; árbol $tree; rama $($cp.branch); padre $($cp.base); CLAIM6256801949. Propios $($cp.browser_summary),compilación66,lint0errores/3avisos conservados,scan,cola ycopia Git verificada.12casos nuevos de éxito/403/control elegido/vacío×3907681440 y9contextuales de cambio de cliente/recurso en detalle/contexto/resumen. No se heredan111 del padre niPASSglobal.

Original4FAIL es fallo de selector de fixture:role=status incluye dos outputs auxiliares. Conservados banco/log/directorio originales. Se acota al texto de carga sin quitar rol/aserción. Causal-v2 sobre producto padre sin cambiar:3FAIL1PASS47,5s390;éxito/denegación/vacío dejanBODY,Actualizar elegido ya conserva foco. No causal previa de otros anchos. Final igual a v2 yreversible al original solo por selector.

CustomerCommunications incorpora refs nativas de estado/error,intención de paginación yun efecto que solo orienta si el foco sigueBODY. Actualizar retira intención. Consultaslimit20/cursor,filtrado por cliente,roles/permisos,enlaces yestados intactos. Sin nueva primitiva/servicio/contrato. Fixture customer-resource existente,solo modo opcional communications;otros modos conservados con reversión exacta. No consultar cuerpos de notas ni marcar lecturas comerciales.

Dos inbox.list exactas por primario,20registros iniciales yresultado21/denegado/vacío.12capturas actuales realmente vistas con hashes para foco/estado yregistro terminal cuando procede;no todas las conversaciones/roles/a11y completa niNext integrado. Primarios sin comandos,errores de página,operaciones inesperadas ni cuerpo privado.

Repositorio/parser Inbox real con HTTP sintético. AuthDB/JWT/RLS/membresía física/modelo vivoNOT_RUN/API0;sin ausencia/quiescencia/reinicio/handler/full23. F736/B9 yoriginales intactos. FIFO2139source97ejecución26311/2172source102wait76705 conservado,sin duplicar/cancelar controles.2109source92PASS43,9min no acredita106.

Matriz342/33PARTIAL/309sinreconciliar/0READY intacta,HIGH5/W4pendientes,IA writesOFF,issue10OPEN,releaseNOT_ACCEPTED. Ramas principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos. Consumo principal requiere ACK exacto. Continuar unidad comercial independiente tras checkpoint íntegro.
"@'''+s[b:];(w/'close-w2x-communications-page-focus.ps1').write_text(s,encoding='utf-8-sig')
