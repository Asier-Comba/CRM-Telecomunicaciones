import {createRoot} from 'react-dom/client'
import {IntegratedOpportunities} from '../../../src/features/opportunities/IntegratedOpportunities'
import {PipelineFixtureProvider} from './pipeline-current-provider'
const params=new URLSearchParams(location.hash.slice(1))
createRoot(document.getElementById('app')!).render(<PipelineFixtureProvider><IntegratedOpportunities initialCreate={params.get('create')==='true'} initialId={params.get('edit')==='true'?'30000000-0000-4000-8000-000000000001':undefined}/></PipelineFixtureProvider>)
