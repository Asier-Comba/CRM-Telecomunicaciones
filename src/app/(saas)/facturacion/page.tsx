import { PageHeader } from '@/components/PageHeader'
import { syntheticPreviewAllowed } from '@/lib/telecom-preview/access'
import { previewCustomers } from '@/lib/telecom-preview/data'
import { Billing } from '@/features/billing/Billing'
export default function InvoicingPage() {
  if (!syntheticPreviewAllowed())
    return (
      <PageHeader
        title="Facturación PRO"
        description="Módulo pendiente de lectura y operaciones autorizadas."
      />
    )
  return (
    <Billing
      customers={previewCustomers.map((c) => ({
        id: c.id,
        name: c.legal_name,
      }))}
    />
  )
}
