import { PageHeader } from '@/components/PageHeader'
import { syntheticPreviewAllowed } from '@/lib/telecom-preview/access'
import { previewOpportunities } from '@/lib/telecom-preview/data'
import { Opportunities } from '@/features/opportunities/Opportunities'
import { integratedLocalAllowed } from '@/features/product/integration/mode'
import { IntegratedOpportunities } from '@/features/opportunities/IntegratedOpportunities'
export default function OpportunitiesPage() {
  if(integratedLocalAllowed())return <IntegratedOpportunities/>
  if (!syntheticPreviewAllowed())
    return (
      <PageHeader
        title="Oportunidades"
        description="Vista sintética no disponible en este entorno."
      />
    )
  return <Opportunities items={previewOpportunities} />
}
