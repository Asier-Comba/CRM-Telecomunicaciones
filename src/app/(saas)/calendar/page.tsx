import { PageHeader } from '@/components/PageHeader'
import { syntheticPreviewAllowed } from '@/lib/telecom-preview/access'
import { PREVIEW_AS_OF } from '@/lib/telecom-preview/metadata'
import { calendarEntries } from '@/features/product/projections'
import { Calendar } from '@/features/calendar/Calendar'
import { integratedLocalAllowed } from '@/features/product/integration/mode'
import { IntegratedCalendar } from '@/features/calendar/IntegratedCalendar'
export default async function CalendarPage({searchParams}:{searchParams:Promise<{create?:string;task?:string;meeting?:string}>}) {
  if(integratedLocalAllowed()){const {create,task,meeting}=await searchParams;return <IntegratedCalendar key={task??meeting??create??'list'} initialTaskId={task&&/^[0-9a-f-]{36}$/i.test(task)?task:undefined} initialMeetingId={meeting&&/^[0-9a-f-]{36}$/i.test(meeting)?meeting:undefined} initialCreate={create==='task'||create==='meeting'?create:undefined}/>}
  if (!syntheticPreviewAllowed())
    return (
      <PageHeader
        title="Calendario y tareas"
        description="Vista sintética no disponible en este entorno."
      />
    )
  return <Calendar entries={calendarEntries()} asOf={PREVIEW_AS_OF} />
}
