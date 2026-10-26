import {createRoot} from 'react-dom/client'
import {IntegratedBilling} from '../../../src/features/billing/IntegratedBilling'
import {IntegratedOpportunities} from '../../../src/features/opportunities/IntegratedOpportunities'
import {OpportunityInvoiceProvider} from './opportunity-invoice-provider'
const params=new URLSearchParams(location.search)
createRoot(document.getElementById('app')!).render(<OpportunityInvoiceProvider>{location.pathname==='/opportunities'?<IntegratedOpportunities initialId={params.get('open')??undefined} relatedInvoiceId={params.get('invoice')??undefined}/>:<IntegratedBilling initialOpportunityId={params.get('opportunity')??undefined} initialInvoiceId={params.get('invoice')??undefined}/>}</OpportunityInvoiceProvider>)
