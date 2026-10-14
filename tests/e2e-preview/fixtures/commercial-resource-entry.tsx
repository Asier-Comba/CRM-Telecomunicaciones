import {useState} from 'react'
import {createRoot} from 'react-dom/client'
import {PortabilityDetail} from '../../../src/features/portabilities/Portabilities'
import {ServiceDetail} from '../../../src/features/services/ServiceDetail'
import {PipelineFixtureProvider} from './pipeline-current-provider'
import {IntegratedPortfolio} from '../../../src/features/portfolio/IntegratedPortfolio'
function Fixture(){
 const [id,setId]=useState('40000000-0000-4000-8000-000000000001')
 const [portfolioReference,setPortfolioReference]=useState(()=>new URLSearchParams(location.search).get('portfolio_reference'))
 const [contextTick,setContextTick]=useState(0)
 const kind=new URLSearchParams(location.search).get('kind')
 if(kind==='portfolio')return <>
  {portfolioReference&&<nav aria-label="Contexto de referencia sintética"><button onClick={()=>setContextTick(t=>t+1)}>Actualizar contexto sintético</button>
   <button onClick={()=>setPortfolioReference('60000000-0000-4000-8000-000000000002')}>Cambiar referencia sintética</button><output aria-label="Versión de contexto sintético">{contextTick}</output></nav>}
  <IntegratedPortfolio key={portfolioReference??'none'} initialReference={portfolioReference?{kind:new URLSearchParams(location.search).get('portfolio_kind')==='service'?'service':'contract',id:portfolioReference}:undefined}/>
 </>
 return <><nav aria-label="Referencia comercial sintética">{['A','B','C','D'].map((name,i)=><button key={name} onClick={()=>setId(`40000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`)}>Seleccionar referencia {name}</button>)}<output aria-label="Referencia comercial actual">{id}</output></nav>{kind==='portability'?<PortabilityDetail id={id}/>:<ServiceDetail id={id}/>}</>
}
createRoot(document.getElementById('app')!).render(<PipelineFixtureProvider><Fixture/></PipelineFixtureProvider>)
