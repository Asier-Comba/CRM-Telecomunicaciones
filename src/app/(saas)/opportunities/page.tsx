import { PageHeader } from '@/components/PageHeader'
import { syntheticPreviewAllowed } from '@/lib/telecom-preview/access'
import { previewOpportunities } from '@/lib/telecom-preview/data'
import { Opportunities } from '@/features/opportunities/Opportunities'
export default function OpportunitiesPage() {
  if (!syntheticPreviewAllowed())
    return (
      <PageHeader
        title="Oportunidades"
        description="Vista sintética no disponible en este entorno."
      />
    )
  return <Opportunities items={previewOpportunities} />
}
