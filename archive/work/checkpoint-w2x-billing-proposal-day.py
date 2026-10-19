from pathlib import Path
import json,hashlib,subprocess,re,sys
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';prefix='w2x-billing-proposal-day';cp=w/(prefix+'-checkpoint.json')
def save(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def log(s):
 b=(w/(prefix+'-'+s+'.txt')).read_bytes();return b.decode('utf-16') if b.startswith((b'\xff\xfe',b'\xfe\xff')) else b.decode('utf-8-sig')
j=json.loads(cp.read_text(encoding='utf-8-sig')) if cp.exists() else {'unit':48,'claim':6214415919,'base':'5dd9be771a5dde8305286c50567521ecb5c94356','branch':'codex/w2x-billing-proposal-day-20261016','status':'OWN45_CONTROLS_RUNNING','controls_session':32270,'product_changed':True,'release':'NOT_ACCEPTED','checks':{'auth_db':'NOT_RUN','model':'NOT_RUN','paid_api':0,'global':'NOT_RUN_CURRENT_SHA'},'original':{'failed':1,'passed':1,'duration':'17.2s','cause':'Parent rendered asOf date captured before Madrid midnight;child text edit does not refresh parent prop. Proposal still uses previous day. Current-time positive passes.'},'harness_failure':str(w/(prefix+'-harness-failure.json')),'next':'Finish own45/build/lint/visual/scan/publication;then independent commercial work with fresh CLAIM;no inherited1362.'}
if sys.argv[1]!='running':
 for s in ['browser','lint','build']:assert log(s+'-exit').strip()=='0',s+' FAILURE_PRESERVED'
 assert re.search(r'(?m)^\s*45 passed ',log('browser')) and '66/66' in log('build')
 assert log('causal-exit').strip()=='1' and re.search(r'(?m)^\s*1 failed',log('causal')) and re.search(r'(?m)^\s*1 passed',log('causal'))
 def original(p):return subprocess.check_output(['git','-C',str(r),'show',j['base']+':'+p]).decode('utf-8').replace('\r\n','\n')
 p='src/features/billing/PromptBuilder.tsx';s=(r/p).read_text(encoding='utf-8');assert s.replace('asOf?:string|(()=>string)','asOf?:string').replace("parseInvoiceText(text, customers,typeof asOf==='function'?asOf():asOf)",'parseInvoiceText(text, customers,asOf)')==original(p),'PROMPT_DATE_ONLY_STRING_COMPATIBLE'
 p='src/features/billing/IntegratedBilling.tsx';assert (r/p).read_text(encoding='utf-8').replace('asOf={()=>calendarDate(new Date().toISOString())}','asOf={calendarDate(new Date().toISOString())}')==original(p),'INTEGRATED_DATE_ONLY'
 if sys.argv[1]=='preflight':
  assert subprocess.check_output(['git','-C',str(r),'rev-parse','HEAD'],text=True).strip()==j['base']
  paths=['src/features/billing/PromptBuilder.tsx','src/features/billing/IntegratedBilling.tsx','tests/e2e-preview/billing-proposal-day.spec.ts','docs/master/W2X_BILLING_PROPOSAL_DAY_20261016.md']
  assert {s[3:].replace(chr(92),'/') for s in subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).splitlines()}==set(paths)
  j['candidate_fingerprints']=[{'path':p,'sha256_utf8_lf':hashlib.sha256((r/p).read_bytes().replace(b'\r\n',b'\n')).hexdigest()} for p in paths]
  subprocess.run(['git','-C',str(r),'diff','--check'],check=True)
  scan=subprocess.run([str(w/'tools/gitleaks-8.24.3/bin/gitleaks.exe'),'stdin','--redact','--no-banner'],input=b'\n'.join((r/p).read_bytes() for p in paths),stdout=subprocess.PIPE,stderr=subprocess.STDOUT);(w/(prefix+'-scan.txt')).write_bytes(scan.stdout);assert scan.returncode==0
  assert j['visual_review']['status']=='ACTUALLY_VIEWED'
  for x in j['visual_review']['frames']:assert hashlib.sha256(Path(x['path']).read_bytes()).hexdigest()==x['sha256']
  j['status']='OWN45_BUILD66_LINT_SCAN_PASS_VISUAL_PARTIAL'
 else:
  pub=json.loads((w/(prefix+'-publication.json')).read_text(encoding='utf-8-sig'));assert pub['publication']=='PUBLISHED';j.update(pub);j['status']='PUBLISHED_OWN45_BUILD66_VISUAL_PARTIAL';assert not subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).strip()
 j['checks'].update(browser='45_PASS_OWN_SOURCE',build='66_PASS',lint='EXIT0_WARNINGS_PRESERVED',scan='PASS')
 j['evidence']=[{'path':str(w/(prefix+'-'+s+'.txt')),'sha256':hashlib.sha256((w/(prefix+'-'+s+'.txt')).read_bytes()).hexdigest()} for s in ['causal','browser','lint','build','scan']]
save(cp,j)
for name in ['outputs/CRM-recuperacion-inventario.json','work/canonical-next-composition-metadata.json','work/current-authorized-execution-unit.json','work/w2x-current-execution-unit.json']:
 p=w.parent/name;d=json.loads(p.read_text(encoding='utf-8-sig'));t=d if name.endswith('w2x-current-execution-unit.json') else d.setdefault('w2x_recovery',{});t['active_commercial_unit']=j;save(p,d)
p=w/'w2x-commercial-continuation-orchestration.json';d=json.loads(p.read_text(encoding='utf-8-sig'));d.setdefault('source48',{}).update(status=j['status'],sha=j.get('sha'),publication=j.get('publication'));d['next']=j['next'];save(p,d)
p=w/'w2x-units-index.json';d=json.loads(p.read_text(encoding='utf-8-sig'));link='work/'+cp.name
if link not in d['unit_checkpoints']:d['unit_checkpoints'].append(link)
for row in d['current_working_checkouts']:
 if row['path'].endswith('crm-w2x-document-upload-uncertain'):row.update(sha=j.get('sha',j['base']),base=j['base'],branch=j['branch'],clean=sys.argv[1]=='published',branch_published=sys.argv[1]=='published',status=j['status'])
save(p,d)
print(json.dumps({'status':j['status'],'sha':j.get('sha')}))
