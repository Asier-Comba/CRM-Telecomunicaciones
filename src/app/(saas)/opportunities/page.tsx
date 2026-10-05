import { PageHeader } from '@/components/PageHeader'
import { syntheticPreviewAllowed } from '@/lib/telecom-preview/access'
import { previewOpportunities } from '@/lib/telecom-preview/data'
import { Opportunities } from '@/features/opportunities/Opportunities'
import { integratedLocalAllowed } from '@/features/product/integration/mode'
import { IntegratedOpportunities } from '@/features/opportunities/IntegratedOpportunities'
export default async function OpportunitiesPage({searchParams}:{searchParams:Promise<{create?:string}>}) {
  if(integratedLocalAllowed())return <IntegratedOpportunities key={(await searchParams).create??'list'} initialCreate={(await searchParams).create==='1'}/>
  if (!syntheticPreviewAllowed())
    return (
      <PageHeader
        title="Oportunidades"
        description="Vista sintética no disponible en este entorno."
      />
    )
  return <Opportunities items={previewOpportunities} />
}
