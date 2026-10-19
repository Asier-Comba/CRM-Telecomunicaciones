from pathlib import Path
import json,subprocess,hashlib,re,sys
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';p='w2x-billing-search-selection';cp=w/(p+'-checkpoint.json')
def read(x):return json.loads(x.read_text(encoding='utf-8-sig'))
def save(x,d):x.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def log(s):
 b=(w/(p+'-'+s+'.txt')).read_bytes();return b.decode('utf-16') if b.startswith((b'\xff\xfe',b'\xfe\xff')) else b.decode('utf-8-sig')
j=read(cp);assert j['unit']==69
if sys.argv[1]!='running':
 assert log('causal-corrected-exit').strip()=='1' and re.search(r'(?m)^\s*2 failed',log('causal-corrected')) and re.search(r'(?m)^\s*1 passed',log('causal-corrected'))
 for s in ['browser','lint','build']:assert log(s+'-exit').strip()=='0',s+'FAILURE_PRESERVED'
 assert re.search(r'(?m)^\s*111 passed ',log('browser')) and '66/66' in log('build')
 def original(path):return subprocess.check_output(['git','-C',str(r),'show',j['base']+':'+path]).decode('utf-8').replace('\r\n','\n')
 path='src/features/billing/IntegratedBilling.tsx';actual=(r/path).read_text(encoding='utf-8');parent=original(path)
 old="const result=await repository.search(query);setCustomers(result.items.filter(i=>i.kind==='customer').map(i=>({id:i.id,name:i.label,status:i.status})))";new="const result=await repository.search(query),items=result.items.filter(i=>i.kind==='customer').map(i=>({id:i.id,name:i.label,status:i.status}));setCustomers(previous=>{const selected=previous.find(c=>c.id===customerId);return selected&&!items.some(item=>item.id===selected.id)?[selected,...items]:items})"
 assert actual.count(new)==1;actual=actual.replace(new,old)
 assert actual.count('<PromptBuilder key={customerId} asOf=')==1;actual=actual.replace('<PromptBuilder key={customerId} asOf=','<PromptBuilder asOf=')
 assert actual==parent,'ONLY_SUCCESSFUL_SEARCH_SELECTION_MERGE_AND_CUSTOMER_KEY_NO_CATCH_PERMISSION_QUERY_CHANGE'
 assert (r/'tests/e2e-preview/billing-search-selection.spec.ts').read_bytes().replace(b'\r\n',b'\n')==(w/(p+'-corrected-causal-test.ts')).read_bytes().replace(b'\r\n',b'\n'),'FINAL_TEST_IDENTICAL_TO_VALID_CAUSAL_FIXTURE_NO_ASSERTION_RELAXATION'
 assert subprocess.check_output(['git','-C',str(r),'diff',j['base'],'--','src/features/billing/Editor.tsx','src/features/billing/parse.ts','src/features/billing/integration.ts','src/features/billing/model.ts','src/lib/server/billing-runtime-v1.ts','src/features/product/integration/repository.ts'])==b'','EDITOR_PARSER_CALCULATION_CONTRACT_VALIDATION_UNCHANGED'
 assert log('functional-exit').strip()=='0' and 'pass 49' in log('functional') and 'fail 0' in log('functional')
 if sys.argv[1]=='preflight':
  assert subprocess.check_output(['git','-C',str(r),'rev-parse','HEAD'],text=True).strip()==j['base']
  paths=['src/features/billing/IntegratedBilling.tsx','tests/e2e-preview/billing-search-selection.spec.ts','docs/master/W2X_BILLING_SEARCH_SELECTION_20261018.md']
  assert {s[3:].replace(chr(92),'/') for s in subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).splitlines()}==set(paths)
  j['candidate_fingerprints']=[{'path':x,'sha256_utf8_lf':hashlib.sha256((r/x).read_bytes().replace(b'\r\n',b'\n')).hexdigest()} for x in paths]
  subprocess.run(['git','-C',str(r),'diff','--check'],check=True)
  scan=subprocess.run([str(w/'tools/gitleaks-8.24.3/bin/gitleaks.exe'),'stdin','--redact','--no-banner'],input=b'\n'.join((r/x).read_bytes() for x in paths),stdout=subprocess.PIPE,stderr=subprocess.STDOUT);(w/(p+'-scan.txt')).write_bytes(scan.stdout);assert scan.returncode==0
  assert j['visual_review']['status']=='ACTUALLY_VIEWED'
  for x in j['visual_review']['frames']:assert hashlib.sha256(Path(x['path']).read_bytes()).hexdigest()==x['sha256']
  j['status']='OWN111_BUILD66_LINT_SCAN_PASS_VISUAL_PARTIAL';j['checks'].update(browser='111_PASS_OWN_SOURCE',build='66_PASS',functional='49_PASS_OWN_SOURCE',lint='EXIT0_WARNINGS_PRESERVED',scan='PASS')
 else:
  pub=read(w/(p+'-publication.json'));assert pub['publication']=='PUBLISHED';j.update(pub);j['status']='PUBLISHED_OWN111_BUILD66_VISUAL_PARTIAL';assert not subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).strip()
 j['evidence']=[{'path':str(w/(p+'-'+s+'.txt')),'sha256':hashlib.sha256((w/(p+'-'+s+'.txt')).read_bytes()).hexdigest()} for s in ['causal','causal-corrected','browser','functional','lint','build','scan']]
save(cp,j)
for name in ['outputs/CRM-recuperacion-inventario.json','work/canonical-next-composition-metadata.json','work/current-authorized-execution-unit.json','work/w2x-current-execution-unit.json']:
 q=w.parent/name;d=read(q);t=d if name.endswith('w2x-current-execution-unit.json') else d.setdefault('w2x_recovery',{});t['active_commercial_unit']=j;save(q,d)
q=w/'w2x-commercial-continuation-orchestration.json';d=read(q);d.setdefault('source69',{}).update(checkpoint=str(cp),status=j['status'],sha=j.get('sha'),publication=j.get('publication'));d['next']=j['next'];save(q,d)
q=w/'w2x-units-index.json';d=read(q);ref='work/'+cp.name
if ref not in d['unit_checkpoints']:d['unit_checkpoints'].append(ref)
for row in d['current_working_checkouts']:
 if row['path'].endswith('crm-w2x-document-upload-uncertain'):row.update(sha=j.get('sha',j['base']),base=j['base'],branch=j['branch'],clean=sys.argv[1]=='published',branch_published=sys.argv[1]=='published',status=j['status'])
if j.get('publication')=='PUBLISHED' and not any(x.get('sha')==j['sha'] for x in d['published_own_sources']):d['published_own_sources'].append({'unit':69,'checkpoint':ref,'branch':j['branch'],'sha':j['sha'],'published':True,'clean_at_publication':True,'release':'NOT_ACCEPTED'})
save(q,d)
print(json.dumps({'status':j['status'],'sha':j.get('sha')}))


