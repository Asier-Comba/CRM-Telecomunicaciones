import {useState} from 'react'
import {createRoot} from 'react-dom/client'
import {CustomerDomainPages} from '../../../src/features/customers/CustomerDomainPages'
import {PipelineFixtureProvider} from './pipeline-current-provider'
function Fixture(){
 const [customerId,setCustomerId]=useState('10000000-0000-4000-8000-000000000001')
 return <><nav aria-label="Cliente de la colección sintética">{['A','B','C','D'].map((name,i)=><button key={name} onClick={()=>setCustomerId(`10000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`)}>Seleccionar colección {name}</button>)}</nav><CustomerDomainPages area="Servicios" customerId={customerId}/></>
}
createRoot(document.getElementById('app')!).render(<PipelineFixtureProvider><Fixture/></PipelineFixtureProvider>)
