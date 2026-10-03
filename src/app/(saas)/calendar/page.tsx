import { PageHeader } from '@/components/PageHeader'
import { syntheticPreviewAllowed } from '@/lib/telecom-preview/access'
import { PREVIEW_AS_OF } from '@/lib/telecom-preview/metadata'
import { calendarEntries } from '@/features/product/projections'
import { Calendar } from '@/features/calendar/Calendar'
export default function CalendarPage(){
  if (!syntheticPreviewAllowed()) return <PageHeader title="Calendario y tareas" description="Vista sintética no disponible en este entorno."/>
  return <Calendar entries={calendarEntries()} asOf={PREVIEW_AS_OF}/>
}
