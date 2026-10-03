import { PageHeader } from '@/components/PageHeader'
import { syntheticPreviewAllowed } from '@/lib/telecom-preview/access'
import { Automations } from '@/features/automations/Automations'
export default function AutomationsPage() {
  if (!syntheticPreviewAllowed())
    return (
      <PageHeader
        title="Automatizaciones"
        description="Flujos pendientes de contrato autorizado e integración."
      />
    )
  return <Automations />
}
