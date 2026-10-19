from pathlib import Path
import json,subprocess,hashlib,re
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';p='w2x-communications-customer-scope'
def read(f):return json.loads(f.read_text(encoding='utf-8-sig'))
def save(f,j):f.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def git(*a):return subprocess.check_output(['git','-C',str(r),*a]).decode('utf-8').strip()
def log(n):
 b=(w/(p+'-'+n+'.txt')).read_bytes();return b.decode('utf-16' if b.startswith((b'\xff\xfe',b'\xfe\xff')) else 'utf-8-sig')
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
scan=subprocess.run([str(w/'tools/gitleaks-8.24.3/bin/gitleaks.exe'),'stdin','--redact','--no-banner'],input=b'\n'.join((r/x).read_bytes() for x in paths),stdout=subprocess.PIPE,stderr=subprocess.STDOUT);(w/(p+'-scan.txt')).write_bytes(scan.stdout);assert scan.returncode==0
j.update(status='OWN12_TEST_ONLY_VISUAL12_PREFLIGHT_PASS',browser_summary=re.search(r'12 passed[^\r\n]*',log('browser')).group(0),controls_session=90806)
j['checks'].update(browser='12_NEW_QA_PASS_OWN_SOURCE',lint='PASS_DIRECTED_NEW_BANK_0_ERRORS_0_WARNINGS',scan='PASS',source_fixture_reversal='SRC_AND_EXISTING_FIXTURES_UNCHANGED',build='NOT_RUN_TEST_ONLY_NO_PRODUCTION_CHANGE')
j['runtime_input_identity']={'base_sha':j['base'],'src_tree':git('rev-parse','HEAD:src'),'existing_fixtures_tree':git('rev-parse','HEAD:tests/e2e-preview/fixtures'),'scope':'Unchangedruntime/fixtures proven bydiff+exactdirtyset;no basePASSinheritance'}
j['visual_review']={'status':'ACTUALLY_VIEWED','scope':'12currentframes switch_pending/switch_denied/filtered_empty_page/viewer_retires3907681440;linktargets/earlyempty/retirementDOM;twoframesafterlatebodyboundedonly;notAuthDB/security/Next/a11y','frames':[{'path':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in frames]};j['observations']=obs
j['candidate_fingerprints']=[{'path':x,'sha256_utf8_lf':hashlib.sha256((r/x).read_text(encoding='utf-8').replace('\r\n','\n').encode()).hexdigest()} for x in paths];j['known_remaining_defects']={'whole_product':'NOT_RECONCILED','authority':'NOT_RUN_AUTHDB_RLS_MEMBERSHIP','company_boundary':'NOT_RUN_REAL_PRODUCT_PROVIDER_TENANT','security':'W4_PENDING_HIGH5','release':'NOT_ACCEPTED'}
save(w/(p+'-checkpoint.json'),j);print('OWN12_NEW_QA_SRC_FIXTURES_UNCHANGED_VISUAL12_PASS')
