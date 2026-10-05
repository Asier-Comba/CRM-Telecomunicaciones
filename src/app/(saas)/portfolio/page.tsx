import { integratedLocalAllowed } from '@/features/product/integration/mode'
import { IntegratedPortfolio } from '@/features/portfolio/IntegratedPortfolio'
import { PageHeader } from '@/components/PageHeader'
import { syntheticPreviewAllowed } from '@/lib/telecom-preview/access'
import { Portfolio } from '@/features/portfolio/Portfolio'
import { portfolioData } from '@/features/portfolio/projection'
export default function PortfolioPage() {
  if (integratedLocalAllowed()) return <IntegratedPortfolio />
  if (!syntheticPreviewAllowed())
    return (
      <PageHeader
        title="Cartera Telecom"
        description="Vista sintética no disponible en este entorno."
      />
    )
  return <Portfolio data={portfolioData()} />
}
