from pathlib import Path
import json,subprocess,hashlib,re
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';p='w2x-document-destination-read-retirement'
def read(f):return json.loads(f.read_text(encoding='utf-8-sig'))
def save(f,j):f.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def git(*a):return subprocess.check_output(['git','-C',str(r),*a]).decode('utf-8').strip()
def log(n):
 b=(w/(p+'-'+n+'.txt')).read_bytes();return b.decode('utf-16' if b.startswith((b'\xff\xfe',b'\xfe\xff')) else 'utf-8-sig')
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
scan=subprocess.run([str(w/'tools/gitleaks-8.24.3/bin/gitleaks.exe'),'stdin','--redact','--no-banner'],input=b'\n'.join((r/x).read_bytes() for x in paths),stdout=subprocess.PIPE,stderr=subprocess.STDOUT);(w/(p+'-scan.txt')).write_bytes(scan.stdout);assert scan.returncode==0
j.update(status='OWN21_CORRECTED_TEST_FIXTURE_VISUAL9_PREFLIGHT_PASS',browser_summary=re.search(r'21 passed[^\r\n]*',log('corrected-browser')).group(0),controls_session=20395)
j['corrected_attempt'].update(state='TERMINAL_PASS',browser_exit=0,summary=j['browser_summary'],lint_exit=0,controls_session=20395)
j['checks'].update(browser='21_CORRECTED_QA_PASS_OWN_SOURCE_ORIGINAL9_FIXTURE_FAIL_PRESERVED',lint='PASS_DIRECTED_BANK_AND_EXISTING_FIXTURE_0_ERRORS_0_WARNINGS',scan='PASS',source_fixture_reversal='SRC_UNCHANGED_EXISTING_FIXTURE_OPTIONAL_PROBE_REVERSIBLE_DEFAULT_CONTRACT12_RERUN',build='NOT_RUN_TEST_FIXTURE_ONLY_SRC_UNCHANGED')
j['runtime_input_identity']={'base_sha':j['base'],'src_tree':git('rev-parse','HEAD:src'),'base_fixture_blob':git('rev-parse','HEAD:'+paths[1]),'fixture_delta':'OptionalcustomerProbe=1only;exactreversal+12defaultcontractregressions;notwholefixtureunchanged','scope':'NoSRCproductionchanges/no24or66inheritance'}
j['visual_review']={'status':'ACTUALLY_VIEWED','scope':'9currentcorrectedframes chosen/kind/customer3907681440;probeinputnotproductscreen;key/focus/oldresultDOM;boundedbody+twoframesnotAuthDB/Next/a11y','frames':[{'path':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in frames]};j['observations']=obs
j['original_attempt']['artifact_hashes']=[{'path':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in oldobs+oldshots+[w/(p+'-browser.txt'),w/(p+'-original-bank.ts')]]
j['candidate_fingerprints']=[{'path':x,'sha256_utf8_lf':hashlib.sha256((r/x).read_text(encoding='utf-8').replace('\r\n','\n').encode()).hexdigest()} for x in paths];j['known_remaining_defects']={'whole_product':'NOT_RECONCILED','authority':'NOT_RUN_AUTHDB_RLS_MEMBERSHIP','company_boundary':'NOT_RUN_REAL_PRODUCT_PROVIDER_TENANT','security':'W4_PENDING_HIGH5','release':'NOT_ACCEPTED'}
save(w/(p+'-checkpoint.json'),j);print('OWN21_CORRECTED_QA_ORIGINAL6P3FIXTUREF_PRESERVED_SRC_UNCHANGED_VISUAL9_PASS')
