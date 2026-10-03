import { PageHeader } from '@/components/PageHeader'
import { syntheticPreviewAllowed } from '@/lib/telecom-preview/access'
import { Dashboard } from '@/features/dashboard/Dashboard'
import { customerRows, calendarEntries } from '@/features/product/projections'
import {
  previewContracts,
  previewServices,
  previewLines,
  previewOpportunities,
  previewActivities,
  PREVIEW_AS_OF,
} from '@/lib/telecom-preview/data'
export default function DashboardPage() {
  if (!syntheticPreviewAllowed())
    return (
      <PageHeader
        title="Dashboard telecom"
        description="Vista sintética no disponible en este entorno."
      />
    )
  return (
    <Dashboard
      data={{
        customers: customerRows(),
        contracts: previewContracts,
        services: previewServices,
        lines: previewLines,
        opportunities: previewOpportunities,
        activity: previewActivities,
        events: calendarEntries(),
        asOf: PREVIEW_AS_OF,
      }}
    />
  )
}
