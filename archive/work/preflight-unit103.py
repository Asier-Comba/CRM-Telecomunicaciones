from pathlib import Path
import json,hashlib,subprocess,re
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';p='w2x-domain-customer-label-wrap'
def read(f):return json.loads(f.read_text(encoding='utf-8-sig'))
def save(f,j):f.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def log(name):
 b=(w/(p+'-'+name+'.txt')).read_bytes()
 return b.decode('utf-16' if b.startswith((b'\xff\xfe',b'\xfe\xff')) else 'utf-8-sig')
def git(*args):return subprocess.check_output(['git','-C',str(r),*args]).decode('utf-8').strip()
j=read(w/(p+'-checkpoint.json'));assert git('branch','--show-current')==j['branch'];assert git('rev-parse','HEAD')==j['base']
for name in ['browser','lint','build','collection']:assert log(name+'-exit').strip()=='0',name
assert '90 passed' in log('browser') and 'Total: 90 tests in 8 files' in log('collection')
assert '66/66' in log('build')
paths=['src/features/customers/CustomerDomainPages.tsx','tests/e2e-preview/domain-customer-label-wrap.spec.ts','tests/e2e-preview/fixtures/customer-domain-entry.tsx','docs/master/W2X_DOMAIN_CUSTOMER_LABEL_WRAP_20261019.md']
dirty=[line[3:] for line in subprocess.check_output(['git','-C',str(r),'status','--porcelain']).decode('utf-8').splitlines()]
assert set(dirty)==set(paths),(dirty,paths)
change=read(w/(p+'-source-reversal.json'));text=(r/paths[0]).read_text(encoding='utf-8');before=(w/(p+'-product-before.tsx')).read_text(encoding='utf-8')
assert text.replace(change['after'],change['before'])==before and git('show','HEAD:'+paths[0])==before.strip()
assert (r/paths[1]).read_bytes()==(w/(p+'-final-bank.ts')).read_bytes()==(w/(p+'-causal-bank.ts')).read_bytes()
f=(w/(p+'-fixture-before.tsx')).read_text(encoding='utf-8');actual=(r/paths[2]).read_text(encoding='utf-8')
assert actual==f.replace('function Fixture(){','function Fixture(){\n const globalScope=new URLSearchParams(location.search).get(\'global\')===\'1\'').replace('customerId={customerId}','customerId={globalScope?undefined:customerId}')
assert not git('diff','--check')
results=w/(p+'-final-results');frames=sorted(results.glob('**/domain-customer-label-*.png'));assert len(frames)==9
obs=sorted({f.parent/'observations.json' for f in frames});assert len(obs)==9 and all(f.exists() for f in obs)
records=[]
for f in obs:
 x=read(f);assert x['errors']==[] and x['commands']==[] and x['unexpected']==[] and x['interaction']=='CUSTOMER_LABEL_AND_OPERATOR_VISIBLE_SAFE_FALLBACK'
 assert x['geometry']['scroll']<=x['geometry']['client']+1
 records.append(x)
scan=subprocess.run([str(w/'tools/gitleaks-8.24.3/bin/gitleaks.exe'),'stdin','--redact','--no-banner'],input=b'\n'.join((r/x).read_bytes() for x in paths),stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
(w/(p+'-scan.txt')).write_bytes(scan.stdout);assert scan.returncode==0
j.update(status='OWN90_BUILD66_VISUAL9_PREFLIGHT_PASS',browser_summary=re.search(r'90 passed[^\r\n]*',log('browser')).group(0),controls_session=84090)
j['checks'].update(browser='90_PASS_OWN_SOURCE',build='66_PASS',lint='EXIT0_WARNINGS_PRESERVED',scan='PASS')
j['visual_review']={'status':'ACTUALLY_VIEWED','scope':'9currentglobalserviceframes long/ordinary/denied128014401920;completeprovidedname/operatorvisible;notallrecords/domains/fields/Nextnavigation/roles/a11yacceptance','frames':[{'path':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in frames]}
j['observations']=records
j['candidate_fingerprints']=[{'path':x,'sha256_utf8_lf':hashlib.sha256((r/x).read_text(encoding='utf-8').replace('\r\n','\n').encode()).hexdigest()} for x in paths]
j['evidence']=[{'path':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in sorted(w.glob(p+'-*.txt'))]
j['known_remaining_defects']={'whole_product':'NOT_RECONCILED','router_navigation':'NOT_RUN_CONTROLLED_CONTEXT_ONLY','security':'W4_PENDING_HIGH5','release':'NOT_ACCEPTED'}
save(w/(p+'-checkpoint.json'),j)
print(json.dumps({'preflight':'PASS','browser':j['browser_summary'],'frames':len(frames),'paths':len(paths)}))
