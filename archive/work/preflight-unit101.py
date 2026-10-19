from pathlib import Path
import json,hashlib,subprocess,re
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';p='w2x-customer-list-refresh-focus'
def read(f):return json.loads(f.read_text(encoding='utf-8-sig'))
def save(f,j):f.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def log(name):
 b=(w/(p+'-'+name+'.txt')).read_bytes()
 return b.decode('utf-16' if b.startswith((b'\xff\xfe',b'\xfe\xff')) else 'utf-8-sig')
def git(*args):return subprocess.check_output(['git','-C',str(r),*args]).decode('utf-8').strip()
j=read(w/(p+'-checkpoint.json'));assert git('branch','--show-current')==j['branch'];assert git('rev-parse','HEAD')==j['base']
for name in ['browser','lint','build','collection']:assert log(name+'-exit').strip()=='0',name
assert '93 passed' in log('browser') and 'Total: 93 tests in 9 files' in log('collection')
assert '66/66' in log('build')
paths=['src/features/customers/IntegratedCustomers.tsx','tests/e2e-preview/customer-list-refresh-focus.spec.ts','docs/master/W2X_CUSTOMER_LIST_REFRESH_FOCUS_20261019.md']
dirty=[line[3:] for line in subprocess.check_output(['git','-C',str(r),'status','--porcelain']).decode('utf-8').splitlines()]
assert set(dirty)==set(paths),(dirty,paths)
change=read(w/(p+'-source-reversal.json'));text=(r/paths[0]).read_text(encoding='utf-8');assert text.count(change['after'])==1
before=(w/(p+'-product-before.tsx')).read_text(encoding='utf-8');assert text.replace(change['after'],change['before'])==before and git('show','HEAD:'+paths[0])==before.strip()
assert (r/paths[1]).read_bytes()==(w/(p+'-final-bank.ts')).read_bytes()==(w/(p+'-causal-bank.ts')).read_bytes()
assert not git('diff','--check')
results=w/(p+'-final-results');frames=sorted(results.glob('**/customer-refresh-focus-*.png'));assert len(frames)==15
obs=sorted({f.parent/'observations.json' for f in frames});assert len(obs)==15 and all(f.exists() for f in obs)
records=[]
for f in obs:
 x=read(f);assert x['errors']==[] and x['commands']==[] and x['unexpected']==[] and x['interaction']=='REFRESH_RETRY_FOCUS_AND_SUPERSESSION_PASS'
 if x['mode'] in ['success','denied','retry_success']:assert not x['focus']['body'] and x['focus']['tag']=='P' and x['focus']['role']==('alert' if x['mode']=='denied' else 'status')
 if x['mode']=='chosen':assert not x['focus']['body'] and x['focus']['tag']=='BUTTON'
 records.append(x)
scan=subprocess.run([str(w/'tools/gitleaks-8.24.3/bin/gitleaks.exe'),'stdin','--redact','--no-banner'],input=b'\n'.join((r/x).read_bytes() for x in paths),stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
(w/(p+'-scan.txt')).write_bytes(scan.stdout);assert scan.returncode==0
j.update(status='OWN93_BUILD66_VISUAL15_PREFLIGHT_PASS',browser_summary=re.search(r'93 passed[^\r\n]*',log('browser')).group(0),controls_session=1405)
j['checks'].update(browser='93_PASS_OWN_SOURCE',build='66_PASS',lint='EXIT0_WARNINGS_PRESERVED',scan='PASS')
j['visual_review']={'status':'ACTUALLY_VIEWED','scope':'15currentframes success/denied/chosen/retry/filter_supersedes3907681440;deniedbeforeretryrecoveryDOMonly;chosen390recordbelowviewportDOMonly;notallfields/Nextnavigation/roles/a11yacceptance','frames':[{'path':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in frames]}
j['observations']=records
j['candidate_fingerprints']=[{'path':x,'sha256_utf8_lf':hashlib.sha256((r/x).read_text(encoding='utf-8').replace('\r\n','\n').encode()).hexdigest()} for x in paths]
j['evidence']=[{'path':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in sorted(w.glob(p+'-*.txt'))]
j['known_remaining_defects']={'whole_product':'NOT_RECONCILED','router_navigation':'NOT_RUN_CONTROLLED_CONTEXT_ONLY','security':'W4_PENDING_HIGH5','release':'NOT_ACCEPTED'}
save(w/(p+'-checkpoint.json'),j)
print(json.dumps({'preflight':'PASS','browser':j['browser_summary'],'frames':len(frames),'paths':len(paths)}))
