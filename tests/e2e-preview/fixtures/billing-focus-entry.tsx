import { createRoot } from 'react-dom/client'
import { IntegratedBilling } from '../../../src/features/billing/IntegratedBilling'
createRoot(document.getElementById('app')!).render(<IntegratedBilling initialInvoiceId="10000000-0000-4000-8000-000000000001" contentEnabled />)
