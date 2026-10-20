import {useCallback,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {IntegratedCustomerDetail} from '../../../src/features/customers/IntegratedCustomerDetail'
import {CustomerEditor} from '../../../src/features/customers/CustomerEditor'
import {Customer360Overview} from '../../../src/features/customers/Customer360Overview'
import {AuthorizedCustomerContext} from '../../../src/features/assistant/AuthorizedCustomerContext'
import {CaseDetail} from '../../../src/features/cases/Cases'
import {PipelineFixtureProvider} from './pipeline-current-provider'
function Fixture(){
 const [id,setId]=useState('10000000-0000-4000-8000-000000000001'),[denials,setDenials]=useState(0)
 const deny=useCallback(()=>setDenials(n=>n+1),[])
 const kind=new URLSearchParams(location.search).get('kind')
 const [newOpen,setNewOpen]=useState(true),[saved,setSaved]=useState(false)
 if(kind==='new-customer')return <>{saved&&<p role="status">Cliente sintético confirmado</p>}{newOpen?<CustomerEditor onClose={()=>setNewOpen(false)} onSaved={()=>{setSaved(true);setNewOpen(false)}}/>:<button onClick={()=>setNewOpen(true)}>Nuevo cliente sintético</button>}</>
 return <><nav aria-label="Cliente sintético seleccionado">{['A','B','C','D'].map((name,i)=><button key={name} onClick={()=>setId(`10000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`)}>Seleccionar cliente {name}</button>)}<output aria-label="Referencia sintética actual">{id}</output><output aria-label="Avisos de acceso">{denials}</output></nav>{kind==='case'?<CaseDetail id={id}/>:kind==='context'?<AuthorizedCustomerContext id={id} onAccessDenied={deny}/>:kind==='overview'?<Customer360Overview customerId={id} onAccessDenied={deny}/>:<IntegratedCustomerDetail id={id}/>}</>
}
createRoot(document.getElementById('app')!).render(<PipelineFixtureProvider><Fixture/></PipelineFixtureProvider>)
