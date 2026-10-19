from pathlib import Path
w=Path('work');p='w2x-customer-communications-review'
s=(w/'preflight-unit100.py').read_text(encoding='utf-8').replace('customer-pagination-review','customer-communications-review').replace('PAR-030','PAR-056').replace('PAR030','PAR056').replace('len(new[\'row_reviews\'])==33','len(new[\'row_reviews\'])==34').replace("'reviewed_partial':33,'unreconciled':309","'reviewed_partial':34,'unreconciled':308").replace('W2X_CUSTOMER_PAGINATION_INDIVIDUAL_REVIEW','W2X_CUSTOMER_COMMUNICATIONS_INDIVIDUAL_REVIEW').replace('w2x-customer-list-page-focus-checkpoint.json','w2x-communications-page-focus-checkpoint.json').replace('78_PASS_OWN_SOURCE','21_PASS_OWN_SOURCE').replace('341ROWS_32REVIEWS','341ROWS_33REVIEWS').replace('342_33PARTIAL_309','342_34PARTIAL_308').replace('PARTIAL33','PARTIAL34').replace("'unchanged_reviews':32","'unchanged_reviews':33").replace("'source99'","'source106'")
(w/'preflight-unit107.py').write_text(s,encoding='utf-8')
s=(w/'close-w2x-customer-pagination-review.ps1').read_text(encoding='utf-8-sig').replace('customer-pagination-review','customer-communications-review').replace('docs(product): reconcile customer pagination evidence individually','docs(product): reconcile customer communications evidence individually')
a=s.index('$body=@"');b=s.index('\nforeach($n in',a)
s=s[:a]+'''$body=@"
HANDOFF W2-X107 — revisión individual PAR056 Customer360:Comunicaciones.

Metadata $sha; árbol $tree; rama $($cp.branch); padre f48425b5d30a071049392486ba669bd23cfa5044;CLAIM6256861171. Runtime/build/AuthDB/modelo de107 NOT_RUN. Evidencia funcional106 conserva21PASS35,2s/build66/lint0errores3avisos/scan/cola/12capturas/publicación;no heredar21 a107.

Solo nueva revisión PAR056,cola derivada ydocumento.33revisiones anteriores/341otrasfilas/metadata global/src/tests intactos. Matriz342/34PARTIAL/308sinreconciliar/0READY. Implementación/consumo/browser/visualPARTIAL;Backend/SecurityNOT_RECONCILED,externalBLOCKED,RELEASE_READYfalse. No promover InboxPAR167/Asistente/otrasfilas niaceptación de release.

12casos pertinentes y9contextuales en106.20+1válido con dosinbox.list exactaslimit20/after_id20;sin cuerpo de notas,markread,comandos,errores de página nioperaciones inesperadas en primarios. Foco de resultado/error ycontrol elegido,registro21enlace/página terminal/vacío/403 a3907681440.12cuadros originales realmente vistos yhashes revalidados.20filas inicialesDOM,no20aceptaciones visuales.9contextos detalle/contexto/resumen no pruebanretiro enComunicaciones.

Original4FAILselector de fixture ycausal-v2 3FAIL1PASS47,5s390 separados. Selector acotado antes de cambiarproducto,sin relajar aserciones. F736/B9 ytodos los originales conservan causa yalcance. Repositorio/parser real con HTTP sintético,no AuthDB/JWT/RLS/tenant/membresía/roles físicos. Pendientesotrasempresas/clientes/no vinculadas/dataset arbitrario/orden concurrente/otrosestados/Nextintegrado/táctil/a11y completos,W4 independiente. No ausencia/quiescencia/reinicio/handler/full23,modelo vivoNOT_RUN/API0.

FIFO2139source97/2172source102/2214source106wait16884 intacto;colección2214realmente verificada,noPASSantes de ejecutarla. Source106mantiene su matriz33,nohereda metadata107. HIGH5/W4 pendientes,IA writesOFF,issue10OPEN,releaseNOT_ACCEPTED. Ramas principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos. Consumo principal requiereACK exacto. Guardias/diff/cola/scan/bundle verificados;seguir otraunidad útil conCLAIM ycheckpoint.
"@'''+s[b:];(w/('close-'+p+'.ps1')).write_text(s,encoding='utf-8-sig')
