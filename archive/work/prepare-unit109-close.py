from pathlib import Path
w=Path('work');r=w/'crm-w2x-document-upload-uncertain'
(r/'docs/master/W2X_COMMUNICATIONS_CUSTOMER_SCOPE_20261019.md').write_text('''# W2-X109: QA de comunicaciones vinculadas al cliente

Banco nuevo12PASS22,8s/1archivo a390/768/1440 sobre runtime idéntico aee157165f1cd4e9fd3d5ad4c72d5f2b9025ef467. No se ha encontrado defecto en estos escenarios ni modificado src/fixtures/contratos. Solo banco ydocumento. Analizador dirigido al banco sin errores/avisos;build NOT_RUN_TEST_ONLY_NO_PRODUCTION_CHANGE. No hereda45/build66 de108 niresultadosglobales;no repite verdes anteriores.

Cuatro escenarios por ancho: cambiar A→B con página antiguaA pendiente reinicia cursor yretira filas;B devuelve403 yno conserva datosA;una página global completa20 de otrocliente aparece localmente vacía pero conserva siguiente ypermite encontrar conversaciónA21;lector sintético retira panel/enlaces sin nueva lectura comercial. En respuesta antigua se observa transporte terminado(body finished) ydos animationframes antes de comprobarUI actual. Ese intervalo no demuestra ausencia/quiescencia/reinicio/handler oestabilidad ilimitada.

Componentes CustomerCommunications, repositorio yparser Inbox reales bajo proveedor de contexto/transporte sintéticos. Consultas exactaslimit20/cursor,filtrado local coherente con la página autorizada. Sin consultas de cuerpos de notas,markread,comandos,errores de página,operaciones inesperadas ocuerpo privado. No se simula cambio de empresa para atribuir defecto:proveedor real remonta su ámbito yel fixture no se usa como prueba de ese mecanismo.

Doce cuadros actuales vistos con hashes encheckpoint. Enlaces21/22 yretiro duranteespera se verificanDOM;capturas finales muestranestado de clienteB,denegación,resultado depágina2 oacceso restringido. Página inicialmente vacía de vinculadas se compruebaDOM antes de la imagen final,no una foto porfase. Son20+1 sintéticos,no recuentos reales ni todos los roles/estados/conversaciones.

Sin AuthDB/JWT/RLS/tenant/membresía/identidad física,navegación Next integrada,a11y/táctil completos oW4 independiente. Lector es estado de contextoUI,sin aprobación de seguridad backend. Modelo vivoNOT_RUN/API0. Matriz342/34PARTIAL/308sinreconciliar/0READY intacta;PAR056 sigue con fuentes anteriores hasta reconciliar esta evidencia aparte. HIGH5/W4 pendientes,IA writesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9 yoriginales intactos;FIFO2139/2172/2214 conserva pines/sesiones yno incluye109. Principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos.
''',encoding='utf-8')
s='''from pathlib import Path
import json,subprocess,hashlib,re
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';p='w2x-communications-customer-scope'
def read(f):return json.loads(f.read_text(encoding='utf-8-sig'))
def save(f,j):f.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\\n',encoding='utf-8')
def git(*a):return subprocess.check_output(['git','-C',str(r),*a]).decode('utf-8').strip()
def log(n):
 b=(w/(p+'-'+n+'.txt')).read_bytes();return b.decode('utf-16' if b.startswith((b'\\xff\\xfe',b'\\xfe\\xff')) else 'utf-8-sig')
j=read(w/(p+'-checkpoint.json'));assert git('branch','--show-current')==j['branch'] and git('rev-parse','HEAD')==j['base']
for n in ['browser','lint','collection']:assert log(n+'-exit').strip()=='0'
assert '12 passed' in log('browser') and 'Total: 12 tests in 1 file' in log('collection')
assert not git('diff','--','src','tests/e2e-preview/fixtures','docs/master/PRODUCT_RELEASE_REVIEWS.json','docs/master/PRODUCT_RELEASE_QUEUE.json')
paths=['tests/e2e-preview/communications-customer-scope.spec.ts','docs/master/W2X_COMMUNICATIONS_CUSTOMER_SCOPE_20261019.md'];dirty=[x[3:] for x in subprocess.check_output(['git','-C',str(r),'status','--porcelain']).decode('utf-8').splitlines()];assert set(dirty)==set(paths)
assert (r/paths[0]).read_bytes()==(w/(p+'-new-bank.ts')).read_bytes() and not git('diff','--check')
frames=sorted((w/(p+'-results')).glob('**/communications-customer-scope-*.png'));assert len(frames)==12;obs=[read(f.parent/'observations.json') for f in frames]
for x in obs:
 assert x['interaction']=='CUSTOMER_FILTER_CURSOR_RESET_AND_RETIRED_READ_UI_PASS' and x['commands']==[] and x['errors']==[] and x['unexpected']==[]
 assert x['lateTransportComplete']==(x['mode'] in ['switch_pending','viewer_retires'])
scan=subprocess.run([str(w/'tools/gitleaks-8.24.3/bin/gitleaks.exe'),'stdin','--redact','--no-banner'],input=b'\\n'.join((r/x).read_bytes() for x in paths),stdout=subprocess.PIPE,stderr=subprocess.STDOUT);(w/(p+'-scan.txt')).write_bytes(scan.stdout);assert scan.returncode==0
j.update(status='OWN12_TEST_ONLY_VISUAL12_PREFLIGHT_PASS',browser_summary=re.search(r'12 passed[^\\r\\n]*',log('browser')).group(0),controls_session=90806)
j['checks'].update(browser='12_NEW_QA_PASS_OWN_SOURCE',lint='PASS_DIRECTED_NEW_BANK_0_ERRORS_0_WARNINGS',scan='PASS',source_fixture_reversal='SRC_AND_EXISTING_FIXTURES_UNCHANGED',build='NOT_RUN_TEST_ONLY_NO_PRODUCTION_CHANGE')
j['runtime_input_identity']={'base_sha':j['base'],'src_tree':git('rev-parse','HEAD:src'),'existing_fixtures_tree':git('rev-parse','HEAD:tests/e2e-preview/fixtures'),'scope':'Unchangedruntime/fixtures proven bydiff+exactdirtyset;no basePASSinheritance'}
j['visual_review']={'status':'ACTUALLY_VIEWED','scope':'12currentframes switch_pending/switch_denied/filtered_empty_page/viewer_retires3907681440;linktargets/earlyempty/retirementDOM;twoframesafterlatebodyboundedonly;notAuthDB/security/Next/a11y','frames':[{'path':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in frames]};j['observations']=obs
j['candidate_fingerprints']=[{'path':x,'sha256_utf8_lf':hashlib.sha256((r/x).read_text(encoding='utf-8').replace('\\r\\n','\\n').encode()).hexdigest()} for x in paths];j['known_remaining_defects']={'whole_product':'NOT_RECONCILED','authority':'NOT_RUN_AUTHDB_RLS_MEMBERSHIP','company_boundary':'NOT_RUN_REAL_PRODUCT_PROVIDER_TENANT','security':'W4_PENDING_HIGH5','release':'NOT_ACCEPTED'}
save(w/(p+'-checkpoint.json'),j);print('OWN12_NEW_QA_SRC_FIXTURES_UNCHANGED_VISUAL12_PASS')
''';(w/'preflight-unit109.py').write_text(s,encoding='utf-8')
s=(w/'close-w2x-customer-communications-review.ps1').read_text(encoding='utf-8-sig').replace('customer-communications-review','communications-customer-scope').replace('docs(product): reconcile customer communications evidence individually','test(customers): verify linked conversation scope and retired reads')
a=s.index('$body=@"');b=s.index('\nforeach($n in',a)
s=s[:a]+'''$body=@"
HANDOFF W2-X109 — QA de filtrado/cambio de cliente/respuesta tardía enComunicaciones.

Fuente $sha; árbol $tree; rama $($cp.branch); padre $($cp.base);CLAIM6256984064. Propios $($cp.browser_summary),12nuevos/1archivo;lint dirigido al banco0errores0avisos,scan,cola ycopia Git verificada. Src/fixtures/reviews/cola intactos con guardias/hash. Solo test ydocumento,no defecto encontrado ni cambio de producto. BuildNOT_RUN_TEST_ONLY_NO_PRODUCTION_CHANGE,nohereda45/build66del108,norepiteverdesanteriores.

Cuatro escenarios×3907681440:A→B con páginaA retenida reinicia cursor/retira filas yconservaBtrasrespuestaA;B403no reutilizaA;página global20deBfiltrada vacíaparaA conserva siguiente yencuentraA21;lector sintético retira panel/enlaces,sin nuevalectura. Dos/tresinbox.list exactaslimit20/cursor,ningún cuerpo denotas/markread/comando/error de página/operación inesperada/cuerpo privado enprimarios.

Respuestas antiguas observadas con bodyfinished ydosanimationframes antes de comprobarUI. Ventana acotada,no ausencia/quiescencia/reinicio/handler/full23 niestabilidad ilimitada.12cuadros actuales realmente vistos/hashregistrados;href21/22,filas retiradas yvacío previoDOM. Imágenes finalesB/denegación/página2/restringido,no una porfase ni20aceptaciones visuales.

CustomerCommunications/repositorio/parser Inbox reales con proveedorcontexto/HTTP sintéticos. Lector es estadodeUI,noAuthDB/JWT/RLS/tenant/membresía física/identidadreal/rolescompletos/Nextintegrado/a11y/táctil/W4. No fabricar causa de cambio de empresa usando providerfixture,ni aprobarseguridad. Modelo vivoNOT_RUN/API0.

Matriz342/34PARTIAL/308sinreconciliar/0READY intacta;PAR056noadopta109porherencia,reconciliaciónindividualsiguienteconSHAexacto. F736/B9 yoriginales intactos;FIFO2139/2172/2214 conserva versiones/sesiones,noincluye109. HIGH5/W4pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. Principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos;principalrequiereACKexacto. Seguirunidadútiltrascheckpoint.
"@'''+s[b:];(w/'close-w2x-communications-customer-scope.ps1').write_text(s,encoding='utf-8-sig')
