import {useEffect,useState} from 'react'
import {FolderNavigation,type FolderChoice,type FolderNavigationNode,type FolderNavigationView} from '@/features/documents/FolderNavigation'
type State={scope:string;role:string;view:FolderNavigationView;locked:boolean}
declare global{interface Window{folderFixtureSetState:(patch:Partial<State>)=>void}}
const nodes:FolderNavigationNode[]=[{id:'commercial',label:'Comercial',hasChildren:true,expanded:false,childrenState:'ready',children:[{id:'contracts',label:'Contratos',hasChildren:false,expanded:false,children:[],childrenState:'ready'},{id:'invoices',label:'Facturas',hasChildren:false,expanded:false,children:[],childrenState:'ready'}]},{id:'operations',label:'Operaciones',hasChildren:false,expanded:false,children:[],childrenState:'ready'}]
function change(items:readonly FolderNavigationNode[],id:string,expanded:boolean):FolderNavigationNode[]{return items.map(node=>({...node,expanded:node.id===id?expanded:node.expanded,children:change(node.children,id,expanded)}))}
export function FolderFixture(){
 const [state,setState]=useState<State>({scope:'synthetic-A',role:'owner',locked:false,view:{scope:'synthetic-A',status:'ready',nodes,breadcrumbs:[],selected:{kind:'all'},partial:false,hasMore:false}}),[last,setLast]=useState('')
 useEffect(()=>{window.folderFixtureSetState=patch=>setState(value=>({...value,...patch}))},[])
 function select(choice:FolderChoice){setLast(JSON.stringify({action:'select',choice}));setState(value=>({...value,view:value.view.status==='ready'?{...value.view,selected:choice}:value.view}))}
 return <div className="max-w-xl rounded-xl border border-slate-200 bg-white p-4"><h1 className="mb-4 font-semibold">Carpetas · presentación controlada, sin persistencia</h1><FolderNavigation {...state} onSelect={select} onToggle={(id,expanded)=>{setLast(JSON.stringify({action:'toggle',id,expanded}));setState(value=>({...value,view:value.view.status==='ready'?{...value.view,nodes:change(value.view.nodes,id,expanded)}:value.view}))}} onMore={()=>setLast('more')} onRetry={()=>setLast('retry')} onRetryChildren={id=>setLast('retry-children:'+id)}/><output aria-label="Última acción" className="mt-4 block break-words text-xs">{last}</output></div>
}
