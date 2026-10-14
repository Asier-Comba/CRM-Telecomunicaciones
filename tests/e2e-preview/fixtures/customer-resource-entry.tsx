import {useCallback,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {IntegratedCustomerDetail} from '../../../src/features/customers/IntegratedCustomerDetail'
import {CustomerEditor} from '../../../src/features/customers/CustomerEditor'
import {Customer360Overview} from '../../../src/features/customers/Customer360Overview'
import {AuthorizedCustomerContext} from '../../../src/features/assistant/AuthorizedCustomerContext'
import {DocumentUpload} from '../../../src/features/documents/DocumentUpload'
import {DocumentCleanup} from '../../../src/features/documents/DocumentMaintenance'
import {IntegratedDocuments} from '../../../src/features/documents/IntegratedDocuments'
import {PipelineFixtureProvider} from './pipeline-current-provider'
function Fixture(){
 const [id,setId]=useState('10000000-0000-4000-8000-000000000001'),[denials,setDenials]=useState(0)
 const deny=useCallback(()=>setDenials(n=>n+1),[])
 const kind=new URLSearchParams(location.search).get('kind')
 const [newOpen,setNewOpen]=useState(true),[saved,setSaved]=useState(false)
 const [uploadOpen,setUploadOpen]=useState(true),[uploadSaved,setUploadSaved]=useState(false)
 if(kind==='cleanup')return uploadOpen?<DocumentCleanup onClose={()=>setUploadOpen(false)}/>:<p>Panel de limpieza cerrado</p>
 if(kind==='documents')return <IntegratedDocuments customerId={id}/>
 if(kind==='new-customer')return <>{saved&&<p role="status">Cliente sintético confirmado</p>}{newOpen?<CustomerEditor onClose={()=>setNewOpen(false)} onSaved={()=>{setSaved(true);setNewOpen(false)}}/>:<button onClick={()=>setNewOpen(true)}>Nuevo cliente sintético</button>}</>
 if(kind==='upload')return <>{uploadSaved&&<p role="status">Documento sintético confirmado</p>}{uploadOpen?<DocumentUpload customerId={id} onClose={()=>setUploadOpen(false)} onSaved={async()=>setUploadSaved(true)}/>:<button onClick={()=>setUploadOpen(true)}>Nueva subida sintética</button>}</>
 return <><nav aria-label="Cliente sintético seleccionado">{['A','B','C','D'].map((name,i)=><button key={name} onClick={()=>setId(`10000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`)}>Seleccionar cliente {name}</button>)}<output aria-label="Referencia sintética actual">{id}</output><output aria-label="Avisos de acceso">{denials}</output></nav>{kind==='context'?<AuthorizedCustomerContext id={id} onAccessDenied={deny}/>:kind==='overview'?<Customer360Overview customerId={id} onAccessDenied={deny}/>:<IntegratedCustomerDetail id={id}/>}</>
}
createRoot(document.getElementById('app')!).render(<PipelineFixtureProvider><Fixture/></PipelineFixtureProvider>)
