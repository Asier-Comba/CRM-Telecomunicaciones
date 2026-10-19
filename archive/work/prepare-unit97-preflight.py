from pathlib import Path
w=Path('work');s=(w/'preflight-unit96.py').read_text(encoding='utf-8').replace("p='w2x-customer-list-name-wrap'","p='w2x-customer-list-filter-priority'").replace('60 passed','66 passed').replace('60 tests in 6 files','66 tests in 7 files')
a=s.index("paths=['src/features/customers/Customers");b=s.index("assert not git('diff','--check')")
s=s[:a]+'''paths=['src/features/customers/Customers.tsx','src/features/customers/IntegratedCustomers.tsx','tests/e2e-preview/customer-list-name-wrap.spec.ts','tests/e2e-preview/customer-list-filter-priority.spec.ts','docs/master/W2X_CUSTOMER_LIST_FILTER_PRIORITY_20261019.md']
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
'''+s[b:]
a=s.index("frames=sorted(");b=s.index("scan=subprocess.run",a)
s=s[:a]+'''results=w/(p+'-final-results')
primary=sorted(results.glob('**/customer-filter-*.png'));assert len(primary)==8
supplement=sorted(results.glob('**/customer-list-name-long-390.png'))+sorted(results.glob('**/customer-list-name-ordinary-390.png'));assert len(supplement)==2
frames=primary+supplement
obs=sorted({f.parent/'observations.json' for f in frames});assert len(obs)==8 and all(f.exists() for f in obs)
records=[]
for f in obs:
 x=read(f);assert x['errors']==[] and x['commands']==[] and x['unexpected']==[]
 assert x['interaction'] in ['FILTER_VALUES_AND_EXPANSION_PRESERVED','SELECTION_CLEAR_FILTER_RESET_PASS']
 records.append(x)
'''+s[b:]
s=s.replace('OWN60_BUILD66_VISUAL9','OWN66_BUILD66_VISUAL10').replace('controls_session=33611','controls_session=35154').replace("browser='60_PASS_OWN_SOURCE'","browser='66_PASS_OWN_SOURCE'").replace('9initialframes long/ordinary/denied3907681440;tabletitlefixvisible7681440;positive390cardbelowfirstviewportDOMonly;notallcolumns orNextnavigation/roles/a11yacceptance','10currentframes:6priorityinitial,2expandedmobile,2name390;longnamecardfooterpartlybelowviewportinunscrolledcontrol;noallfields/Nextnavigation/roles/a11yacceptance')
(w/'preflight-unit97.py').write_text(s,encoding='utf-8')
