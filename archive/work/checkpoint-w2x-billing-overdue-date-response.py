from pathlib import Path
import json,subprocess,hashlib,re,sys
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';p='w2x-billing-overdue-date-response';cp=w/(p+'-checkpoint.json')
def read(x):return json.loads(x.read_text(encoding='utf-8-sig'))
def save(x,d):x.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def log(s):
 b=(w/(p+'-'+s+'.txt')).read_bytes();return b.decode('utf-16') if b.startswith((b'\xff\xfe',b'\xfe\xff')) else b.decode('utf-8-sig')
j=read(cp);assert j['unit']==78
paths=['src/lib/server/billing-query-runtime-v1.ts','tests/bootstrap/billing-v1.test.mjs','tests/e2e-preview/billing-list-filter-response.spec.ts','tests/e2e-preview/billing-overdue-date-response.spec.ts','docs/master/W2X_BILLING_OVERDUE_DATE_RESPONSE_20261018.md']
paths.append('tests/bootstrap/billing-artifact-v1.test.mjs')
if sys.argv[1]!='running':
 assert log('causal-exit').strip()=='1' and re.search(r'(?m)^\s*1 failed',log('causal')) and re.search(r'(?m)^\s*1 passed',log('causal'))
 for s in ['browser','functional-recheck','lint','build']:assert log(s+'-exit').strip()=='0',s+'FAILURE_PRESERVED'
 assert log('functional-exit').strip()=='1' and 'pass 50' in log('functional') and 'fail 1' in log('functional')
 assert re.search(r'(?m)^\s*165 passed ',log('browser')) and 'pass 2' in log('functional-recheck') and 'fail 0' in log('functional-recheck') and '66/66' in log('build')
 for f in j['browser_product_after_run_fingerprints']:assert hashlib.sha256((r/f['path']).read_bytes()).hexdigest()==f['sha256']
 def parent(path):return subprocess.check_output(['git','-C',str(r),'show',j['base']+':'+path]).decode('utf-8').replace('\r\n','\n')
 changes=read(w/(p+'-changes.json'))
 for path,key in [(paths[0],'product'),(paths[2],'browser_positive_fixture'),(paths[5],'artifact_positive_fixture')]:
  actual=(r/path).read_text(encoding='utf-8');old,new=changes[key];assert actual.count(new)==1 and actual.replace(new,old)==parent(path),key
 old,new=changes['functional_positive_fixture'];before=parent(paths[1]);assert before.count(old)==1;actual=(r/paths[1]).read_text(encoding='utf-8');before=before.replace(old,new);assert actual.startswith(before);extra=actual[len(before):];assert extra.count('test(')==1 and "test('billing overdue reads require a due date while undated non-overdue invoices remain valid'" in extra,'OLD_FUNCTIONAL_ASSERTIONS_PRESERVED_ONLY_POSITIVE_FIXTURE_DATES_AND_SINGLE_NEW_TEST'
 assert (r/paths[3]).read_bytes().replace(b'\r\n',b'\n')==(w/(p+'-causal-test.ts')).read_bytes().replace(b'\r\n',b'\n'),'FINAL_NEW_BANK_IDENTICAL_TO_CAUSAL'
 assert set(subprocess.check_output(['git','-C',str(r),'diff',j['base'],'--name-only','--','src','tests'],text=True).splitlines())<=set(paths)
 assert subprocess.check_output(['git','-C',str(r),'branch','--show-current'],text=True).strip()==j['branch']
 if sys.argv[1]=='preflight':
  assert subprocess.check_output(['git','-C',str(r),'rev-parse','HEAD'],text=True).strip()==j['base']
  assert {s[3:].replace(chr(92),'/') for s in subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).splitlines()}==set(paths)
  subprocess.run(['git','-C',str(r),'diff','--check'],check=True)
  scan=subprocess.run([str(w/'tools/gitleaks-8.24.3/bin/gitleaks.exe'),'stdin','--redact','--no-banner'],input=b'\n'.join((r/x).read_bytes() for x in paths),stdout=subprocess.PIPE,stderr=subprocess.STDOUT);(w/(p+'-scan.txt')).write_bytes(scan.stdout);assert scan.returncode==0
  assert j['visual_review']['status']=='ACTUALLY_VIEWED'
  for f in j['visual_review']['frames']:assert hashlib.sha256(Path(f['path']).read_bytes()).hexdigest()==f['sha256']
  j['candidate_fingerprints']=[{'path':x,'sha256_utf8_lf':hashlib.sha256((r/x).read_bytes().replace(b'\r\n',b'\n')).hexdigest()} for x in paths]
  j['status']='OWN165_FUNCTIONAL49_PLUS2_COMPLEMENTARY_BUILD66_VISUAL_PARTIAL';j['checks'].update(browser='165_PASS_OWN_SOURCE',functional='49_UNAFFECTED_PASS_PLUS2_RECHECK_PASS_COMPLEMENTARY',build='66_PASS',lint='EXIT0_WARNINGS_PRESERVED',scan='PASS')
 else:
  pub=read(w/(p+'-publication.json'));assert pub['publication']=='PUBLISHED';j.update(pub);j['status']='PUBLISHED_OWN165_FUNCTIONAL49_PLUS2_COMPLEMENTARY_BUILD66_VISUAL_PARTIAL';assert not subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).strip()
  for x in j['candidate_fingerprints']:assert hashlib.sha256((r/x['path']).read_bytes().replace(b'\r\n',b'\n')).hexdigest()==x['sha256_utf8_lf']
 j['evidence']=[{'path':str(w/(p+'-'+s+'.txt')),'sha256':hashlib.sha256((w/(p+'-'+s+'.txt')).read_bytes()).hexdigest()} for s in ['causal','collection','browser','functional','functional-recheck','lint','build','scan']]
 j['compatibility_snapshots']=[{'path':str(w/(p+suffix)),'sha256':hashlib.sha256((w/(p+suffix)).read_bytes()).hexdigest()} for suffix in ['-prior-filter-bank.ts','-prior-functional.mjs','-prior-artifact-fixture.mjs']]
save(cp,j)
for name in ['outputs/CRM-recuperacion-inventario.json','work/canonical-next-composition-metadata.json','work/current-authorized-execution-unit.json','work/w2x-current-execution-unit.json']:
 q=w.parent/name;d=read(q);t=d if name.endswith('w2x-current-execution-unit.json') else d.setdefault('w2x_recovery',{});t['active_commercial_unit']=j;save(q,d)
q=w/'w2x-commercial-continuation-orchestration.json';d=read(q);d.setdefault('source78',{}).update(checkpoint=str(cp),status=j['status'],sha=j.get('sha'),publication=j.get('publication'));d['next']=j['next'];save(q,d)
q=w/'w2x-units-index.json';d=read(q);ref='work/'+cp.name
if ref not in d['unit_checkpoints']:d['unit_checkpoints'].append(ref)
for row in d['current_working_checkouts']:
 if row['path'].endswith('crm-w2x-document-upload-uncertain'):row.update(sha=j.get('sha',j['base']),base=j['base'],branch=j['branch'],clean=sys.argv[1]=='published',branch_published=sys.argv[1]=='published',status=j['status'])
if j.get('publication')=='PUBLISHED' and not any(x.get('sha')==j['sha'] for x in d['published_own_sources']):d['published_own_sources'].append({'unit':78,'checkpoint':ref,'branch':j['branch'],'sha':j['sha'],'published':True,'clean_at_publication':True,'release':'NOT_ACCEPTED'})
save(q,d);print(json.dumps({'status':j['status'],'sha':j.get('sha')}))
