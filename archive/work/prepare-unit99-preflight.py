from pathlib import Path
w=Path('work');s=(w/'preflight-unit97.py').read_text(encoding='utf-8').replace("p='w2x-customer-list-filter-priority'","p='w2x-customer-list-page-focus'").replace('66 passed','78 passed').replace('66 tests in 7 files','78 tests in 8 files')
a=s.index("paths=['src/features/customers/Customers");b=s.index("assert not git('diff','--check')")
s=s[:a]+'''paths=['src/features/customers/Customers.tsx','src/features/customers/IntegratedCustomers.tsx','tests/e2e-preview/customer-list-page-focus.spec.ts','docs/master/W2X_CUSTOMER_LIST_PAGE_FOCUS_20261019.md']
dirty=[line[3:] for line in subprocess.check_output(['git','-C',str(r),'status','--porcelain']).decode('utf-8').splitlines()]
assert set(dirty)==set(paths),(dirty,paths)
changes=read(w/(p+'-source-reversal.json'))
for index,key in [(0,'customers'),(1,'integrated')]:
 text=(r/paths[index]).read_text(encoding='utf-8')
 for before,after in reversed(changes[key]):assert text.count(after)==1;text=text.replace(after,before)
 snapshot=(w/(p+'-'+key+'-before.tsx')).read_text(encoding='utf-8');assert text==snapshot and git('show','HEAD:'+paths[index])==snapshot.strip()
assert (r/paths[2]).read_bytes()==(w/(p+'-final-bank.ts')).read_bytes()==(w/(p+'-causal-bank.ts')).read_bytes()
'''+s[b:]
a=s.index('results=w/');b=s.index('scan=subprocess.run',a)
s=s[:a]+'''results=w/(p+'-final-results');frames=sorted(results.glob('**/customer-page-focus-*.png'));assert len(frames)==12
obs=sorted({f.parent/'observations.json' for f in frames});assert len(obs)==12 and all(f.exists() for f in obs)
records=[]
for f in obs:
 x=read(f);assert x['errors']==[] and x['commands']==[] and x['unexpected']==[] and x['interaction']=='PAGINATION_FOCUS_AND_SUPERSESSION_PASS'
 if x['mode'] in ['success','denied']:assert not x['focus']['body'] and x['focus']['tag']=='P' and x['focus']['role']==('alert' if x['mode']=='denied' else 'status')
 if x['mode']=='chosen':assert not x['focus']['body'] and x['focus']['tag']=='BUTTON'
 records.append(x)
'''+s[b:]
s=s.replace('OWN66_BUILD66_VISUAL10','OWN78_BUILD66_VISUAL12').replace('controls_session=35154','controls_session=9111').replace("browser='66_PASS_OWN_SOURCE'","browser='78_PASS_OWN_SOURCE'").replace('10currentframes:6priorityinitial,2expandedmobile,2name390;longnamecardfooterpartlybelowviewportinunscrolledcontrol;noallfields/Nextnavigation/roles/a11yacceptance','12currentframes success/denied/chosen/filter_supersedes3907681440;errorbeforepreviousrecoveryDOMonly;filter390recordbelowviewportwithopenfiltersDOMonly;notallcolumns/Nextnavigation/roles/a11yacceptance')
(w/'preflight-unit99.py').write_text(s,encoding='utf-8')
f=w/'refresh-w2x-drawer-queue.py';s=f.read_text(encoding='utf-8').replace("elif (w/(p+'-requested.json')).exists():d.update(status='RUNNING_ONCE',dispatch='REQUESTED_ONCE')","elif (w/(p+'-requested.json')).exists():d.update(status='RUNNING_ONCE',dispatch='REQUESTED_ONCE',next='Freeze14atsource92during2109unique93887;then2139source97waiter26311onlyafter2109terminal/PUBLISHED/PASS;continuework15.')");f.write_text(s,encoding='utf-8')
