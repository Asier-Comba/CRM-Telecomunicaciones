from pathlib import Path
w=Path('work');p='w2x-customer-communications-scope-review';s=(w/'preflight-unit107.py').read_text(encoding='utf-8').replace('customer-communications-review','customer-communications-scope-review').replace('W2X_CUSTOMER_COMMUNICATIONS_INDIVIDUAL_REVIEW','W2X_CUSTOMER_COMMUNICATIONS_SCOPE_REVIEW').replace('w2x-communications-page-focus-checkpoint.json','w2x-communications-customer-scope-checkpoint.json').replace('21_PASS_OWN_SOURCE','12_NEW_QA_PASS_OWN_SOURCE')
a=s.index("assert set(new['row_reviews'])");b=s.index('before=read(',a)
s=s[:a]+'''assert set(new['row_reviews'])==set(old['row_reviews'])
for key in old:
 if key!='row_reviews':assert new[key]==old[key],key
for key,value in old['row_reviews'].items():
 if key!='PAR-056':assert new['row_reviews'][key]==value,key
 else:
  for field in value:
   if field!='evidence':assert new['row_reviews'][key][field]==value[field],field
  assert new['row_reviews'][key]['evidence'][:len(value['evidence'])]==value['evidence']
  assert len(new['row_reviews'][key]['evidence'])==len(value['evidence'])+2
  assert all(e['source_sha']==j['base'] for e in new['row_reviews'][key]['evidence'][-2:])
'''+s[b:];s=s.replace('METADATA_PAR056_QUALIFIED_PARTIAL34','METADATA_PAR056_SCOPE_QUALIFIED_PARTIAL34').replace('PASS_ONLY_PAR056_341ROWS_33REVIEWS_GLOBAL_SRC_TESTS_UNCHANGED','PASS_ONLY_PAR056_TWO_EVIDENCE_APPEND_PRIOR_FIELDS_341ROWS_33REVIEWS_GLOBAL_SRC_TESTS_UNCHANGED')
(w/'preflight-unit110.py').write_text(s,encoding='utf-8')
s=(w/'close-w2x-customer-communications-review.ps1').read_text(encoding='utf-8-sig').replace('customer-communications-review','customer-communications-scope-review').replace('docs(product): reconcile customer communications evidence individually','docs(product): append scoped customer communications QA evidence')
a=s.index('$body=@"');b=s.index('\nforeach($n in',a)
s=s[:a]+'''$body=@"
HANDOFF W2-X110 — evidencia adicional individual PAR056,de fuente109.

Metadata $sha;árbol $tree;rama $($cp.branch);padre $($cp.base);CLAIM6257032126. Runtime/build/AuthDB/modelo110NOT_RUN,nohereda12 de109. Fuente10988cb515c792b8136d64b97f077cf86d9e2cc5827 conserva12nuevosPASS22,8s,lintdirigido0/0,scan/cola/12capturas/publicación. Build109NOT_RUN_TEST_ONLY_NO_PRODUCTION_CHANGE,nohereda45/build66del108.

Solo dos evidencias anexas aPAR056,cola ydocumento. Fuente principal106,stages,permisos,pending,dos evidencias anteriores yotroscampos idénticos;33otrasrevisiones/341otrasfilas/global/src/tests intactos. Matriz342/34PARTIAL/308sinreconciliar/0READY,sinpromociónniaceptaciónW4.

109:cuatroescenarios×3907681440,A→BconApendiente,cursorreiniciado yBconservadotraslateA;B403no reutilizaA;página global20deotrocliente vacíalocalmente conserva siguiente hastaA21;lector sintético retira panel/enlaces sinnuevalectura. Consultaslimit20/cursor exactas,sin cuerpos/notas/markread/comandos/errores de página/operaciones inesperadas. Producto/fixtures sinmodificar,no defecto encontrado nipruebas verdes anteriores repetidas.

12cuadros109vistos/hashrevalidados. Identidadhref21/22,retiroduranteespera yvacío inicialDOM,fotosfinalesB/denegación/página2/restringido. Late bodyfinished+dosanimationframes esventanaUIacotada,no ausencia/quiescencia/reinicio/handler/full23. No cambio realdeempresa/tenant/AuthDB/JWT/RLS/membresía física/rolescompletos/Nextintegrado/a11y/táctil/W4. Lector escontextoUI,no aprobaciónbackend. Modelo vivoNOT_RUN/API0.

F736/B9 yoriginales intactos,FIFO2139/2172/2214 conserva fuentes/sesiones,noincluye108/109/110. HIGH5/W4pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. Principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos;consumo principalrequiereACKexacto. Guardias/diff/cola/scan/bundleverificados;seguirdefecto comercialreproducido ycheckpoint.
"@'''+s[b:];(w/('close-'+p+'.ps1')).write_text(s,encoding='utf-8-sig')
