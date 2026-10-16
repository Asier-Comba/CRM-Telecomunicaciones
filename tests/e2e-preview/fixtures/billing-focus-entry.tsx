import { createRoot } from 'react-dom/client'
import {useCallback,useState} from 'react'
import {InvoiceRelationSelect} from '../../../src/features/billing/InvoiceRelationSelect'
import type {InvoiceLink} from '../../../src/features/billing/model'
import { IntegratedBilling } from '../../../src/features/billing/IntegratedBilling'
function BillingFixture(){
 const [invoice,setInvoice]=useState('10000000-0000-4000-8000-000000000001')
 const [relation,setRelation]=useState('30000000-0000-4000-8000-000000000021'),[verification,setVerification]=useState<{kind:InvoiceLink['kind'];id:string;linkId:string|null}|null>(null)
 const verified=useCallback((kind:InvoiceLink['kind'],id:string,link:InvoiceLink|null)=>setVerification({kind,id,linkId:link?.id??null}),[])
 if(new URLSearchParams(location.search).get('relation_scope')==='1')return <><InvoiceRelationSelect kind="contractId" customerId="10000000-0000-4000-8000-000000000002" contractId={null} value={relation} onChange={setRelation} onVerified={verified}/><output aria-label="Verificación de relación sintética">{JSON.stringify(verification)}</output></>
 return <>{location.hash==='#context'&&<nav aria-label="Fixture invoice context"><button onClick={()=>setInvoice('10000000-0000-4000-8000-000000000003')}>Fixture seleccionar otra factura</button></nav>}<IntegratedBilling initialInvoiceId={new URLSearchParams(location.search).get('create')==='1'||new URLSearchParams(location.search).get('customer_scope')==='1'?undefined:invoice} initialCustomerId={location.hash==='#fiscal-customer'||new URLSearchParams(location.search).get('customer_scope')==='1'?invoice:undefined} initialCreate={location.hash==='#create-customer'||new URLSearchParams(location.search).get('create')==='1'} contentEnabled /></>
}
createRoot(document.getElementById('app')!).render(<BillingFixture />)
