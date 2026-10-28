import {StrictMode,useEffect,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {ProductProvider} from '@/features/product/integration/Provider'
import {IntegratedDocuments} from '@/features/documents/IntegratedDocuments'
import {IntegratedDocumentLibrary} from '@/features/documents/IntegratedDocumentLibrary'
import {FolderFixture} from './folder-fixture'
import {readDocumentView} from '@/features/documents/document-navigation'
import type {WorkspaceRole} from '@/lib/workspace-roles'
declare global{interface Window{docsSetScope:(actor:string,workspace:string,role:WorkspaceRole)=>void;crmDocumentsLibraryFixture?:boolean;crmDocumentsStrictFixture?:boolean;crmFolderNavigationFixture?:boolean}}
function Fixture(){
  const [scope,setScope]=useState({actor:'10000000-0000-4000-8000-000000000001',workspace:'20000000-0000-4000-8000-000000000001',role:'owner' as WorkspaceRole})
  const [initial]=useState(()=>readDocumentView(location.search).view)
  const [contentEnabled]=useState(()=>new URLSearchParams(location.search).get('content')==='1')
  useEffect(()=>{window.docsSetScope=(actor,workspace,role)=>setScope({actor,workspace,role})},[])
  return <ProductProvider integrated role={scope.role} actorId={scope.actor} workspaceId={scope.workspace}>{window.crmDocumentsLibraryFixture?<IntegratedDocumentLibrary initialTarget={initial.target??undefined} initialStatus={initial.status}/>:<IntegratedDocuments customerId={initial.target?.kind==='customer'?initial.target.id:undefined} initialView={initial} syncUrl contentEnabled={contentEnabled}/>}</ProductProvider>
}
const content=window.crmFolderNavigationFixture?<FolderFixture/>:<Fixture/>
createRoot(document.getElementById('app')!).render(window.crmDocumentsStrictFixture||new URLSearchParams(location.search).get('strict')==='1'?<StrictMode>{content}</StrictMode>:content)
