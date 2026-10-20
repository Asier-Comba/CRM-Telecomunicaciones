import {createRoot} from 'react-dom/client'
import {ProductProvider} from '../../../src/features/product/integration/Provider'
import {IntegratedDashboard} from '../../../src/features/dashboard/IntegratedDashboard'
import type {WorkspaceRole} from '../../../src/lib/workspace-roles'
const requested=new URLSearchParams(location.search).get('role')
const role:WorkspaceRole=requested==='admin'||requested==='member'||requested==='viewer'?requested:'owner'
createRoot(document.getElementById('app')!).render(<ProductProvider integrated role={role} actorId="40000000-0000-4000-8000-000000000001" workspaceId="50000000-0000-4000-8000-000000000001"><IntegratedDashboard/></ProductProvider>)
