// Presentational child of the existing client boundary. No data client,
// persistence or product-route integration until D2 ownership/contract agrees.
import {useId,useRef,useState} from 'react'
import {ChevronRight,Folder,FolderOpen} from 'lucide-react'
import {control} from '@/features/product/ui'

export type FolderChoice={kind:'all'}|{kind:'unclassified'}|{kind:'folder';id:string}
export type FolderNavigationNode={id:string;label:string;hasChildren:boolean;expanded:boolean;children:readonly FolderNavigationNode[];childrenState:'ready'|'loading'|'unavailable'}
export type FolderNavigationView={scope:string;status:'loading'|'unavailable'|'denied'}|{scope:string;status:'ready';nodes:readonly FolderNavigationNode[];breadcrumbs:readonly{id:string;label:string}[];selected:FolderChoice;partial:boolean;hasMore:boolean}
type Props={scope:string;role:string;view:FolderNavigationView;locked?:boolean;onSelect:(choice:FolderChoice)=>void;onToggle:(id:string,expanded:boolean)=>void;onMore:()=>void;onRetry:()=>void;onRetryChildren:(id:string)=>void}
function validView(view:Extract<FolderNavigationView,{status:'ready'}>){
 const ids=new Set<string>();let count=0
 const label=(value:string)=>typeof value==='string'&&value.trim().length>0&&value.length<=80
 const id=(value:string)=>typeof value==='string'&&value.length>0&&value.length<=120
 function nodes(items:readonly FolderNavigationNode[],depth:number):boolean{
  if(!Array.isArray(items)||depth>8)return false
  return items.every(node=>{
   if(!node||!id(node.id)||ids.has(node.id)||!label(node.label)||typeof node.hasChildren!=='boolean'||typeof node.expanded!=='boolean'||!['ready','loading','unavailable'].includes(node.childrenState)||!Array.isArray(node.children)||!node.hasChildren&&node.children.length>0||++count>500)return false
   ids.add(node.id);return node.children.length===0||nodes(node.children,depth+1)
  })
 }
 const selected=view.selected
 return typeof view.partial==='boolean'&&typeof view.hasMore==='boolean'&&selected&&typeof selected==='object'&&(selected.kind==='all'||selected.kind==='unclassified'||selected.kind==='folder'&&id(selected.id))&&nodes(view.nodes,1)&&Array.isArray(view.breadcrumbs)&&view.breadcrumbs.length<=8&&view.breadcrumbs.every(item=>item&&id(item.id)&&label(item.label))&&new Set(view.breadcrumbs.map(item=>item.id)).size===view.breadcrumbs.length
}
export function FolderNavigation(props:Props){return <ScopedFolderNavigation key={props.scope} {...props}/>}
function ScopedFolderNavigation({scope,role,view,locked=false,onSelect,onToggle,onMore,onRetry,onRetryChildren}:Props){
 const [open,setOpen]=useState(false),toggle=useRef<HTMLButtonElement>(null),panel=useId()
 const authorized=role==='owner'||role==='admin'
 if(!authorized)return <p className="text-sm text-slate-500">Carpetas disponibles para administradores del espacio.</p>
 if(!scope||view.scope!==scope||view.status==='loading')return <p role="status" aria-label="Estado de carpetas" className="text-sm text-slate-500">Cargando carpetas…</p>
 if(view.status==='denied')return <p role="alert" className="text-sm text-red-700">No tienes permiso para consultar estas carpetas.</p>
 if(view.status==='unavailable')return <div role="alert" className="space-y-2 text-sm"><p>Las carpetas no están disponibles ahora.</p><button type="button" className={control} disabled={locked} onClick={onRetry}>Reintentar carpetas</button></div>
 if(view.status!=='ready'||!validView(view))return <p role="alert" className="text-sm text-red-700">No se ha podido mostrar la organización de carpetas.</p>
 const model=view
 const select=(choice:FolderChoice)=>{if(!locked)onSelect(choice)}
 function renderNodes(nodes:readonly FolderNavigationNode[],path:string){return <ul className="space-y-1" aria-label={path}>{nodes.map(node=>{
  const expanded=node.hasChildren&&node.expanded,selected=model.selected.kind==='folder'&&model.selected.id===node.id,Icon=expanded?FolderOpen:Folder
  return <li key={node.id} className="min-w-0"><div className="flex min-w-0 items-start gap-1">
   {node.hasChildren?<button type="button" className={`${control} shrink-0 px-2`} aria-expanded={expanded} aria-label={`${expanded?'Plegar':'Desplegar'} ${node.label}`} disabled={locked} onClick={()=>onToggle(node.id,!expanded)}><ChevronRight aria-hidden size={16} className={expanded?'rotate-90':''}/></button>:<span className="w-8 shrink-0" aria-hidden/>}
   <button type="button" className={`${control} flex min-w-0 flex-1 items-start gap-2 text-left ${selected?'bg-indigo-50 font-semibold ring-1 ring-indigo-300':''}`} aria-current={selected?'page':undefined} disabled={locked} onClick={()=>select({kind:'folder',id:node.id})}><Icon aria-hidden size={16} className="mt-0.5 shrink-0"/><span className="min-w-0 break-words [overflow-wrap:anywhere]">{node.label}</span></button>
  </div>{expanded&&<div className="ml-3 mt-1 border-l border-slate-200 pl-2">
   {node.childrenState==='loading'?<p role="status" className="p-2 text-xs text-slate-500">Cargando subcarpetas…</p>:node.childrenState==='unavailable'?<div role="alert" className="p-2 text-xs"><p>No se han podido consultar las subcarpetas.</p><button type="button" className={`${control} mt-1 text-xs`} disabled={locked} onClick={()=>onRetryChildren(node.id)}>Reintentar subcarpetas de {node.label}</button></div>:renderNodes(node.children,'Subcarpetas de '+node.label)}
  </div>}</li>
 })}</ul>}
 return <section aria-label="Organización de carpetas" className="min-w-0 space-y-3">
  <div className="flex flex-wrap gap-2"><button type="button" className={control} aria-pressed={view.selected.kind==='all'} disabled={locked} onClick={()=>select({kind:'all'})}>Todos los documentos</button><button type="button" className={control} aria-pressed={view.selected.kind==='unclassified'} disabled={locked} onClick={()=>select({kind:'unclassified'})}>Sin clasificar</button></div>
  <nav aria-label="Carpeta actual"><ol className="flex min-w-0 flex-wrap items-start gap-1 text-xs"><li><button type="button" className="rounded p-1 text-indigo-700 focus-visible:outline-2" disabled={locked} onClick={()=>select({kind:'all'})}>Biblioteca</button></li>{view.breadcrumbs.map((item,index)=><li key={item.id} className="flex min-w-0 max-w-full items-start gap-1"><span aria-hidden className="p-1">/</span><button type="button" className="min-w-0 break-words rounded p-1 text-left text-indigo-700 [overflow-wrap:anywhere] focus-visible:outline-2" disabled={locked} aria-current={index===view.breadcrumbs.length-1?'page':undefined} onClick={()=>select({kind:'folder',id:item.id})}>{item.label}</button></li>)}</ol></nav>
  <button ref={toggle} type="button" className={`${control} w-full text-left lg:hidden`} aria-expanded={open} aria-controls={panel} onClick={()=>setOpen(value=>!value)}>{open?'Ocultar carpetas':'Mostrar carpetas'}</button>
  <div id={panel} className={`${open?'block':'hidden'} min-w-0 space-y-3 lg:block`} onKeyDown={event=>{if(event.key==='Escape'&&open&&window.matchMedia('(max-width:1023px)').matches){event.preventDefault();event.stopPropagation();setOpen(false);toggle.current?.focus()}}}>
   <nav aria-label="Carpetas">{view.nodes.length?renderNodes(view.nodes,'Carpetas de la biblioteca'):<p className="text-sm text-slate-500">Sin carpetas en esta consulta.</p>}</nav>
   {view.partial&&<p role="status" aria-label="Consulta parcial de carpetas" className="text-xs text-amber-800">La consulta de carpetas es parcial. Puede faltar organización por cargar.</p>}
   {view.hasMore&&<button type="button" className={control} disabled={locked} onClick={onMore}>Más carpetas</button>}
  </div>
 </section>
}
