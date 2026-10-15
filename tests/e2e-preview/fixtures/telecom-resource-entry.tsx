import {useState} from 'react'
import {createRoot} from 'react-dom/client'
import {CaseDetail} from '../../../src/features/cases/Cases'
import {SimDetail} from '../../../src/features/sims/Sims'
import {PipelineFixtureProvider} from './pipeline-current-provider'
function Fixture(){
 const [id,setId]=useState('40000000-0000-4000-8000-000000000001')
 const kind=new URLSearchParams(location.search).get('kind')
 return <><nav aria-label="Recurso sintético seleccionado">{['A','B','C','D'].map((name,i)=><button key={name} onClick={()=>setId(`40000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`)}>Seleccionar recurso {name}</button>)}<output aria-label="Referencia de recurso actual">{id}</output></nav>{kind==='case'?<CaseDetail id={id}/>:<SimDetail id={id}/>}</>
}
createRoot(document.getElementById('app')!).render(<PipelineFixtureProvider resetOnScopeChange={new URLSearchParams(location.search).get('reset_scope')==='1'}><Fixture/></PipelineFixtureProvider>)
