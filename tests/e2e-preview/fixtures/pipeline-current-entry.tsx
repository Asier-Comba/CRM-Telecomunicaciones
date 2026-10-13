import {createRoot} from 'react-dom/client'
import {IntegratedOpportunities} from '../../../src/features/opportunities/IntegratedOpportunities'
import {PipelineFixtureProvider} from './pipeline-current-provider'
createRoot(document.getElementById('app')!).render(<PipelineFixtureProvider><IntegratedOpportunities/></PipelineFixtureProvider>)
