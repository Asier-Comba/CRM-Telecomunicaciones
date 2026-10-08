import { integratedLocalAllowed } from '@/features/product/integration/mode'
import { IntegratedPortfolio } from '@/features/portfolio/IntegratedPortfolio'
import { PageHeader } from '@/components/PageHeader'
import { syntheticPreviewAllowed } from '@/lib/telecom-preview/access'
import { Portfolio } from '@/features/portfolio/Portfolio'
import { portfolioData } from '@/features/portfolio/projection'
export default async function PortfolioPage({searchParams}:{searchParams:Promise<{kind?:string;id?:string}>}) {
  if (integratedLocalAllowed()){const p=await searchParams;const kind=['contract','service','line','renewal','permanence'].includes(p.kind??'')?p.kind as import('@/lib/contracts/portfolio-v1').PortfolioKindV1:null;const id=p.id&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id)?p.id:null;return <IntegratedPortfolio key={`${kind}:${id}`} initialReference={kind&&id?{kind,id}:undefined}/>}
  if (!syntheticPreviewAllowed())
    return (
      <PageHeader
        title="Cartera Telecom"
        description="Vista sintética no disponible en este entorno."
      />
    )
  return <Portfolio data={portfolioData()} />
}
