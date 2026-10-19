from pathlib import Path
w=Path('work');s=(w/'preflight-unit94.py').read_text(encoding='utf-8');s=s.replace("p='w2x-customer-domain-title-wrap'","p='w2x-customer-list-name-wrap'").replace('75 passed','60 passed').replace('75 tests','60 tests')
a=s.index("paths=['src/features/customers/CustomerDomainPages");b=s.index("assert not git('diff','--check')")
s=s[:a]+'''paths=['src/features/customers/Customers.tsx','tests/e2e-preview/fixtures/customer-resource-entry.tsx','tests/e2e-preview/customer-list-name-wrap.spec.ts','docs/master/W2X_CUSTOMER_LIST_NAME_WRAP_20261019.md']
dirty=[line[3:] for line in subprocess.check_output(['git','-C',str(r),'status','--porcelain']).decode('utf-8').splitlines()]
assert set(dirty)==set(paths),(dirty,paths)
before=(w/(p+'-product-before.tsx')).read_text(encoding='utf-8');after=(r/paths[0]).read_text(encoding='utf-8')
assert after.replace('className="min-w-0 [overflow-wrap:anywhere] flex gap-2 font-semibold text-slate-900 hover:text-indigo-600"','className="flex gap-2 font-semibold text-slate-900 hover:text-indigo-600"')==before
assert git('show','HEAD:'+paths[0])==before.strip()
assert (r/paths[2]).read_bytes()==(w/(p+'-final-bank.ts')).read_bytes()
fixture=(r/paths[1]).read_text(encoding='utf-8')
fixture=fixture.replace("import {AppRouterContext,type AppRouterInstance} from 'next/dist/shared/lib/app-router-context.shared-runtime'\\nimport {IntegratedCustomers} from '../../../src/features/customers/IntegratedCustomers'\\n",'').replace("const listRouter:AppRouterInstance={bfcacheId:'synthetic-customer-list',back(){},forward(){},refresh(){},push(href){history.pushState(null,'',href)},replace(href){history.replaceState(null,'',href)},prefetch(){}}\\n",'').replace(" if(kind==='customers-list')return <AppRouterContext.Provider value={listRouter}><IntegratedCustomers/></AppRouterContext.Provider>\\n",'')
assert fixture==(w/(p+'-fixture-before.tsx')).read_text(encoding='utf-8')
assert git('show','HEAD:'+paths[1])==fixture.strip()
'''+s[b:]
s=s.replace("glob('**/customer-service-title-*.png')","glob('**/customer-list-name-*.png')")
s=s.replace("if x.get('geometry'):assert x['geometry']['titleScroll']<=x['geometry']['titleClient']+1 and x['geometry']['scroll']<=x['geometry']['client']+1","if x.get('geometry'):assert x['geometry']['scroll']<=x['geometry']['client']+1 and x['interaction']=='SELECTION_CLEAR_FILTER_RESET_PASS'")
s=s.replace(" if x['mode']=='denied':assert [r['operation'] for r in x['reads']]==['service.list']\n",'')
s=s.replace('OWN75_BUILD66','OWN60_BUILD66').replace('controls_session=38603','controls_session=33611').replace("browser='75_PASS_OWN_SOURCE'","browser='60_PASS_OWN_SOURCE'").replace("'scope':'9primary frames long/ordinary/denied at3907681440;cards390768,table1440withintentionalhorizontal scroll;no allcolumns/wholeproduct/roles/a11yacceptance'","'scope':'9primary frames long/ordinary/denied3907681440;mobilecards390/table7681440;notallcolumns orrealNextnavigation/roles/a11yacceptance'").replace("'other_domain_labels':'NOT_INDIVIDUALLY_QUALIFIED_BY_SERVICE_LABEL_TESTS'","'router_navigation':'NOT_RUN_CONTROLLED_CONTEXT_ONLY'")
(w/'preflight-unit96.py').write_text(s,encoding='utf-8')
