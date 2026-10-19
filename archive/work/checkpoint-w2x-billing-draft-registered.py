from pathlib import Path
import json,subprocess,hashlib,re,sys
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';p='w2x-billing-draft-registered';cp=w/(p+'-checkpoint.json')
def read(x):return json.loads(x.read_text(encoding='utf-8-sig'))
def save(x,d):x.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def log(s):
 b=(w/(p+'-'+s+'.txt')).read_bytes();return b.decode('utf-16') if b.startswith((b'\xff\xfe',b'\xfe\xff')) else b.decode('utf-8-sig')
j=read(cp) if cp.exists() else {'unit':51,'claim':6251201716,'base':'bc3b3c12bd92eb76897c96b007af01bcbf8c2948','branch':'codex/w2x-billing-draft-registered-20261018','status':'OWN18_BROWSER_RUNNING','browser_session':43210,'product_changed':False,'release':'NOT_ACCEPTED','checks':{'auth_db':'NOT_RUN','model':'NOT_RUN','paid_api':0,'global':'NOT_RUN_CURRENT_SHA'},'next':'Close own18 controls,inspect any failures without discarding originals;then publish and continue independent commercial work.'}
if sys.argv[1]=='preflight':
 assert log('browser-exit').strip()=='1' and re.search(r'(?m)^\s*6 failed',log('browser')) and re.search(r'(?m)^\s*12 passed ',log('browser'))
 assert log('failed6-exit').strip()=='0' and re.search(r'(?m)^\s*6 passed ',log('failed6'))
 old=(w/(p+'-attempt1-test.ts')).read_text(encoding='utf-8-sig').replace('\r\n','\n');new=(r/'tests/e2e-preview/billing-draft-registered.spec.ts').read_text(encoding='utf-8')
 assert old.replace(" let invoice={...fixture.invoice,status:'draft',number:null,issued_at:null,paid_at:null,overdue:false},registered=false,postReads=0\n"," let invoice={...fixture.invoice,status:'draft',number:null,issued_at:null,paid_at:null,overdue:false},registered=false,postReads=0\n if(mode==='wrong-customer')expect(customerId).not.toBe('20000000-0000-4000-8000-000000000007')\n").replace("customer_id:action==='create'?fixture.invoice.customer_id:fixture.invoice.id","customer_id:'20000000-0000-4000-8000-000000000007'")==new,'ONLY_WRONG_CUSTOMER_FIXTURE_REFINED'
 for s in ['lint','build']:assert log(s+'-exit').strip()=='0',s+'FAILURE_PRESERVED'
 assert '66/66' in log('build')
 assert subprocess.check_output(['git','-C',str(r),'rev-parse','HEAD'],text=True).strip()==j['base']
 assert not subprocess.check_output(['git','-C',str(r),'diff',j['base'],'--','src'],text=True).strip(),'PRODUCT_UNCHANGED'
 paths=['tests/e2e-preview/billing-draft-registered.spec.ts','docs/master/W2X_BILLING_DRAFT_REGISTERED_20261018.md']
 assert {s[3:].replace(chr(92),'/') for s in subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).splitlines()}==set(paths)
 j['candidate_fingerprints']=[{'path':x,'sha256_utf8_lf':hashlib.sha256((r/x).read_bytes().replace(b'\r\n',b'\n')).hexdigest()} for x in paths]
 subprocess.run(['git','-C',str(r),'diff','--check'],check=True)
 scan=subprocess.run([str(w/'tools/gitleaks-8.24.3/bin/gitleaks.exe'),'stdin','--redact','--no-banner'],input=b'\n'.join((r/x).read_bytes() for x in paths),stdout=subprocess.PIPE,stderr=subprocess.STDOUT);(w/(p+'-scan.txt')).write_bytes(scan.stdout);assert scan.returncode==0
 assert j['visual_review']['status']=='ACTUALLY_VIEWED'
 for x in j['visual_review']['frames']:assert hashlib.sha256(Path(x['path']).read_bytes()).hexdigest()==x['sha256']
 j.update(status='OWN12_PLUS6_COMPLEMENTARY_BUILD66_VISUAL_PARTIAL',original={'failed':6,'passed':12,'duration':'2.0m','cause':'Wrong-customer fixture used equal id/customer_id UUID;valid read correctly succeeded. No product defect.'});j['checks'].update(browser='12_ORIGINAL_PLUS6_COMPLEMENTARY_PASS_NOT18_SINGLE_PASS',build='66_PASS',lint='EXIT0_WARNINGS_PRESERVED',scan='PASS')
 j['evidence']=[{'path':str(w/(p+'-'+s+'.txt')),'sha256':hashlib.sha256((w/(p+'-'+s+'.txt')).read_bytes()).hexdigest()} for s in ['browser','failed6','lint','build','scan']]
elif sys.argv[1]=='published':
 pub=read(w/(p+'-publication.json'));assert pub['publication']=='PUBLISHED';j.update(pub);j['status']='PUBLISHED_12_PLUS6_COMPLEMENTARY_NOT18_SINGLE_PASS';assert not subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).strip()
save(cp,j)
for name in ['outputs/CRM-recuperacion-inventario.json','work/canonical-next-composition-metadata.json','work/current-authorized-execution-unit.json','work/w2x-current-execution-unit.json']:
 q=w.parent/name;d=read(q);t=d if name.endswith('w2x-current-execution-unit.json') else d.setdefault('w2x_recovery',{});t['active_commercial_unit']=j;save(q,d)
q=w/'w2x-commercial-continuation-orchestration.json';d=read(q);d.setdefault('source51',{}).update(checkpoint=str(cp),status=j['status'],sha=j.get('sha'),publication=j.get('publication'));d['next']=j['next'];save(q,d)
q=w/'w2x-units-index.json';d=read(q);ref='work/'+cp.name
if ref not in d['unit_checkpoints']:d['unit_checkpoints'].append(ref)
for row in d['current_working_checkouts']:
 if row['path'].endswith('crm-w2x-document-upload-uncertain'):row.update(sha=j.get('sha',j['base']),base=j['base'],branch=j['branch'],clean=sys.argv[1]=='published',branch_published=sys.argv[1]=='published',status=j['status'])
save(q,d)
print(json.dumps({'status':j['status'],'sha':j.get('sha')}))
