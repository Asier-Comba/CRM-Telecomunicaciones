import { PageHeader } from '@/components/PageHeader'
import { Unavailable } from '@/features/product/ui'
export default function BillingSubscriptionPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Suscripción del workspace"
        description="Plan del CRM y facturación de la suscripción"
      />
      <Unavailable title="Suscripción no conectada">
        Facturación PRO gestiona las facturas comerciales. El plan y los cobros
        del propio CRM requieren el contrato de suscripción.
      </Unavailable>
    </div>
  )
}
