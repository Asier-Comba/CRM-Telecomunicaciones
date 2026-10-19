from pathlib import Path
import json,subprocess,hashlib,re,sys
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';p='w2x-billing-proposal-rates';cp=w/(p+'-checkpoint.json')
def read(x):return json.loads(x.read_text(encoding='utf-8-sig'))
def save(x,d):x.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def log(s):
 b=(w/(p+'-'+s+'.txt')).read_bytes();return b.decode('utf-16') if b.startswith((b'\xff\xfe',b'\xfe\xff')) else b.decode('utf-8-sig')
j=read(cp);assert j['unit']==62
if sys.argv[1]!='running':
 assert log('causal-exit').strip()=='1' and re.search(r'(?m)^\s*6 failed',log('causal')) and re.search(r'(?m)^\s*2 passed',log('causal'))
 for s in ['browser','lint','build']:assert log(s+'-exit').strip()=='0',s+'FAILURE_PRESERVED'
 assert re.search(r'(?m)^\s*225 passed ',log('browser')) and '66/66' in log('build')
 def original(path):return subprocess.check_output(['git','-C',str(r),'show',j['base']+':'+path]).decode('utf-8').replace('\r\n','\n')
 path='src/features/billing/parse.ts';actual=(r/path).read_text(encoding='utf-8');parent=original(path)
 def function(x,name,next_name):return x[x.index('function '+name+'('):x.index('function '+next_name+'(',x.index('function '+name+'('))]
 restored=actual
 for name,next_name in [('parseTax','parseNotes'),('parseWithholding','parseDiscount')]:restored=restored.replace(function(actual,name,next_name),function(parent,name,next_name))
 assert restored==parent,'ONLY_TAX_WITHHOLDING_EXTRACTION_DISCOUNT_DATE_AND_OTHER_PARSER_UNCHANGED'
 assert subprocess.check_output(['git','-C',str(r),'diff',j['base'],'--','src/features/billing/Editor.tsx','src/features/billing/integration.ts','src/features/billing/model.ts','src/lib/server/billing-runtime-v1.ts','src/features/product/integration/repository.ts'])==b'','EDITOR_CALCULATION_CONTRACT_AND_VALIDATION_UNCHANGED'
 assert log('functional-exit').strip()=='0' and 'pass 24' in log('functional') and 'fail 0' in log('functional')
 if sys.argv[1]=='preflight':
  assert subprocess.check_output(['git','-C',str(r),'rev-parse','HEAD'],text=True).strip()==j['base']
  paths=['src/features/billing/parse.ts','tests/e2e-preview/billing-proposal-rates.spec.ts','docs/master/W2X_BILLING_PROPOSAL_RATES_20261018.md']
  assert {s[3:].replace(chr(92),'/') for s in subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).splitlines()}==set(paths)
  j['candidate_fingerprints']=[{'path':x,'sha256_utf8_lf':hashlib.sha256((r/x).read_bytes().replace(b'\r\n',b'\n')).hexdigest()} for x in paths]
  subprocess.run(['git','-C',str(r),'diff','--check'],check=True)
  scan=subprocess.run([str(w/'tools/gitleaks-8.24.3/bin/gitleaks.exe'),'stdin','--redact','--no-banner'],input=b'\n'.join((r/x).read_bytes() for x in paths),stdout=subprocess.PIPE,stderr=subprocess.STDOUT);(w/(p+'-scan.txt')).write_bytes(scan.stdout);assert scan.returncode==0
  assert j['visual_review']['status']=='ACTUALLY_VIEWED'
  for x in j['visual_review']['frames']:assert hashlib.sha256(Path(x['path']).read_bytes()).hexdigest()==x['sha256']
  j['status']='OWN225_BUILD66_LINT_SCAN_PASS_VISUAL_PARTIAL';j['checks'].update(browser='225_PASS_OWN_SOURCE',build='66_PASS',functional='24_PASS_OWN_SOURCE',lint='EXIT0_WARNINGS_PRESERVED',scan='PASS')
 else:
  pub=read(w/(p+'-publication.json'));assert pub['publication']=='PUBLISHED';j.update(pub);j['status']='PUBLISHED_OWN225_BUILD66_VISUAL_PARTIAL';assert not subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).strip()
 j['evidence']=[{'path':str(w/(p+'-'+s+'.txt')),'sha256':hashlib.sha256((w/(p+'-'+s+'.txt')).read_bytes()).hexdigest()} for s in ['causal','browser','functional','lint','build','scan']]
save(cp,j)
for name in ['outputs/CRM-recuperacion-inventario.json','work/canonical-next-composition-metadata.json','work/current-authorized-execution-unit.json','work/w2x-current-execution-unit.json']:
 q=w.parent/name;d=read(q);t=d if name.endswith('w2x-current-execution-unit.json') else d.setdefault('w2x_recovery',{});t['active_commercial_unit']=j;save(q,d)
q=w/'w2x-commercial-continuation-orchestration.json';d=read(q);d.setdefault('source62',{}).update(checkpoint=str(cp),status=j['status'],sha=j.get('sha'),publication=j.get('publication'));d['next']=j['next'];save(q,d)
q=w/'w2x-units-index.json';d=read(q);ref='work/'+cp.name
if ref not in d['unit_checkpoints']:d['unit_checkpoints'].append(ref)
for row in d['current_working_checkouts']:
 if row['path'].endswith('crm-w2x-document-upload-uncertain'):row.update(sha=j.get('sha',j['base']),base=j['base'],branch=j['branch'],clean=sys.argv[1]=='published',branch_published=sys.argv[1]=='published',status=j['status'])
if j.get('publication')=='PUBLISHED' and not any(x.get('sha')==j['sha'] for x in d['published_own_sources']):d['published_own_sources'].append({'unit':62,'checkpoint':ref,'branch':j['branch'],'sha':j['sha'],'published':True,'clean_at_publication':True,'release':'NOT_ACCEPTED'})
save(q,d)
print(json.dumps({'status':j['status'],'sha':j.get('sha')}))


