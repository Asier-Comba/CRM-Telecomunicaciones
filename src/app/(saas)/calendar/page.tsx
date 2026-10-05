import { PageHeader } from '@/components/PageHeader'
import { syntheticPreviewAllowed } from '@/lib/telecom-preview/access'
import { PREVIEW_AS_OF } from '@/lib/telecom-preview/metadata'
import { calendarEntries } from '@/features/product/projections'
import { Calendar } from '@/features/calendar/Calendar'
import { integratedLocalAllowed } from '@/features/product/integration/mode'
import { IntegratedCalendar } from '@/features/calendar/IntegratedCalendar'
export default async function CalendarPage({searchParams}:{searchParams:Promise<{create?:string}>}) {
  if(integratedLocalAllowed()){const {create}=await searchParams;return <IntegratedCalendar key={create??'list'} initialCreate={create==='task'||create==='meeting'?create:undefined}/>}
  if (!syntheticPreviewAllowed())
    return (
      <PageHeader
        title="Calendario y tareas"
        description="Vista sintética no disponible en este entorno."
      />
    )
  return <Calendar entries={calendarEntries()} asOf={PREVIEW_AS_OF} />
}
