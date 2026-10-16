import { createRoot } from 'react-dom/client'
import {useState} from 'react'
import { IntegratedBilling } from '../../../src/features/billing/IntegratedBilling'
function BillingFixture(){
 const [invoice,setInvoice]=useState('10000000-0000-4000-8000-000000000001')
 return <>{location.hash==='#context'&&<nav aria-label="Fixture invoice context"><button onClick={()=>setInvoice('10000000-0000-4000-8000-000000000003')}>Fixture seleccionar otra factura</button></nav>}<IntegratedBilling initialInvoiceId={new URLSearchParams(location.search).get('create')==='1'||new URLSearchParams(location.search).get('customer_scope')==='1'?undefined:invoice} initialCustomerId={location.hash==='#fiscal-customer'||new URLSearchParams(location.search).get('customer_scope')==='1'?invoice:undefined} initialCreate={location.hash==='#create-customer'||new URLSearchParams(location.search).get('create')==='1'} contentEnabled /></>
}
createRoot(document.getElementById('app')!).render(<BillingFixture />)
