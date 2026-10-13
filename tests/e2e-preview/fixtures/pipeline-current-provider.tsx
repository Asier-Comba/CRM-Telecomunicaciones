import {createContext,useContext,useState,type ReactNode} from 'react'
import {IntegratedLocalProductRepository} from '../../../src/features/product/integration/repository'
const repository=new IntegratedLocalProductRepository()
const Context=createContext<{repository:IntegratedLocalProductRepository;role:'owner'|'viewer';actorId:string;workspaceId:string}>({repository,role:'owner',actorId:'40000000-0000-4000-8000-000000000001',workspaceId:'50000000-0000-4000-8000-000000000001'})
// Test binding changes only the supplied scope. Actual repository/parsers remain.
export function PipelineFixtureProvider({children}:{children:ReactNode}){
 const [other,setOther]=useState(false),[otherActor,setOtherActor]=useState(false),[viewer,setViewer]=useState(false)
 return <Context.Provider value={{repository,role:viewer?'viewer':'owner',actorId:otherActor?'40000000-0000-4000-8000-000000000002':'40000000-0000-4000-8000-000000000001',workspaceId:other?'50000000-0000-4000-8000-000000000002':'50000000-0000-4000-8000-000000000001'}}><div className="mb-4 flex flex-wrap gap-2"><button onClick={()=>setOther(v=>!v)}>Cambiar empresa sintética</button><button onClick={()=>setOtherActor(v=>!v)}>Cambiar actor sintético</button><button onClick={()=>setViewer(v=>!v)}>Cambiar a lector sintético</button><span>{other?'Empresa sintética B':'Empresa sintética A'}</span></div>{children}</Context.Provider>
}
export function useProduct(){return useContext(Context)}
