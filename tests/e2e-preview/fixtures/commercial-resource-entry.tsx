import {useState} from 'react'
import {createRoot} from 'react-dom/client'
import {PortabilityDetail} from '../../../src/features/portabilities/Portabilities'
import {ServiceDetail} from '../../../src/features/services/ServiceDetail'
import {PipelineFixtureProvider} from './pipeline-current-provider'
import {IntegratedPortfolio} from '../../../src/features/portfolio/IntegratedPortfolio'
function Fixture(){
 const [id,setId]=useState('40000000-0000-4000-8000-000000000001')
 const kind=new URLSearchParams(location.search).get('kind')
 if(kind==='portfolio')return <IntegratedPortfolio/>
 return <><nav aria-label="Referencia comercial sintética">{['A','B','C','D'].map((name,i)=><button key={name} onClick={()=>setId(`40000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`)}>Seleccionar referencia {name}</button>)}<output aria-label="Referencia comercial actual">{id}</output></nav>{kind==='portability'?<PortabilityDetail id={id}/>:<ServiceDetail id={id}/>}</>
}
createRoot(document.getElementById('app')!).render(<PipelineFixtureProvider><Fixture/></PipelineFixtureProvider>)
