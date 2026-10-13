import {createRoot} from 'react-dom/client'
import {IntegratedInbox} from '../../../src/features/inbox/IntegratedInbox'
import {PipelineFixtureProvider} from './pipeline-current-provider'
createRoot(document.getElementById('app')!).render(<PipelineFixtureProvider><IntegratedInbox initialId="10000000-0000-4000-8000-000000000001"/></PipelineFixtureProvider>)
