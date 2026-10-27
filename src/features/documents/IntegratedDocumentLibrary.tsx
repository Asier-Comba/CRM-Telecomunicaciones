'use client'
import {useEffect,useRef,useState} from 'react'
import {PageHeader} from '@/components/PageHeader'
import {ConfirmDialog} from '@/components/ConfirmDialog'
import {useProduct} from '@/features/product/integration/Provider'
import {ProductUiError,safeMessage} from '@/features/product/integration/repository'
import {PreviewNotice,control,primary,Drawer,Status} from '@/features/product/ui'
import type {DocumentLibraryEntryV2,DocumentLibraryInputV2,DocumentLibraryPageV2} from '@/lib/contracts/document-library-v2'
import type {DocumentMetadataV1,DocumentReceiptV1,DocumentTargetKindV1} from '@/lib/contracts/document-v1'
import {parseDocumentLibraryInputV2} from '@/lib/server/document-library-runtime-v2'
import {documentCategories,documentTargets,documentFormat,documentSize,documentTargetHref} from './document-navigation'
import {initialLibraryInput,readLibraryHistory,libraryUrl,libraryUrlInput,libraryDateFilter,libraryCalendarDate,type LibraryNavigation} from './library-navigation'
import {useDocumentMetadataSelection} from './useDocumentMetadataSelection'

type Props={initialTarget?:{kind:DocumentTargetKindV1;id:string};initialStatus?:'active'|'archived'}
export function IntegratedDocumentLibrary(props:Props){const {actorId,workspaceId,role}=useProduct();return <ScopedLibrary key={JSON.stringify([actorId,workspaceId,role,props.initialTarget??null,props.initialStatus??null])} {...props}/>}
function ScopedLibrary({initialTarget,initialStatus='active'}:Props){
 const {repository,role,actorId,workspaceId}=useProduct(),authorized=role==='owner'||role==='admin',scope=JSON.stringify([actorId,workspaceId,role])
 const [initial]=useState(()=>initialLibraryInput(initialTarget,initialStatus)),[nav,setNav]=useState<LibraryNavigation>({input:initial,page:1,back:[]}),[ready,setReady]=useState(false)
 const [query,setQuery]=useState(''),[editing,setEditing]=useState(false),[revision,setRevision]=useState(0),[sidebar,setSidebar]=useState(false),[filtersOpen,setFiltersOpen]=useState(false)
 const [pageState,setPageState]=useState<{key:string;data?:DocumentLibraryPageV2;error?:string;unavailable?:boolean}|null>(null),[error,setError]=useState(''),[message,setMessage]=useState('')
 const [confirm,setConfirm]=useState<DocumentMetadataV1|null>(null),[busy,setBusy]=useState(false),[uncertain,setUncertain]=useState(false),locked=busy||uncertain
 const pending=useRef<{execute:()=>Promise<DocumentReceiptV1>}|null>(null),epoch=useRef(0),mounted=useRef(false)
 const metadata=useDocumentMetadataSelection(repository,scope,authorized),selected=metadata.selected,closeMetadata=metadata.close
 const key=JSON.stringify([scope,nav.input,revision]),current=pageState?.key===key?pageState:null,data=!editing?current?.data??null:null,loading=ready&&authorized&&!editing&&!current
 useEffect(()=>{const life=mounted,requests=epoch;life.current=true;return()=>{life.current=false;requests.current++}},[])
 useEffect(()=>{let active=true;queueMicrotask(()=>{if(!active)return;const saved=readLibraryHistory(window.history.state?.crmDocumentLibraryV2,scope);if(saved){setNav(saved);setQuery(saved.input.query??'')}setReady(true)});return()=>{active=false}},[scope])
 useEffect(()=>{
  const pop=()=>{
   if(locked){window.history.replaceState({...window.history.state,crmDocumentLibraryV2:{contract:'documents.library.navigation.v2',scope,...nav}},'',libraryUrl(nav.input));return}
   const next=readLibraryHistory(window.history.state?.crmDocumentLibraryV2,scope)??{input:libraryUrlInput(window.location.search),page:1,back:[]}
   epoch.current++;closeMetadata();setNav(next);setQuery(next.input.query??'');setEditing(false);setError('');setMessage('');setRevision(n=>n+1)
  }
  window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop)
 },[scope,nav,locked,closeMetadata])
 useEffect(()=>{
  if(!ready||!authorized)return
  const request=++epoch.current;let active=true
  void (repository.documentLibrary?repository.documentLibrary(nav.input):Promise.reject(new ProductUiError('unavailable'))).then(result=>{if(active&&request===epoch.current)setPageState({key,data:result})}).catch(e=>{if(active&&request===epoch.current)setPageState({key,error:safeMessage(e),unavailable:e instanceof ProductUiError&&e.code==='unavailable'})})
  return()=>{active=false}
 },[repository,ready,authorized,key,nav.input])
 function apply(value:DocumentLibraryInputV2,back:Array<string|null>=[],page=1){
  if(locked)return
  // Removing an optional UI filter means omitting its JSON key. The server's
  // closed validator still rejects undefined/non-JSON and unknown inputs.
  const input=parseDocumentLibraryInputV2(Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined)));if(!input){setError('Revisa los filtros y escribe al menos dos caracteres para buscar.');return}
  const next={input,back:back.slice(-32),page};epoch.current++;metadata.close();setNav(next);setQuery(input.query??'');setEditing(false);setError('');setMessage('');setRevision(n=>n+1)
  window.history.pushState({...window.history.state,crmDocumentLibraryV2:{contract:'documents.library.navigation.v2',scope,...next}},'',libraryUrl(input))
 }
 function filter(patch:Partial<DocumentLibraryInputV2>){const next={...nav.input,query:query.trim()||undefined,...patch};delete next.cursor;apply(next)}
 function reset(){apply(initialLibraryInput())}
 function dateFilter(field:'created_from'|'created_before',value:string){try{filter({[field]:libraryDateFilter(value,field==='created_before')})}catch{setError('Revisa el intervalo de fechas.')}}
 async function mutate(){
  if(!confirm||busy)return;setBusy(true);setError('')
  // Freeze the actual command intent once, including across a lost response.
  if(!pending.current){const operation=confirm.status==='active'?'document.archive':'document.restore',input=Object.freeze({command_id:crypto.randomUUID(),id:confirm.id,expected_version:confirm.version});pending.current={execute:()=>repository.documentCommand(operation,input)}}
  try{await pending.current.execute();if(!mounted.current)return;pending.current=null;setUncertain(false);setConfirm(null);metadata.close();setMessage('Documento actualizado.');setRevision(n=>n+1)}
  catch(e){if(!mounted.current)return;const unknown=e instanceof ProductUiError&&['transport_uncertain','internal_safe'].includes(e.code);setUncertain(unknown);setError(unknown?'El resultado está pendiente de confirmación. Reintenta la misma acción.':safeMessage(e));if(!unknown)pending.current=null}
  finally{if(mounted.current)setBusy(false)}
 }
 function action(record:DocumentLibraryEntryV2){pending.current=null;setUncertain(false);setError('');setConfirm({id:record.id,version:record.version,status:record.status,document_kind:record.document_kind,media_type:record.media_type,size_bytes:record.size_bytes,target:record.context.target})}
 const hasFilters=!!(nav.input.query||nav.input.customer_id||nav.input.target||nav.input.document_kind||nav.input.format||nav.input.created_from||nav.input.created_before)
 const failure=error||metadata.error||(!editing?current?.error:'')||''
 const date=(value:string)=>new Intl.DateTimeFormat('es-ES',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))
 return <div className="space-y-4" data-documents-pro="global-v2">
  <PageHeader title="Documentos" description="Encuentra la documentación de tu empresa y continúa cada operación en su contexto."/><PreviewNotice/>
  {!authorized?<section className="rounded-xl border bg-white p-6"><h2 className="font-semibold">Acceso a documentación</h2><p className="mt-2 text-sm text-slate-600">Documentos disponibles para administradores del espacio.</p></section>:<>
   <div className="grid min-w-0 gap-4 lg:grid-cols-[13rem_minmax(0,1fr)]">
    <aside className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 lg:self-start" aria-label="Biblioteca documental">
     <button className={`${control} w-full text-left lg:hidden`} aria-expanded={sidebar} onClick={()=>setSidebar(v=>!v)}>{sidebar?'Ocultar biblioteca':'Mostrar biblioteca'}</button>
     <div className={sidebar?'block':'hidden lg:block'}><h2 className="px-2 py-2 text-xs font-semibold uppercase text-slate-500">Biblioteca</h2><div className="flex flex-wrap gap-2 lg:flex-col"><button className={`${control} text-left`} disabled={locked} onClick={reset}>Todos los documentos</button><button className={`${control} text-left`} disabled={locked} onClick={()=>filter({status:'active'})}>Documentos activos</button><button className={`${control} text-left`} disabled={locked} onClick={()=>filter({status:'archived'})}>Documentos archivados</button></div><div className="mt-4 border-t pt-3"><h2 className="text-sm font-semibold">Carpetas</h2><p className="mt-1 text-xs leading-5 text-slate-500">Carpetas pendientes de habilitación.</p></div></div>
    </aside>
    <div className="min-w-0 space-y-4">
     <section className="rounded-xl border border-slate-200 bg-white p-4" aria-label="Buscar y filtrar documentos">
      <form className="flex flex-wrap gap-2" onSubmit={e=>{e.preventDefault();filter({})}}><input className={`${control} min-w-0 flex-1`} aria-label="Buscar documentos" placeholder="Tipo, referencia o empresa" maxLength={100} disabled={locked} value={query} onChange={e=>{epoch.current++;setQuery(e.target.value);setEditing(true);setError('')}}/><button className={primary} disabled={locked}>Buscar documentos</button></form>
      <button className={`${control} mt-3 lg:hidden`} aria-expanded={filtersOpen} onClick={()=>setFiltersOpen(v=>!v)}>{filtersOpen?'Ocultar filtros':'Mostrar filtros'}</button>
      <div className={`${filtersOpen?'grid':'hidden lg:grid'} mt-3 grid-cols-2 gap-3 xl:grid-cols-5`}>
       <label className="text-xs text-slate-600">Estado<select aria-label="Estado de biblioteca" className={`${control} mt-1 w-full`} disabled={locked} value={nav.input.status??'active'} onChange={e=>filter({status:e.target.value as 'active'|'archived'})}><option value="active">Activos</option><option value="archived">Archivados</option></select></label>
       <label className="text-xs text-slate-600">Categoría<select aria-label="Categoría documental" className={`${control} mt-1 w-full`} disabled={locked} value={nav.input.document_kind??''} onChange={e=>filter({document_kind:(e.target.value||undefined)as DocumentLibraryInputV2['document_kind']})}><option value="">Todas</option>{Object.entries(documentCategories).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
       <label className="text-xs text-slate-600">Formato<select aria-label="Formato documental" className={`${control} mt-1 w-full`} disabled={locked} value={nav.input.format??''} onChange={e=>filter({format:(e.target.value||undefined)as DocumentLibraryInputV2['format']})}><option value="">Todos</option><option value="pdf">PDF</option><option value="image">Imágenes</option></select></label>
       <label className="text-xs text-slate-600">Incorporado desde<input type="date" aria-label="Incorporado desde" className={`${control} mt-1 w-full min-w-0`} disabled={locked} value={libraryCalendarDate(nav.input.created_from)} onChange={e=>dateFilter('created_from',e.target.value)}/></label>
       <label className="text-xs text-slate-600">Hasta, incluido<input type="date" aria-label="Incorporado hasta" className={`${control} mt-1 w-full min-w-0`} disabled={locked} value={libraryCalendarDate(nav.input.created_before,true)} onChange={e=>dateFilter('created_before',e.target.value)}/></label>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap gap-2">{nav.input.customer_id&&<button className={`${control} text-xs`} disabled={locked} onClick={()=>filter({customer_id:undefined})}>Empresa seleccionada ×</button>}{nav.input.target&&<button className={`${control} text-xs`} disabled={locked} onClick={()=>filter({target:undefined})}>{documentTargets[nav.input.target.kind]} seleccionado ×</button>}{hasFilters&&<button className={`${control} text-xs`} disabled={locked} onClick={reset}>Quitar filtros</button>}</div><p className="text-xs text-slate-500">Fechas según la zona horaria de tu dispositivo.</p></div>
     </section>
     {failure&&<div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-800">{failure}<div className="mt-2 flex flex-wrap gap-2"><button className={control} disabled={locked} onClick={()=>filter({})}>Reintentar consulta</button>{nav.input.cursor&&<button className={control} disabled={locked} onClick={()=>filter({})}>Volver al principio</button>}</div></div>}
     {message&&<p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
     <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Inventario documental" aria-busy={loading}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div><h2 className="font-semibold">{nav.input.customer_id?'Documentos de la empresa':nav.input.target?'Documentos del registro':'Biblioteca del espacio'}</h2>{data&&<p className="mt-1 text-xs text-slate-500">{data.items.length} en esta página · {data.count_state==='exact'?`${data.total_count} documentos en la consulta`:'Total no disponible'}</p>}</div><div className="flex flex-wrap gap-2"><select className={control} aria-label="Ordenar documentos" disabled={locked} value={nav.input.sort??'created_desc'} onChange={e=>filter({sort:e.target.value as 'created_asc'|'created_desc'})}><option value="created_desc">Más recientes primero</option><option value="created_asc">Más antiguos primero</option></select><button className={control} disabled={locked||loading} onClick={()=>{metadata.close();setRevision(n=>n+1)}}>Actualizar biblioteca</button></div></div>
      {(!ready||loading)&&<p role="status" className="p-6 text-sm text-slate-500">Cargando documentos…</p>}
      {editing&&<p role="status" className="p-6 text-sm text-slate-500">Pulsa Buscar documentos para actualizar la consulta.</p>}
      {current?.unavailable&&!editing&&<div className="p-6"><h3 className="font-semibold">Biblioteca pendiente de habilitación</h3><p className="mt-2 text-sm text-slate-500">La consulta no está disponible en este entorno.</p></div>}
      {data?.completeness==='partial'&&<p role="status" className="border-b bg-amber-50 p-3 text-sm text-amber-900">Listado parcial. Puede faltar documentación; vuelve a consultar antes de darlo por completo.</p>}
      {data&&data.items.length>0&&<table className="block w-full border-collapse text-left text-sm lg:table"><caption className="sr-only">Inventario autorizado de documentos del espacio</caption><thead className="hidden bg-slate-50 text-xs text-slate-500 lg:table-header-group"><tr><th scope="col" className="p-3">Documento y relación</th><th scope="col" className="p-3">Archivo</th><th scope="col" className="p-3">Incorporado</th><th scope="col" className="p-3">Estado</th><th scope="col" className="p-3">Acciones</th></tr></thead><tbody className="block space-y-3 p-3 lg:table-row-group lg:space-y-0 lg:p-0">{data.items.map(record=><tr key={record.id} data-document-id={record.id} data-document-version={record.version} className="grid min-w-0 grid-cols-2 gap-3 rounded-lg border border-slate-200 p-3 lg:table-row lg:border-x-0 lg:border-t lg:p-0">
       <td className="col-span-2 min-w-0 lg:table-cell lg:p-3"><p className="break-words font-semibold text-slate-900">{record.display_title??'Título restringido'}</p>{record.context.customer&&<button className="mt-1 block max-w-full break-words text-left text-xs text-indigo-700 hover:underline" disabled={locked} aria-label={'Filtrar por empresa '+record.context.customer.label} onClick={()=>filter({customer_id:record.context.customer!.id,target:undefined})}>{record.context.customer.label}</button>}<p className="mt-1 break-words text-xs text-slate-500">{record.context.target.label}</p></td>
       <td className="min-w-0 text-xs text-slate-600 lg:table-cell lg:p-3"><span className="inline-flex rounded-md bg-slate-100 px-2 py-1 font-medium">{documentFormat(record.media_type)}</span><p className="mt-1">{documentSize(record.size_bytes)}</p></td>
       <td className="min-w-0 break-words text-xs text-slate-600 lg:table-cell lg:p-3"><span className="mb-1 block text-slate-500 lg:hidden">Incorporado</span><time dateTime={record.created_at}>{date(record.created_at)}</time></td>
       <td className="lg:table-cell lg:p-3"><Status value={record.status}/></td>
       <td className="col-span-2 lg:table-cell lg:p-3"><div className="flex flex-wrap gap-2"><button className={`${control} text-xs`} disabled={locked} onClick={()=>{setError('');void metadata.open(record.id)}}>Ver detalles</button>{documentTargetHref(record.context.target)&&<a className={`${control} text-xs`} href={documentTargetHref(record.context.target)!}>Abrir registro</a>}<button className={`${control} text-xs`} disabled={locked} onClick={()=>action(record)}>{record.status==='active'?'Archivar':'Restaurar'}</button><button className={`${control} text-xs`} disabled={locked} onClick={()=>filter({target:{kind:record.context.target.kind,id:record.context.target.id}})}>Sólo este registro</button></div></td>
      </tr>)}</tbody></table>}
      {data?.items.length===0&&<div className="p-6"><h3 className="font-semibold">{data.completeness==='partial'?'La consulta no se ha podido completar':hasFilters?'Sin documentos con estos filtros':`Sin documentos ${nav.input.status==='archived'?'archivados':'activos'}`}</h3><p className="mt-2 text-sm text-slate-500">Prueba otro estado o ajusta la búsqueda.</p></div>}
      {data&&<div className="flex flex-wrap items-center justify-between gap-3 border-t p-4"><span className="text-xs text-slate-500">Página {nav.page} · Hasta 20 documentos</span><div className="flex flex-wrap gap-2">{nav.input.cursor&&<button className={`${control} text-xs`} disabled={locked||editing} onClick={()=>filter({})}>Volver al principio</button>}<button className={`${control} text-xs`} disabled={locked||editing||!nav.back.length} onClick={()=>apply({...nav.input,cursor:nav.back.at(-1)??undefined},nav.back.slice(0,-1),Math.max(1,nav.page-1))}>Página anterior</button><button className={`${control} text-xs`} disabled={locked||editing||!data.next_cursor} onClick={()=>{if(data.next_cursor)apply({...nav.input,cursor:data.next_cursor},[...nav.back,nav.input.cursor??null],nav.page+1)}}>Siguiente página</button></div></div>}
     </section>
     <p className="text-xs leading-5 text-slate-500">Los títulos son referencias de la documentación. El nombre original, los archivos privados y las carpetas siguen pendientes de habilitación.</p>
    </div>
   </div>
   {selected&&<Drawer title="Detalles del documento" onClose={metadata.close}><dl className="space-y-3 text-sm"><div><dt>Categoría</dt><dd>{documentCategories[selected.document_kind]}</dd></div><div><dt>Formato y tamaño</dt><dd>{documentFormat(selected.media_type)} · {documentSize(selected.size_bytes)}</dd></div><div><dt>Estado</dt><dd>{selected.status==='active'?'Activo':'Archivado'}</dd></div></dl>{documentTargetHref(selected.target)&&<a className={`${control} mt-4 inline-flex`} href={documentTargetHref(selected.target)!}>Abrir registro vinculado</a>}<p className="mt-4 text-xs text-slate-500">El nombre original y el contenido privado no se incluyen en esta consulta.</p></Drawer>}
   <ConfirmDialog open={!!confirm} title={confirm?.status==='active'?'Archivar documento':'Restaurar documento'} description={uncertain?'Reintenta la misma acción para confirmar su resultado.':'Confirma el cambio de estado del documento.'} error={error} loading={busy} cancelDisabled={uncertain} confirmLabel={uncertain?'Reintentar la misma acción':'Confirmar'} onConfirm={mutate} onCancel={()=>{if(!locked){setConfirm(null);pending.current=null}}}/>
  </>}
 </div>
}
