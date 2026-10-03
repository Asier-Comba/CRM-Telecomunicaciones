import { PageHeader } from '@/components/PageHeader'
import { syntheticPreviewAllowed } from '@/lib/telecom-preview/access'
import { Portfolio } from '@/features/portfolio/Portfolio'
import { portfolioData } from '@/features/portfolio/projection'
export default function PortfolioPage() {
  if (!syntheticPreviewAllowed())
    return (
      <PageHeader
        title="Cartera Telecom"
        description="Vista sintética no disponible en este entorno."
      />
    )
  return <Portfolio data={portfolioData()} />
}
