from pathlib import Path
import json,subprocess,hashlib,re,sys
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';p='w2x-billing-list-filter-response';cp=w/(p+'-checkpoint.json')
def read(x):return json.loads(x.read_text(encoding='utf-8-sig'))
def save(x,d):x.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def log(s):
 b=(w/(p+'-'+s+'.txt')).read_bytes();return b.decode('utf-16') if b.startswith((b'\xff\xfe',b'\xfe\xff')) else b.decode('utf-8-sig')
j=read(cp);assert j['unit']==72
paths=['src/lib/server/billing-query-runtime-v1.ts','tests/bootstrap/billing-v1.test.mjs','tests/e2e-preview/billing-list-filter-response.spec.ts','docs/master/W2X_BILLING_LIST_FILTER_RESPONSE_20261018.md']
if sys.argv[1]!='running':
 assert log('causal-exit').strip()=='1' and re.search(r'(?m)^\s*3 failed',log('causal')) and re.search(r'(?m)^\s*1 passed',log('causal'))
 assert log('browser-exit').strip()=='1' and re.search(r'(?m)^\s*3 failed',log('browser')) and re.search(r'(?m)^\s*144 passed ',log('browser')),'ORIGINAL_147_ATTEMPT_PRESERVED'
 for s in ['workspace','functional','lint','build']:assert log(s+'-exit').strip()=='0',s+'FAILURE_PRESERVED'
 assert re.search(r'(?m)^\s*3 passed ',log('workspace')) and 'pass 50' in log('functional') and 'fail 0' in log('functional') and '66/66' in log('build')
 def original(path):return subprocess.check_output(['git','-C',str(r),'show',j['base']+':'+path]).decode('utf-8').replace('\r\n','\n')
 old="for(const row of v.items){if(!invoice(row)||!plain(row)||(row.id as string)<=last)return null;last=row.id as string}"
 new="for(const row of v.items){if(!invoice(row)||!plain(row)||(row.id as string)<=last||'customer_id' in input&&input.customer_id!==undefined&&row.customer_id!==input.customer_id||'status' in input&&input.status!==undefined&&(input.status==='overdue'?row.status!=='issued'||row.overdue!==true:row.status!==input.status))return null;last=row.id as string}"
 actual=(r/paths[0]).read_text(encoding='utf-8');assert actual.count(new)==1 and actual.replace(new,old)==original(paths[0]),'ONLY_EXPLICIT_FILTER_RESPONSE_VALIDATION_NO_SCHEMA_QUERY_PERMISSION_MONEY_CHANGE'
 actual=(r/paths[1]).read_text(encoding='utf-8');parent=original(paths[1]);assert actual.startswith(parent) and actual[len(parent):].count("test('billing list response binds explicit filters")==1 and actual[len(parent):].count('test(')==1,'PREVIOUS_FUNCTIONAL_TESTS_UNCHANGED_SINGLE_NEW_TEST'
 actual=(r/paths[2]).read_text(encoding='utf-8')
 for old,new in read(w/(p+'-workspace-fixture-changes.json')):assert actual.count(new)==1;actual=actual.replace(new,old)
 assert actual==(w/(p+'-causal-test.ts')).read_text(encoding='utf-8'),'ONLY_WORKSPACE_FIXTURE_ENTRY_CORRECTION_NO_NEGATIVE_OR_ASSERTION_RELAXATION'
 changed=set(subprocess.check_output(['git','-C',str(r),'diff',j['base'],'--name-only','--','src','tests'],text=True).splitlines());assert changed<=set(paths)
 if sys.argv[1]=='preflight':
  assert subprocess.check_output(['git','-C',str(r),'rev-parse','HEAD'],text=True).strip()==j['base']
  assert {s[3:].replace(chr(92),'/') for s in subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).splitlines()}==set(paths)
  subprocess.run(['git','-C',str(r),'diff','--check'],check=True)
  scan=subprocess.run([str(w/'tools/gitleaks-8.24.3/bin/gitleaks.exe'),'stdin','--redact','--no-banner'],input=b'\n'.join((r/x).read_bytes() for x in paths),stdout=subprocess.PIPE,stderr=subprocess.STDOUT);(w/(p+'-scan.txt')).write_bytes(scan.stdout);assert scan.returncode==0
  assert j['visual_review']['status']=='ACTUALLY_VIEWED'
  for f in j['visual_review']['frames']:assert hashlib.sha256(Path(f['path']).read_bytes()).hexdigest()==f['sha256']
  j['candidate_fingerprints']=[{'path':x,'sha256_utf8_lf':hashlib.sha256((r/x).read_bytes().replace(b'\r\n',b'\n')).hexdigest()} for x in paths]
  j['status']='OWN144_PLUS3_COMPLEMENT_FUNCTIONAL50_BUILD66_LINT_SCAN_PASS_VISUAL_PARTIAL';j['checks'].update(browser='144_PASS_3_FIXTURE_FAIL_THEN3_PASS_COMPLEMENTARY',functional='50_PASS_OWN_SOURCE',build='66_PASS',lint='EXIT0_WARNINGS_PRESERVED',scan='PASS')
 else:
  pub=read(w/(p+'-publication.json'));assert pub['publication']=='PUBLISHED';j.update(pub);j['status']='PUBLISHED_OWN144_PLUS3_COMPLEMENT_FUNCTIONAL50_BUILD66_VISUAL_PARTIAL';assert not subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).strip()
  for x in j['candidate_fingerprints']:assert hashlib.sha256((r/x['path']).read_bytes().replace(b'\r\n',b'\n')).hexdigest()==x['sha256_utf8_lf']
 j['evidence']=[{'path':str(w/(p+'-'+s+'.txt')),'sha256':hashlib.sha256((w/(p+'-'+s+'.txt')).read_bytes()).hexdigest()} for s in ['causal','collection','browser','workspace','functional','lint','build','scan']]
save(cp,j)
for name in ['outputs/CRM-recuperacion-inventario.json','work/canonical-next-composition-metadata.json','work/current-authorized-execution-unit.json','work/w2x-current-execution-unit.json']:
 q=w.parent/name;d=read(q);t=d if name.endswith('w2x-current-execution-unit.json') else d.setdefault('w2x_recovery',{});t['active_commercial_unit']=j;save(q,d)
q=w/'w2x-commercial-continuation-orchestration.json';d=read(q);d.setdefault('source72',{}).update(checkpoint=str(cp),status=j['status'],sha=j.get('sha'),publication=j.get('publication'));d['next']=j['next'];save(q,d)
q=w/'w2x-units-index.json';d=read(q);ref='work/'+cp.name
if ref not in d['unit_checkpoints']:d['unit_checkpoints'].append(ref)
for row in d['current_working_checkouts']:
 if row['path'].endswith('crm-w2x-document-upload-uncertain'):row.update(sha=j.get('sha',j['base']),base=j['base'],branch=j['branch'],clean=sys.argv[1]=='published',branch_published=sys.argv[1]=='published',status=j['status'])
if j.get('publication')=='PUBLISHED' and not any(x.get('sha')==j['sha'] for x in d['published_own_sources']):d['published_own_sources'].append({'unit':72,'checkpoint':ref,'branch':j['branch'],'sha':j['sha'],'published':True,'clean_at_publication':True,'release':'NOT_ACCEPTED'})
save(q,d);print(json.dumps({'status':j['status'],'sha':j.get('sha')}))
