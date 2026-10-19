from pathlib import Path
import json,hashlib,subprocess,re
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';p='w2x-customer-list-filter-priority'
def read(f):return json.loads(f.read_text(encoding='utf-8-sig'))
def save(f,j):f.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def log(name):
 b=(w/(p+'-'+name+'.txt')).read_bytes()
 return b.decode('utf-16' if b.startswith((b'\xff\xfe',b'\xfe\xff')) else 'utf-8-sig')
def git(*args):return subprocess.check_output(['git','-C',str(r),*args]).decode('utf-8').strip()
j=read(w/(p+'-checkpoint.json'));assert git('branch','--show-current')==j['branch'];assert git('rev-parse','HEAD')==j['base']
for name in ['browser','lint','build','collection']:assert log(name+'-exit').strip()=='0',name
assert '66 passed' in log('browser') and 'Total: 66 tests in 7 files' in log('collection')
assert '66/66' in log('build')
paths=['src/features/customers/Customers.tsx','src/features/customers/IntegratedCustomers.tsx','tests/e2e-preview/customer-list-name-wrap.spec.ts','tests/e2e-preview/customer-list-filter-priority.spec.ts','docs/master/W2X_CUSTOMER_LIST_FILTER_PRIORITY_20261019.md']
dirty=[line[3:] for line in subprocess.check_output(['git','-C',str(r),'status','--porcelain']).decode('utf-8').splitlines()]
assert set(dirty)==set(paths),(dirty,paths)
changes=read(w/(p+'-source-reversal.json'))
for index,key in [(0,'customers'),(1,'integrated')]:
 text=(r/paths[index]).read_text(encoding='utf-8')
 for before,after in reversed(changes[key]):assert text.count(after)==1;text=text.replace(after,before)
 snapshot=(w/(p+'-'+key+'-before.tsx')).read_text(encoding='utf-8');assert text==snapshot and git('show','HEAD:'+paths[index])==snapshot.strip()
text=(r/paths[2]).read_text(encoding='utf-8');added=changes['name_bank_added_only'];assert text.count(added)==1
assert text.replace(added,'')==(w/(p+'-name-bank-before.ts')).read_text(encoding='utf-8')
assert git('show','HEAD:'+paths[2])==text.replace(added,'').strip()
assert (r/paths[3]).read_bytes()==(w/(p+'-final-bank.ts')).read_bytes()
assert "toBeInViewport({ratio:0.9})" in (r/paths[3]).read_text(encoding='utf-8') and "toBeInViewport({ratio:0.5})" in (r/paths[3]).read_text(encoding='utf-8')
assert not git('diff','--check')
results=w/(p+'-final-results')
primary=sorted(results.glob('**/customer-filter-*.png'));assert len(primary)==8
supplement=sorted(results.glob('**/customer-list-name-long-390.png'))+sorted(results.glob('**/customer-list-name-ordinary-390.png'));assert len(supplement)==2
frames=primary+supplement
obs=sorted({f.parent/'observations.json' for f in frames});assert len(obs)==8 and all(f.exists() for f in obs)
records=[]
for f in obs:
 x=read(f);assert x['errors']==[] and x['commands']==[] and x['unexpected']==[]
 assert x['interaction'] in ['FILTER_VALUES_AND_EXPANSION_PRESERVED','SELECTION_CLEAR_FILTER_RESET_PASS']
 records.append(x)
scan=subprocess.run([str(w/'tools/gitleaks-8.24.3/bin/gitleaks.exe'),'stdin','--redact','--no-banner'],input=b'\n'.join((r/x).read_bytes() for x in paths),stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
(w/(p+'-scan.txt')).write_bytes(scan.stdout);assert scan.returncode==0
j.update(status='OWN66_BUILD66_VISUAL10_PREFLIGHT_PASS',browser_summary=re.search(r'66 passed[^\r\n]*',log('browser')).group(0),controls_session=35154)
j['checks'].update(browser='66_PASS_OWN_SOURCE',build='66_PASS',lint='EXIT0_WARNINGS_PRESERVED',scan='PASS')
j['visual_review']={'status':'ACTUALLY_VIEWED','scope':'10currentframes:6priorityinitial,2expandedmobile,2name390;longnamecardfooterpartlybelowviewportinunscrolledcontrol;noallfields/Nextnavigation/roles/a11yacceptance','frames':[{'path':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in frames]}
j['observations']=records
j['candidate_fingerprints']=[{'path':x,'sha256_utf8_lf':hashlib.sha256((r/x).read_text(encoding='utf-8').replace('\r\n','\n').encode()).hexdigest()} for x in paths]
j['evidence']=[{'path':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in sorted(w.glob(p+'-*.txt'))]
j['known_remaining_defects']={'whole_product':'NOT_RECONCILED','router_navigation':'NOT_RUN_CONTROLLED_CONTEXT_ONLY','security':'W4_PENDING_HIGH5','release':'NOT_ACCEPTED'}
save(w/(p+'-checkpoint.json'),j)
print(json.dumps({'preflight':'PASS','browser':j['browser_summary'],'frames':len(frames),'paths':len(paths)}))
