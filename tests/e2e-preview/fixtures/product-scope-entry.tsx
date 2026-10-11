import {useState} from 'react'
import {createRoot} from 'react-dom/client'
import {ProductProvider,useProduct} from '../../../src/features/product/integration/Provider'
function Probe(){
 const {display,role}=useProduct(),[draft,setDraft]=useState('')
 return <section><label>Borrador sintético<input aria-label="Borrador sintético" value={draft} onChange={e=>setDraft(e.target.value)}/></label><p data-company>{display?.company??'Identidad pendiente'}</p><p data-person>{display?.name??'Usuario pendiente'}</p><p data-role>{role??'Sin rol'}</p></section>
}
function App(){
 const [workspace,setWorkspace]=useState(false),[actor,setActor]=useState(false),[viewer,setViewer]=useState(false),[integrated,setIntegrated]=useState(true)
 return <><div className="flex flex-wrap gap-2"><button onClick={()=>setWorkspace(v=>!v)}>Cambiar empresa</button><button onClick={()=>setActor(v=>!v)}>Cambiar usuario</button><button onClick={()=>setViewer(v=>!v)}>Cambiar rol</button><button onClick={()=>setIntegrated(v=>!v)}>Cambiar modo</button><button onClick={()=>window.dispatchEvent(new Event('crm-product-display-changed'))}>Actualizar identidad</button></div><ProductProvider integrated={integrated} role={viewer?'viewer':'owner'} actorId={actor?'40000000-0000-4000-8000-000000000002':'40000000-0000-4000-8000-000000000001'} workspaceId={workspace?'50000000-0000-4000-8000-000000000002':'50000000-0000-4000-8000-000000000001'}><Probe/></ProductProvider></>
}
createRoot(document.getElementById('app')!).render(<App/>)
