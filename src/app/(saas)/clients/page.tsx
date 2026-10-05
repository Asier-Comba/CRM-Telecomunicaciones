import { PageHeader } from '@/components/PageHeader'
import { syntheticPreviewAllowed } from '@/lib/telecom-preview/access'
import { Customers } from '@/features/customers/Customers'
import { customerRows } from '@/features/product/projections'
import { integratedLocalAllowed } from '@/features/product/integration/mode'
import { IntegratedCustomers } from '@/features/customers/IntegratedCustomers'
export default async function ClientsPage({searchParams}:{searchParams:Promise<{create?:string}>}) {
  if (integratedLocalAllowed()) return <IntegratedCustomers key={(await searchParams).create??'list'} initialCreate={(await searchParams).create==='1'} />
  if (!syntheticPreviewAllowed())
    return (
      <PageHeader
        title="Clientes"
        description="Vista sintética no disponible en este entorno."
      />
    )
  return <Customers rows={customerRows()} />
}
