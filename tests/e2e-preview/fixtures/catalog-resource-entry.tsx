import {useState} from 'react'
import {createRoot} from 'react-dom/client'
import {IntegratedCatalog,VersionTerms} from '../../../src/features/catalog/IntegratedCatalog'
import {PipelineFixtureProvider} from './pipeline-current-provider'
function Fixture(){
 const [id,setId]=useState('40000000-0000-4000-8000-000000000001'),[open,setOpen]=useState(true)
 return <><nav aria-label="Versión comercial sintética">{['A','B','C','D'].map((name,i)=><button key={name} onClick={()=>setId(`40000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`)}>Seleccionar versión {name}</button>)}</nav>{open?<VersionTerms id={id} onClose={()=>setOpen(false)}/>:<p role="status">Condiciones cerradas</p>}</>
}
createRoot(document.getElementById('app')!).render(<PipelineFixtureProvider>{(location.pathname==='/catalog'||new URLSearchParams(location.search).get('qa_catalog')==='1')?<IntegratedCatalog initialOperatorId={new URLSearchParams(location.search).get('operator')??undefined}/>:<Fixture/>}</PipelineFixtureProvider>)
