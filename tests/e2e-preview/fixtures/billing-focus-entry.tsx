import { createRoot } from 'react-dom/client'
import {useState} from 'react'
import { IntegratedBilling } from '../../../src/features/billing/IntegratedBilling'
function BillingFixture(){
 const [invoice,setInvoice]=useState('10000000-0000-4000-8000-000000000001')
 return <>{location.hash==='#context'&&<nav aria-label="Fixture invoice context"><button onClick={()=>setInvoice('10000000-0000-4000-8000-000000000003')}>Fixture seleccionar otra factura</button></nav>}<IntegratedBilling initialInvoiceId={invoice} initialCustomerId={location.hash==='#fiscal-customer'?invoice:undefined} contentEnabled /></>
}
createRoot(document.getElementById('app')!).render(<BillingFixture />)
