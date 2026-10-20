import {createRoot} from 'react-dom/client'
import {useState} from 'react'
import {IntegratedDocuments} from '../../src/features/documents/IntegratedDocuments'
import {PipelineFixtureProvider} from '../../tests/e2e-preview/fixtures/pipeline-current-provider'
const customerA='10000000-0000-4000-8000-000000000001',customerB='10000000-0000-4000-8000-000000000002',contractB='60000000-0000-4000-8000-000000000002'
function ContextFixture(){
 const [next,setNext]=useState(false),[tick,setTick]=useState(0)
 const controls=new URLSearchParams(location.search).get('context_controls')==='1'
 const explicit=new URLSearchParams(location.search).get('explicit_target')==='1'
 return <><div hidden={!controls}><button onClick={()=>setNext(true)}>Cambiar contexto documental sintético</button><button onClick={()=>setTick(v=>v+1)}>Actualizar contexto documental sintético</button><output aria-label="Versión de contexto documental sintético">{tick}</output></div><IntegratedDocuments customerId={next?customerB:customerA} initialTarget={explicit?{kind:next?'contract':'customer',id:next?contractB:customerA,label:next?'Contrato sintético B':'Empresa sintética A'}:undefined}/></>
}
createRoot(document.getElementById('app')!).render(<PipelineFixtureProvider><ContextFixture/></PipelineFixtureProvider>)
