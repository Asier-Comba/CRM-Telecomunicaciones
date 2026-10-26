import { PageHeader } from '@/components/PageHeader'
import { syntheticPreviewAllowed } from '@/lib/telecom-preview/access'
import { previewOpportunities } from '@/lib/telecom-preview/data'
import { Opportunities } from '@/features/opportunities/Opportunities'
import { integratedProductAllowed } from '@/features/product/integration/mode'
import { IntegratedOpportunities } from '@/features/opportunities/IntegratedOpportunities'
export default async function OpportunitiesPage({searchParams}:{searchParams:Promise<{create?:string;open?:string;invoice?:string}>}) {
  if(integratedProductAllowed()){const {create,open,invoice}=await searchParams;return <IntegratedOpportunities key={open??create??'list'} initialId={open&&/^[0-9a-f-]{36}$/i.test(open)?open:undefined} initialCreate={create==='1'} relatedInvoiceId={typeof invoice==='string'&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(invoice)?invoice:undefined}/>}
  if (!syntheticPreviewAllowed())
    return (
      <PageHeader
        title="Oportunidades"
        description="Vista sintética no disponible en este entorno."
      />
    )
  return <Opportunities items={previewOpportunities} />
}
