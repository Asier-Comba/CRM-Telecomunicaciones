from pathlib import Path
w=Path('work');r=w/'crm-w2x-document-upload-uncertain';p='w2x-document-destination-read-retirement'
(r/'docs/master/W2X_DOCUMENT_DESTINATION_READ_RETIREMENT_20261019.md').write_text('''# W2-X113: QA de foco y respuesta retirada en destinos de Documentos

Intento original9:6PASS y3FIXTURE_FAIL en3,6min,exit1. Se conservan íntegros salida/banco/directorio,seis observations ytres capturas/errorcontexts. Las tres pruebas customer_supersedes fallaron al buscar botónB ausente:ese modo del fixture retorna antes del navegador de cliente. No llegaron a cambiarpropcliente ni acreditan defecto del producto;no reconstruir observaciones de esa fase ni llamar9PASS.

CLAIM6257170620 ampliado con AMEND_EXISTING_FIXTURE_CUSTOMER_PROBE antes de editar. Se usa mismaentrada/estadoid/servidor customer-resource,sin nuevorecurso/W5/fixturearchivo ni producto. Solo customerProbe=1 añade navegaciónA/B de entrada sintética enmodo customer-document-targets. Sinflagnohay nuevosnodosDOM;otrasramasbyteidénticas yreversiónexactaregistrada. URL del banco cambia solo paracustomer_supersedes,sin quitar aserciones/relajar timeout60000. Src producción idéntico alpadre561488d948730acec047439224897f9a27a7cf10 (runtime111).

Intentocorregido independiente:21PASS39,0s/2archivos,9primarios y12regresiones existentes de seleccióncontrato enmododefault. Nuevaejecución justificada porfixturemodificado,no suma27 nihereda6anteriores. Lintdirigido banco+fixture0errores0avisos;buildNOT_RUN_TEST_FIXTURE_ONLY_SRC_UNCHANGED,nohereda66/24del111. Logs/resultadoscorregidos enotro directorio,originales intactos.

Tres escenarios×3907681440:guardia de foco conserva selector tiposelegidoduranteespera;tipo→Empresaretira selector deregistro/intención;clienteA→B mediantepropcontrolada resetea tipo/target ydocument.listva aB. Trasbodyfinished+dosanimationframes se observaUIactual,no resultadoantiguo/consulta document.list deservicio sinselección. Esa ventana no prueba ausencia/quiescencia/reinicio/handler/full23 niestadointerior de callbacks. Datos/HTTP/contextosintéticos con componentes/repositorios/parsers reales,no tenant/AuthDB/JWT/RLS/membresía/rolesreal/Next/W4.

Nueve cuadros corregidos realmente vistos con hashes. Foco/value/querykeys yrechazoderesultadoantiguoDOM,imágenesfinalesselectoropanelemptycustomer;no unafotoporfase/nitodoslos20destinos/a11y/táctil.12contextualesdefaultPASScurrente,no aceptaciónvisualdetodoslosotrosmodos. Sin command/upload/borrado/privadobody/páginaerrores/operacionesinesperadas enprimarios. Modelo vivoNOT_RUN/API0.

Matriz342/34PARTIAL/308sinreconciliar/0READY intacta;PAR053negativocontrolelegidoNOT_RUN111siguehistóricamenteasí,mediciónnueva113nosehereda. HIGH5/W4pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9 yoriginales conservancausacompletadesconocida. FIFO2172/2214/2256 conserva pinesanteriores,noincluye113/probe. Principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos.
''',encoding='utf-8')
s='''from pathlib import Path
import json,subprocess,hashlib,re
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';p='w2x-document-destination-read-retirement'
def read(f):return json.loads(f.read_text(encoding='utf-8-sig'))
def save(f,j):f.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\\n',encoding='utf-8')
def git(*a):return subprocess.check_output(['git','-C',str(r),*a]).decode('utf-8').strip()
def log(n):
 b=(w/(p+'-'+n+'.txt')).read_bytes();return b.decode('utf-16' if b.startswith((b'\\xff\\xfe',b'\\xfe\\xff')) else 'utf-8-sig')
j=read(w/(p+'-checkpoint.json'));assert git('branch','--show-current')==j['branch'] and git('rev-parse','HEAD')==j['base']
assert log('browser-exit').strip()=='1' and '3 failed' in log('browser') and '6 passed (3.6m)' in log('browser')
for n in ['corrected-browser','corrected-lint','corrected-collection']:assert log(n+'-exit').strip()=='0'
assert '21 passed' in log('corrected-browser') and 'Total: 21 tests in 2 files' in log('corrected-collection')
assert not git('diff','--','src','docs/master/PRODUCT_RELEASE_REVIEWS.json','docs/master/PRODUCT_RELEASE_QUEUE.json')
paths=['tests/e2e-preview/document-destination-read-retirement.spec.ts','tests/e2e-preview/fixtures/customer-resource-entry.tsx','docs/master/W2X_DOCUMENT_DESTINATION_READ_RETIREMENT_20261019.md'];dirty=[x[3:] for x in subprocess.check_output(['git','-C',str(r),'status','--porcelain']).decode('utf-8').splitlines()];assert set(dirty)==set(paths)
assert (r/paths[0]).read_bytes()==(w/(p+'-corrected-bank.ts')).read_bytes();br=read(w/(p+'-bank-reversal.json'));assert (r/paths[0]).read_text(encoding='utf-8').replace(br['after'],br['before'])==(w/(p+'-original-bank.ts')).read_text(encoding='utf-8')==(w/(p+'-new-bank.ts')).read_text(encoding='utf-8')
fr=read(w/(p+'-fixture-reversal.json'));before=(w/(p+'-fixture-before.tsx')).read_text(encoding='utf-8');assert (r/paths[1]).read_text(encoding='utf-8').replace(fr['after'],fr['before'])==before and git('show','HEAD:'+paths[1])==before.strip();assert not git('diff','--check')
original=w/(p+'-results');oldobs=sorted(original.glob('**/observations.json'));oldshots=sorted(original.glob('**/test-failed-1.png'));assert len(oldobs)==6 and len(oldshots)==3
frames=sorted((w/(p+'-corrected-results')).glob('**/document-destination-retirement-*.png'));assert len(frames)==9;obs=[read(f.parent/'observations.json') for f in frames]
for x in obs:assert x['interaction']=='CHOSEN_CONTROL_AND_DESTINATION_CUSTOMER_RETIREMENT_UI_PASS' and x['commands']==[] and x['errors']==[] and x['unexpected']==[] and x['transportComplete'] and x['retiredCase']==(x['mode']!='chosen_control')
scan=subprocess.run([str(w/'tools/gitleaks-8.24.3/bin/gitleaks.exe'),'stdin','--redact','--no-banner'],input=b'\\n'.join((r/x).read_bytes() for x in paths),stdout=subprocess.PIPE,stderr=subprocess.STDOUT);(w/(p+'-scan.txt')).write_bytes(scan.stdout);assert scan.returncode==0
j.update(status='OWN21_CORRECTED_TEST_FIXTURE_VISUAL9_PREFLIGHT_PASS',browser_summary=re.search(r'21 passed[^\\r\\n]*',log('corrected-browser')).group(0),controls_session=20395)
j['corrected_attempt'].update(state='TERMINAL_PASS',browser_exit=0,summary=j['browser_summary'],lint_exit=0,controls_session=20395)
j['checks'].update(browser='21_CORRECTED_QA_PASS_OWN_SOURCE_ORIGINAL9_FIXTURE_FAIL_PRESERVED',lint='PASS_DIRECTED_BANK_AND_EXISTING_FIXTURE_0_ERRORS_0_WARNINGS',scan='PASS',source_fixture_reversal='SRC_UNCHANGED_EXISTING_FIXTURE_OPTIONAL_PROBE_REVERSIBLE_DEFAULT_CONTRACT12_RERUN',build='NOT_RUN_TEST_FIXTURE_ONLY_SRC_UNCHANGED')
j['runtime_input_identity']={'base_sha':j['base'],'src_tree':git('rev-parse','HEAD:src'),'base_fixture_blob':git('rev-parse','HEAD:'+paths[1]),'fixture_delta':'OptionalcustomerProbe=1only;exactreversal+12defaultcontractregressions;notwholefixtureunchanged','scope':'NoSRCproductionchanges/no24or66inheritance'}
j['visual_review']={'status':'ACTUALLY_VIEWED','scope':'9currentcorrectedframes chosen/kind/customer3907681440;probeinputnotproductscreen;key/focus/oldresultDOM;boundedbody+twoframesnotAuthDB/Next/a11y','frames':[{'path':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in frames]};j['observations']=obs
j['original_attempt']['artifact_hashes']=[{'path':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in oldobs+oldshots+[w/(p+'-browser.txt'),w/(p+'-original-bank.ts')]]
j['candidate_fingerprints']=[{'path':x,'sha256_utf8_lf':hashlib.sha256((r/x).read_text(encoding='utf-8').replace('\\r\\n','\\n').encode()).hexdigest()} for x in paths];j['known_remaining_defects']={'whole_product':'NOT_RECONCILED','authority':'NOT_RUN_AUTHDB_RLS_MEMBERSHIP','company_boundary':'NOT_RUN_REAL_PRODUCT_PROVIDER_TENANT','security':'W4_PENDING_HIGH5','release':'NOT_ACCEPTED'}
save(w/(p+'-checkpoint.json'),j);print('OWN21_CORRECTED_QA_ORIGINAL6P3FIXTUREF_PRESERVED_SRC_UNCHANGED_VISUAL9_PASS')
''';(w/'preflight-unit113.py').write_text(s,encoding='utf-8')
s=(w/'close-w2x-communications-customer-scope.ps1').read_text(encoding='utf-8-sig').replace('communications-customer-scope','document-destination-read-retirement').replace('METADATA_PREFLIGHT_DONE_PUBLISH_ONCE','CORRECTED_QA_PREFLIGHT_DONE_ORIGINAL_PRESERVED_PUBLISH_ONCE').replace('test(customers): verify linked conversation scope and retired reads','test(documents): verify destination retirement with optional customer probe')
a=s.index('$body=@"');b=s.index('\nforeach($n in',a)
s=s[:a]+'''$body=@"
HANDOFF W2-X113 — QA de foco/retirada de lectura en destinosDocumentos,con originales conservados.

Fuente $sha;árbol $tree;rama $($cp.branch);padre $($cp.base);CLAIM6257170620ampliadoAMEND_EXISTING_FIXTURE_CUSTOMER_PROBEantesdeeditar. Original9exit1:6PASS3FIXTURE_FAIL3,6min;customer_supersedes3907681440noencuentrannavBpor earlyreturnfixture,antesdecambiarpropcliente. Banco/log/directorio/seisobservations/trescapturas/errorcontexts/lintoriginalconservadoshash;no9PASSoriginal niproductoreproducidoenesa fase.

Intentocorregidopropio $($cp.browser_summary),21/2archivos:9primarios+12contract-selectiondefaultreciénejecutadosporqueelfixturecambió. Nocontar27/noreusar6originales. Lintdirigido banco+fixture0/0,scan,cola,bundleverificado;buildNOT_RUN_TEST_FIXTURE_ONLY_SRC_UNCHANGED,no24/build66heredadosde111.

Solo customerProbe=1añadenavA/Bsobreestadoid/entrada/servidorexistentes,nuevoinputdefixture no nueva pantallaProducto/recursoW5. Sinflagotrosmodosbyteidénticos,reversiónexactay12regresionesdefaultverificadas. BancoURLcambiasoloparacustomer_supersedes,sinasercionesquitadasnirelajar60s. SRCproducciónintacto,ningúnarregloproductoafirmado.

9escenarioscorregidos3907681440:mantenerselectortipoelegidoduranteespera;tipo→Empresaretiraintención/registro;clienteA→Bporpropcontroladareseteatipo/target ydocument.listva aB. TrascuerpoHTTPfinished+dosanimationframes,UIactualsemantiene,sinconsultadocument.listdeserviciosinelegir. Ventanaacotada,nopruebaausencia/quiescencia/reinicio/handler/full23.9cuadroscorregidosvistos/hashregistrados;key/foco/rechazoantiguoDOM,fotosfinales,nitodoslos20destinos/a11y/táctil.

Datos/HTTP/contextosintéticos,componentes/repositorios/parsersreales. NoAuthDB/JWT/RLS/tenant/membresía/identidad/rolesreales/Next/W4. Sincommands/uploads/borrados/privadobody/errores/operacionesinesperadasenprimarios. Modelo vivoNOT_RUN/API0. PAR053negativocontrolelegidoNOT_RUN111permanecehistórico;mediciónnueva113nosehereda.

Matriz342/34PARTIAL/308sinreconciliar/0READY,HIGH5/W4pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9yotrosoriginalesconservancausadesconocida. FIFO2172/2214/2256pinnedfuentesanterioresnoincluye113/probe. Principales/ajenas/congeladas,W3/W4/W5/recurso/producciónintactos;principalrequiereACKexacto. Seguirunidadútiltrascheckpoint.
"@'''+s[b:];(w/('close-'+p+'.ps1')).write_text(s,encoding='utf-8-sig')
