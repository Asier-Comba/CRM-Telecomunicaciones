import {createRoot} from 'react-dom/client'
import {IntegratedCalendar} from '../../../src/features/calendar/IntegratedCalendar'
import {PipelineFixtureProvider} from './pipeline-current-provider'
createRoot(document.getElementById('app')!).render(<PipelineFixtureProvider><IntegratedCalendar/></PipelineFixtureProvider>)
