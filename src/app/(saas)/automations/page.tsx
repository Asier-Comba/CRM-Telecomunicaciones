import { PageHeader } from '@/components/PageHeader'
import { syntheticPreviewAllowed } from '@/lib/telecom-preview/access'
import {integratedLocalAllowed} from '@/features/product/integration/mode'
import {IntegratedAutomations} from '@/features/automations/IntegratedAutomations'
import { Automations } from '@/features/automations/Automations'
export default function AutomationsPage() {
  if(integratedLocalAllowed())return <IntegratedAutomations/>
  if (!syntheticPreviewAllowed())
    return (
      <PageHeader
        title="Automatizaciones"
        description="Flujos pendientes de contrato autorizado e integración."
      />
    )
  return <Automations />
}
