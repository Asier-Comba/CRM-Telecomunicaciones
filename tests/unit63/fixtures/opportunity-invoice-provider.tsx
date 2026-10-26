import {createContext,useContext,useEffect,useState,type ReactNode} from 'react'
import {IntegratedLocalProductRepository} from '../../../src/features/product/integration/repository'
import type {WorkspaceRole} from '../../../src/lib/workspace-roles'
const repository=new IntegratedLocalProductRepository()
const Context=createContext({repository,role:'owner' as WorkspaceRole,actorId:'40000000-0000-4000-8000-000000000001',workspaceId:'50000000-0000-4000-8000-000000000001'})
declare global{interface Window{__opportunityScope?:(kind:string)=>void}}
export function OpportunityInvoiceProvider({children}:{children:ReactNode}){
 const [role,setRole]=useState<WorkspaceRole>(()=>{const value=new URLSearchParams(location.search).get('role');return value==='admin'||value==='member'||value==='viewer'?value:'owner'}),[actor,setActor]=useState(false),[workspace,setWorkspace]=useState(false)
 useEffect(()=>{window.__opportunityScope=kind=>{if(kind==='actor')setActor(v=>!v);else if(kind==='workspace')setWorkspace(v=>!v);else if(['owner','admin','member','viewer'].includes(kind))setRole(kind as WorkspaceRole)};return()=>{delete window.__opportunityScope}},[])
 return <Context.Provider value={{repository,role,actorId:actor?'40000000-0000-4000-8000-000000000002':'40000000-0000-4000-8000-000000000001',workspaceId:workspace?'50000000-0000-4000-8000-000000000002':'50000000-0000-4000-8000-000000000001'}}>{children}</Context.Provider>
}
export function useProduct(){return useContext(Context)}
