from pathlib import Path
import json,subprocess,hashlib,re,sys
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';p='w2x-c360-contact-text-wrap';cp=w/(p+'-checkpoint.json')
def read(x):return json.loads(x.read_text(encoding='utf-8-sig'))
def save(x,d):x.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def log(s):
 b=(w/(p+'-'+s+'.txt')).read_bytes();return b.decode('utf-16') if b.startswith((b'\xff\xfe',b'\xfe\xff')) else b.decode('utf-8-sig')
j=read(cp);assert j['unit']==77
paths=['src/features/customers/IntegratedCustomerDetail.tsx','tests/e2e-preview/c360-customer-name-wrap.spec.ts','docs/master/W2X_C360_CONTACT_TEXT_WRAP_20261018.md']
if sys.argv[1]!='running':
 assert log('causal-exit').strip()=='1' and re.search(r'(?m)^\s*1 failed',log('causal')) and re.search(r'(?m)^\s*1 passed',log('causal'))
 for s in ['browser','lint','build']:assert log(s+'-exit').strip()=='0',s+'FAILURE_PRESERVED'
 assert re.search(r'(?m)^\s*86 passed ',log('browser')) and '66/66' in log('build')
 actual=(r/paths[0]).read_text(encoding='utf-8')
 old='<article key={c.id} className="flex flex-wrap items-center justify-between gap-3 border-t py-3"><div><h3';new='<article key={c.id} className="flex flex-wrap items-center justify-between gap-3 border-t py-3"><div className="min-w-0 max-w-full [overflow-wrap:anywhere]"><h3'
 assert actual.count(new)==1;actual=actual.replace(new,old)
 parent=subprocess.check_output(['git','-C',str(r),'show',j['base']+':'+paths[0]]).decode('utf-8').replace('\r\n','\n');assert actual==parent,'ONLY_CONTACT_TEXT_WRAPPING_CLASS_NO_PRIVATE_REVEAL_EDITOR_PERMISSION_QUERY_CHANGE'
 bank=(r/paths[1]).read_text(encoding='utf-8')
 for old,new in read(w/(p+'-bank-expansion.json')):assert bank.count(new)==1;bank=bank.replace(new,old)
 parent=subprocess.check_output(['git','-C',str(r),'show',j['base']+':'+paths[1]]).decode('utf-8').replace('\r\n','\n');assert bank==parent,'EXISTING_HEADER_FACTS_ASSERTIONS_PRESERVED_BY_REVERSIBLE_CONTACTS_EXPANSION'
 assert (r/paths[1]).read_bytes().replace(b'\r\n',b'\n')==(w/(p+'-causal-test.ts')).read_bytes().replace(b'\r\n',b'\n'),'FINAL_BANK_IDENTICAL_TO_CAUSAL_NO_ASSERTION_RELAXATION'
 assert set(subprocess.check_output(['git','-C',str(r),'diff',j['base'],'--name-only','--','src','tests'],text=True).splitlines())<=set(paths),'OTHER_PRODUCT_PARSER_CONTRACT_TESTS_UNCHANGED'
 if sys.argv[1]=='preflight':
  assert subprocess.check_output(['git','-C',str(r),'rev-parse','HEAD'],text=True).strip()==j['base']
  assert {s[3:].replace(chr(92),'/') for s in subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).splitlines()}==set(paths)
  subprocess.run(['git','-C',str(r),'diff','--check'],check=True)
  scan=subprocess.run([str(w/'tools/gitleaks-8.24.3/bin/gitleaks.exe'),'stdin','--redact','--no-banner'],input=b'\n'.join((r/x).read_bytes() for x in paths),stdout=subprocess.PIPE,stderr=subprocess.STDOUT);(w/(p+'-scan.txt')).write_bytes(scan.stdout);assert scan.returncode==0
  assert j['visual_review']['status']=='ACTUALLY_VIEWED'
  for f in j['visual_review']['frames']:assert hashlib.sha256(Path(f['path']).read_bytes()).hexdigest()==f['sha256']
  j['candidate_fingerprints']=[{'path':x,'sha256_utf8_lf':hashlib.sha256((r/x).read_bytes().replace(b'\r\n',b'\n')).hexdigest()} for x in paths]
  j['status']='OWN86_UI_STYLE_ONLY_BUILD66_LINT_SCAN_PASS_VISUAL_PARTIAL';j['checks'].update(browser='86_PASS_OWN_SOURCE',functional='NOT_RUN_UI_STYLE_ONLY',build='66_PASS',lint='EXIT0_WARNINGS_PRESERVED',scan='PASS')
 else:
  pub=read(w/(p+'-publication.json'));assert pub['publication']=='PUBLISHED';j.update(pub);j['status']='PUBLISHED_OWN86_UI_STYLE_ONLY_BUILD66_VISUAL_PARTIAL';assert not subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).strip()
  for x in j['candidate_fingerprints']:assert hashlib.sha256((r/x['path']).read_bytes().replace(b'\r\n',b'\n')).hexdigest()==x['sha256_utf8_lf']
 j['evidence']=[{'path':str(w/(p+'-'+s+'.txt')),'sha256':hashlib.sha256((w/(p+'-'+s+'.txt')).read_bytes()).hexdigest()} for s in ['causal','collection','browser','lint','build','scan']]
save(cp,j)
for name in ['outputs/CRM-recuperacion-inventario.json','work/canonical-next-composition-metadata.json','work/current-authorized-execution-unit.json','work/w2x-current-execution-unit.json']:
 q=w.parent/name;d=read(q);t=d if name.endswith('w2x-current-execution-unit.json') else d.setdefault('w2x_recovery',{});t['active_commercial_unit']=j;save(q,d)
q=w/'w2x-commercial-continuation-orchestration.json';d=read(q);d.setdefault('source77',{}).update(checkpoint=str(cp),status=j['status'],sha=j.get('sha'),publication=j.get('publication'));d['next']=j['next'];save(q,d)
q=w/'w2x-units-index.json';d=read(q);ref='work/'+cp.name
if ref not in d['unit_checkpoints']:d['unit_checkpoints'].append(ref)
for row in d['current_working_checkouts']:
 if row['path'].endswith('crm-w2x-document-upload-uncertain'):row.update(sha=j.get('sha',j['base']),base=j['base'],branch=j['branch'],clean=sys.argv[1]=='published',branch_published=sys.argv[1]=='published',status=j['status'])
if j.get('publication')=='PUBLISHED' and not any(x.get('sha')==j['sha'] for x in d['published_own_sources']):d['published_own_sources'].append({'unit':77,'checkpoint':ref,'branch':j['branch'],'sha':j['sha'],'published':True,'clean_at_publication':True,'release':'NOT_ACCEPTED'})
save(q,d);print(json.dumps({'status':j['status'],'sha':j.get('sha')}))
