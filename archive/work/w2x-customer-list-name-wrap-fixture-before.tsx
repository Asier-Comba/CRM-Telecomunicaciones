import {IntegratedAttention} from '../../../src/features/attention/IntegratedAttention'
import {useCallback,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {IntegratedCustomerDetail} from '../../../src/features/customers/IntegratedCustomerDetail'
import {CustomerDocuments} from '../../../src/features/customers/CustomerDocuments'
import {CustomerEditor} from '../../../src/features/customers/CustomerEditor'
import {Customer360Overview} from '../../../src/features/customers/Customer360Overview'
import {IntegratedDashboard} from '../../../src/features/dashboard/IntegratedDashboard'
import {AuthorizedCustomerContext} from '../../../src/features/assistant/AuthorizedCustomerContext'
import {CaseDetail,CaseInventory} from '../../../src/features/cases/Cases'
import {DocumentUpload} from '../../../src/features/documents/DocumentUpload'
import {DocumentCleanup} from '../../../src/features/documents/DocumentMaintenance'
import {IntegratedDocuments} from '../../../src/features/documents/IntegratedDocuments'
import {ImportJobs} from '../../../src/features/portfolio/ImportJobs'
import {CustomerLinesInventory} from '../../../src/features/portfolio/CustomerLinesInventory'
import {CustomerRenewalsInventory} from '../../../src/features/portfolio/CustomerRenewalsInventory'
import {CustomerPermanencesInventory} from '../../../src/features/portfolio/CustomerPermanencesInventory'
import {PipelineFixtureProvider} from './pipeline-current-provider'
function Fixture(){
 const [id,setId]=useState('10000000-0000-4000-8000-000000000001'),[denials,setDenials]=useState(0)
 const deny=useCallback(()=>setDenials(n=>n+1),[])
 const kind=new URLSearchParams(location.search).get('kind')
 const [newOpen,setNewOpen]=useState(true),[saved,setSaved]=useState(false)
 const [uploadOpen,setUploadOpen]=useState(true),[uploadSaved,setUploadSaved]=useState(false)
 if(kind==='contract-followup-lifetime'){const Inventory=new URLSearchParams(location.search).get('flow')==='renewal'?CustomerRenewalsInventory:CustomerPermanencesInventory;return <><button onClick={()=>setNewOpen(false)}>Cerrar seguimiento sintético</button>{newOpen?<Inventory customer={{id,version:1,display_name:'Cliente sintético A',account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}} createAllowed/>:<p>Seguimiento sintético cerrado</p>}</>}
 if(kind==='line-parent-lifetime')return <><button onClick={()=>setNewOpen(false)}>Cerrar inventario sintético</button>{newOpen?<CustomerLinesInventory customer={{id,version:1,display_name:'Cliente sintético A',account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}} createAllowed/>:<p>Inventario sintético cerrado</p>}</>
 if(kind==='attention-context')return <IntegratedAttention {...{initialCustomerId:new URLSearchParams(location.search).get('customer')??undefined}}/>
 if(kind==='dashboard-current-day')return <IntegratedDashboard/>
 if(kind==='cleanup')return uploadOpen?<DocumentCleanup onClose={()=>setUploadOpen(false)}/>:<p>Panel de limpieza cerrado</p>
 if(kind==='documents')return <IntegratedDocuments customerId={id}/>
 if(kind==='customer-document-targets')return <CustomerDocuments customerId={id}/>
 if(kind==='documents-integrity'||kind==='documents-integrity-lifetime')return <IntegratedDocuments customerId={id} contentEnabled maintenanceEnabled/>
 if(kind==='imports')return <ImportJobs/>
 if(kind==='new-customer')return <>{saved&&<p role="status">Cliente sintético confirmado</p>}{newOpen?<CustomerEditor onClose={()=>setNewOpen(false)} onSaved={()=>{setSaved(true);setNewOpen(false)}}/>:<button onClick={()=>setNewOpen(true)}>Nuevo cliente sintético</button>}</>
 if(kind==='upload')return <>{uploadSaved&&<p role="status">Documento sintético confirmado</p>}{uploadOpen?<DocumentUpload customerId={id} onClose={()=>setUploadOpen(false)} onSaved={async()=>setUploadSaved(true)}/>:<button onClick={()=>setUploadOpen(true)}>Nueva subida sintética</button>}</>
 return <><nav aria-label="Cliente sintético seleccionado">{['A','B','C','D'].map((name,i)=><button key={name} onClick={()=>setId(`10000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`)}>Seleccionar cliente {name}</button>)}<output aria-label="Referencia sintética actual">{id}</output><output aria-label="Avisos de acceso">{denials}</output></nav>{kind==='case-create'?<CaseInventory customerId={id} createAllowed/>:kind==='case'?<CaseDetail id={id}/>:kind==='context'?<AuthorizedCustomerContext id={id} onAccessDenied={deny}/>:kind==='overview'?<Customer360Overview customerId={id} onAccessDenied={deny}/>:<IntegratedCustomerDetail id={id}/>}</>
}
createRoot(document.getElementById('app')!).render(<PipelineFixtureProvider resetOnScopeChange={['documents-integrity-lifetime','line-parent-lifetime','contract-followup-lifetime'].includes(new URLSearchParams(location.search).get('kind')??'')}><Fixture/></PipelineFixtureProvider>)
