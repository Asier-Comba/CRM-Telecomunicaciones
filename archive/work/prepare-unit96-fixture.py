from pathlib import Path
w=Path('work');r=w/'crm-w2x-document-upload-uncertain';p=r/'tests/e2e-preview/fixtures/customer-resource-entry.tsx';s=p.read_text(encoding='utf-8');assert "if(kind==='contract-followup-lifetime')" in s
(w/'w2x-customer-list-name-wrap-fixture-before.tsx').write_text(s,encoding='utf-8')
s="import {AppRouterContext,type AppRouterInstance} from 'next/dist/shared/lib/app-router-context.shared-runtime'\nimport {IntegratedCustomers} from '../../../src/features/customers/IntegratedCustomers'\n"+s
s=s.replace('function Fixture(){',"const listRouter:AppRouterInstance={bfcacheId:'synthetic-customer-list',back(){},forward(){},refresh(){},push(href){history.pushState(null,'',href)},replace(href){history.replaceState(null,'',href)},prefetch(){}}\nfunction Fixture(){")
s=s.replace(" if(kind==='contract-followup-lifetime')"," if(kind==='customers-list')return <AppRouterContext.Provider value={listRouter}><IntegratedCustomers/></AppRouterContext.Provider>\n if(kind==='contract-followup-lifetime')");p.write_text(s,encoding='utf-8')
