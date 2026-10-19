from pathlib import Path
import json,subprocess,hashlib,re,sys
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';p='w2x-billing-draft-receipt';cp=w/(p+'-checkpoint.json')
def read(x):return json.loads(x.read_text(encoding='utf-8-sig'))
def save(x,d):x.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def log(s):
 b=(w/(p+'-'+s+'.txt')).read_bytes();return b.decode('utf-16') if b.startswith((b'\xff\xfe',b'\xfe\xff')) else b.decode('utf-8-sig')
j=read(cp) if cp.exists() else {'unit':49,'claim':6251092558,'base':'bf72cf94f203a4b72b1b7124b4efdbfb050b36b1','branch':'codex/w2x-billing-draft-receipt-20261018','status':'OWN18_BROWSER_RUNNING','browser_session':60625,'product_changed':False,'release':'NOT_ACCEPTED','checks':{'auth_db':'NOT_RUN','model':'NOT_RUN','paid_api':0,'global':'NOT_RUN_CURRENT_SHA'},'next':'Close own18 controls,inspect any failures without discarding originals;then publish and continue independent commercial work.'}
if sys.argv[1]=='preflight':
 assert log('browser-exit').strip()=='0' and re.search(r'(?m)^\s*18 passed ',log('browser'))
 for s in ['lint','build']:assert log(s+'-exit').strip()=='0',s+'FAILURE_PRESERVED'
 assert '66/66' in log('build')
 assert subprocess.check_output(['git','-C',str(r),'rev-parse','HEAD'],text=True).strip()==j['base']
 assert not subprocess.check_output(['git','-C',str(r),'diff',j['base'],'--','src'],text=True).strip(),'PRODUCT_UNCHANGED'
 paths=['tests/e2e-preview/billing-draft-receipt.spec.ts','docs/master/W2X_BILLING_DRAFT_RECEIPT_20261018.md']
 assert {s[3:].replace(chr(92),'/') for s in subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).splitlines()}==set(paths)
 j['candidate_fingerprints']=[{'path':x,'sha256_utf8_lf':hashlib.sha256((r/x).read_bytes().replace(b'\r\n',b'\n')).hexdigest()} for x in paths]
 subprocess.run(['git','-C',str(r),'diff','--check'],check=True)
 scan=subprocess.run([str(w/'tools/gitleaks-8.24.3/bin/gitleaks.exe'),'stdin','--redact','--no-banner'],input=b'\n'.join((r/x).read_bytes() for x in paths),stdout=subprocess.PIPE,stderr=subprocess.STDOUT);(w/(p+'-scan.txt')).write_bytes(scan.stdout);assert scan.returncode==0
 assert j['visual_review']['status']=='ACTUALLY_VIEWED'
 for x in j['visual_review']['frames']:assert hashlib.sha256(Path(x['path']).read_bytes()).hexdigest()==x['sha256']
 j.update(status='OWN18_BUILD66_LINT_SCAN_PASS_VISUAL_PARTIAL');j['checks'].update(browser='18_PASS_OWN_SOURCE',build='66_PASS',lint='EXIT0_WARNINGS_PRESERVED',scan='PASS')
 j['evidence']=[{'path':str(w/(p+'-'+s+'.txt')),'sha256':hashlib.sha256((w/(p+'-'+s+'.txt')).read_bytes()).hexdigest()} for s in ['browser','lint','build','scan']]
elif sys.argv[1]=='published':
 pub=read(w/(p+'-publication.json'));assert pub['publication']=='PUBLISHED';j.update(pub);j['status']='PUBLISHED_OWN18_BUILD66_VISUAL_PARTIAL';assert not subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).strip()
save(cp,j)
for name in ['outputs/CRM-recuperacion-inventario.json','work/canonical-next-composition-metadata.json','work/current-authorized-execution-unit.json','work/w2x-current-execution-unit.json']:
 q=w.parent/name;d=read(q);t=d if name.endswith('w2x-current-execution-unit.json') else d.setdefault('w2x_recovery',{});t['active_commercial_unit']=j;save(q,d)
q=w/'w2x-commercial-continuation-orchestration.json';d=read(q);d.setdefault('source49',{}).update(checkpoint=str(cp),status=j['status'],sha=j.get('sha'),publication=j.get('publication'));d['next']=j['next'];save(q,d)
q=w/'w2x-units-index.json';d=read(q);ref='work/'+cp.name
if ref not in d['unit_checkpoints']:d['unit_checkpoints'].append(ref)
for row in d['current_working_checkouts']:
 if row['path'].endswith('crm-w2x-document-upload-uncertain'):row.update(sha=j.get('sha',j['base']),base=j['base'],branch=j['branch'],clean=sys.argv[1]=='published',branch_published=sys.argv[1]=='published',status=j['status'])
save(q,d)
print(json.dumps({'status':j['status'],'sha':j.get('sha')}))
