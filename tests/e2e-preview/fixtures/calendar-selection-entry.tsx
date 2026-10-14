import {createRoot} from 'react-dom/client'
import {IntegratedCalendar} from '../../../src/features/calendar/IntegratedCalendar'
import {PipelineFixtureProvider} from './pipeline-current-provider'
const params=new URLSearchParams(location.search),kind=params.get('kind'),edit=params.get('edit')==='true'
const id='50000000-0000-4000-8000-000000000002'
createRoot(document.getElementById('app')!).render(<PipelineFixtureProvider><IntegratedCalendar
 customerId={kind?'10000000-0000-4000-8000-000000000001':undefined}
 initialCreate={!edit&&(kind==='task'||kind==='meeting')?kind:undefined}
 initialTaskId={edit&&kind==='task'?id:undefined} initialMeetingId={edit&&kind==='meeting'?id:undefined}
/></PipelineFixtureProvider>)
