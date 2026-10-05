import { PageHeader } from '@/components/PageHeader'
import { syntheticPreviewAllowed } from '@/lib/telecom-preview/access'
import {
  previewCustomers,
  previewContracts,
  previewServices,
  previewOpportunities,
} from '@/lib/telecom-preview/data'
import { Billing } from '@/features/billing/Billing'
import { integratedLocalAllowed } from '@/features/product/integration/mode'
import { IntegratedBilling } from '@/features/billing/IntegratedBilling'
export default async function InvoicingPage({searchParams}:{searchParams:Promise<{invoice?:string;customer?:string}>}) {
  if(integratedLocalAllowed()){
    const {invoice,customer}=await searchParams
    return <IntegratedBilling initialCustomerId={typeof customer==='string'&&/^[0-9a-f-]{36}$/i.test(customer)?customer:undefined} initialInvoiceId={typeof invoice==='string'&&/^[0-9a-f-]{36}$/i.test(invoice)?invoice:undefined}/>
  }
  if (!syntheticPreviewAllowed())
    return (
      <PageHeader
        title="Facturación PRO"
        description="Módulo pendiente de lectura y operaciones autorizadas."
      />
    )
  return (
    <Billing
      links={[
        ...previewContracts.map((c) => ({
          kind: 'contractId' as const,
          id: c.id,
          customerId: c.customer.id,
          label: `${c.operator.display_name} · ${c.plan?.display_name ?? 'Contrato'}`,
        })),
        ...previewServices.map((s) => ({
          kind: 'serviceId' as const,
          id: s.id,
          customerId: s.customer.id,
          label: s.display_name,
          contractId: s.contract?.id ?? null,
        })),
        ...previewOpportunities
          .filter((o) => o.customer !== null)
          .map((o) => ({
            kind: 'opportunityId' as const,
            id: o.id,
            customerId: o.customer!.id,
            label: o.title,
          })),
      ]}
      customers={previewCustomers.map((c) => ({
        id: c.id,
        name: c.legal_name,
      }))}
    />
  )
}
