'use client'
import {DocumentIntegrity,DocumentCleanup} from './DocumentMaintenance'
import {DocumentImagePreview} from './DocumentImagePreview'
import {DocumentUpload} from './DocumentUpload'
import {useDocumentMetadataSelection} from './useDocumentMetadataSelection'
import {documentCategories,documentTargets,documentFormat,documentSize,documentTargetHref,documentViewUrl,documentNavigationKey,readDocumentBackStack,readDocumentView,type DocumentView} from './document-navigation'
import type {DocumentContentInputsV1,DocumentContentReceiptV1} from '@/lib/contracts/document-content-v1'
import {useCallback,useEffect,useRef,useState} from 'react'
import {PageHeader} from '@/components/PageHeader'
import {ConfirmDialog} from '@/components/ConfirmDialog'
import {useProduct} from '@/features/product/integration/Provider'
import {ProductUiError,safeMessage} from '@/features/product/integration/repository'
import {PreviewNotice,control,primary,Drawer,Status} from '@/features/product/ui'
import type {DocumentListV1,DocumentMetadataV1,DocumentReceiptV1,DocumentTargetKindV1} from '@/lib/contracts/document-v1'
import type {GlobalSearchV1} from '@/lib/contracts/product-dashboard-v2'

type IntegratedDocumentsProps={customerId?:string;contentEnabled?:boolean;maintenanceEnabled?:boolean;initialTarget?:{kind:DocumentTargetKindV1;id:string;label:string};initialView?:DocumentView;syncUrl?:boolean}
export function IntegratedDocuments(props:IntegratedDocumentsProps){
  const {actorId,workspaceId,role}=useProduct()
  return <ScopedIntegratedDocuments key={JSON.stringify([actorId,workspaceId,role,props.customerId??null,props.initialTarget?.kind??null,props.initialTarget?.id??null,props.initialView??null])} {...props}/>
}
function ScopedIntegratedDocuments({customerId:initialCustomerId,contentEnabled=false,maintenanceEnabled=false,initialTarget,initialView,syncUrl=false}:IntegratedDocumentsProps){
  const {repository,role,actorId,workspaceId}=useProduct(),authorized=role==='owner'||role==='admin'
  const scope=JSON.stringify([actorId,workspaceId,role])
  const [navigation,setNavigation]=useState<{view:DocumentView;back:Array<string|null>}>(()=>({view:initialView??{target:initialTarget??(initialCustomerId?{kind:'customer',id:initialCustomerId}:null),status:'active',after:null,page:1},back:[]}))
  const {view,back}=navigation,targetKind=view.target?.kind,targetId=view.target?.id
  const [targetLabel,setTargetLabel]=useState(initialTarget?.label??(view.target?.kind==='customer'?'Empresa seleccionada':view.target?documentTargets[view.target.kind]:''))
  const [customerId,setCustomerId]=useState(initialCustomerId??'')
  const [sidebarOpen,setSidebarOpen]=useState(false)
  const target=view.target?{...view.target,label:targetLabel||documentTargets[view.target.kind]}:null
  const [revision,setRevision]=useState(0),[query,setQuery]=useState(''),[results,setResults]=useState<GlobalSearchV1|null>(null),[searching,setSearching]=useState(false)
  const [pageState,setPageState]=useState<{key:string;data?:DocumentListV1;error?:string;denied?:boolean}|null>(null)
  const [error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState<DocumentMetadataV1|null>(null)
  const [pendingUncertain,setPendingUncertain]=useState(false)
  const locked=busy||pendingUncertain
  const pageKey=JSON.stringify([scope,targetKind,targetId,view.status,view.after,revision])
  const currentPage=pageState?.key===pageKey?pageState:null,data=currentPage?.data??null
  const loading=authorized&&!!target&&!currentPage
  const metadataScope=JSON.stringify([scope,targetKind,targetId])
  const metadata=useDocumentMetadataSelection(repository,metadataScope,authorized),selected=metadata.selected
  const closeMetadata=metadata.close
  const visibleError=metadata.error||error||currentPage?.error||''
  const [cleanup,setCleanup]=useState(false),[preview,setPreview]=useState<DocumentMetadataV1|null>(null),[upload,setUpload]=useState(false),[download,setDownload]=useState<DocumentMetadataV1|null>(null)
  const downloadIntent=useRef<DocumentContentInputsV1['document.request_download']|null>(null),ticket=useRef<DocumentContentReceiptV1|null>(null)
  const pending=useRef<{execute:()=>Promise<DocumentReceiptV1>}|null>(null)
  const searchEpoch=useRef(0)
  const lifetime=useRef(true)
  useEffect(()=>{lifetime.current=true;return()=>{lifetime.current=false}},[])
  const load=useCallback(async()=>{setRevision(v=>v+1)},[])

  function writeView(next:DocumentView,stack:Array<string|null>){
    if(syncUrl)window.history.pushState({...window.history.state,crmDocumentsV1:{contract:'documents.navigation.v1',scope,query:documentNavigationKey(next),after:next.after,page:next.page,back:stack.slice(-32)}},'',documentViewUrl(window.location.href,next))
    setNavigation({view:next,back:stack.slice(-32)})
  }
  function changeView(next:DocumentView,stack:Array<string|null>=[],label=''){
    if(locked)return
    searchEpoch.current++;setSearching(false);setResults(null);setError('');setMessage('');metadata.close();setPreview(null)
    setUpload(false);setDownload(null);setConfirm(null);downloadIntent.current=null;ticket.current=null;pending.current=null
    setTargetLabel(label);writeView(next,stack)
  }
  useEffect(()=>{
    if(!syncUrl)return
    let alive=true
    queueMicrotask(()=>{
      if(!alive)return
      const saved=readDocumentBackStack(window.history.state?.crmDocumentsV1,scope,view)
      if(saved.length)setNavigation(previous=>JSON.stringify(previous.back)===JSON.stringify(saved)?previous:{...previous,back:saved})
    })
    const pop=()=>{
      if(locked){
        window.history.replaceState({...window.history.state,crmDocumentsV1:{contract:'documents.navigation.v1',scope,query:documentNavigationKey(view),after:view.after,page:view.page,back}},'',documentViewUrl(window.location.href,view))
        return
      }
      const parsed=readDocumentView(window.location.search)
      searchEpoch.current++;setResults(null);setSearching(false);setError(parsed.invalid?'El enlace no contiene una selección válida. Selecciona de nuevo el registro.':'');setMessage('');closeMetadata();setTargetLabel('')
      setPreview(null);setUpload(false);setDownload(null);setConfirm(null);downloadIntent.current=null;ticket.current=null;pending.current=null
      setNavigation({view:parsed.view,back:readDocumentBackStack(window.history.state?.crmDocumentsV1,scope,parsed.view)})
    }
    window.addEventListener('popstate',pop)
    return()=>{alive=false;window.removeEventListener('popstate',pop)}
  },[syncUrl,scope,view,back,locked,closeMetadata])

  useEffect(()=>{
    if(!targetKind||!targetId||!authorized)return
    let alive=true
    void repository.documents({target_kind:targetKind,target_id:targetId,status:view.status,limit:20,...(view.after?{after_id:view.after}:{})}).then(result=>{
      if(alive)setPageState({key:pageKey,data:result})
    }).catch(e=>{
      if(alive)setPageState({key:pageKey,error:safeMessage(e),denied:e instanceof ProductUiError&&e.code==='access_denied'})
    })
    return()=>{alive=false}
  },[repository,authorized,pageKey,targetKind,targetId,view.status,view.after])

  async function search(event:React.FormEvent){
    event.preventDefault();if(locked||query.trim().length<2)return
    const epoch=++searchEpoch.current;setSearching(true);setResults(null);setError('')
    try{const result=await repository.search(query);if(epoch===searchEpoch.current&&lifetime.current)setResults(result)}
    catch(e){if(epoch===searchEpoch.current&&lifetime.current)setError(safeMessage(e))}
    finally{if(epoch===searchEpoch.current&&lifetime.current)setSearching(false)}
  }
  function selectTarget(record:GlobalSearchV1['items'][number]){
    if(!Object.hasOwn(documentTargets,record.kind))return
    setCustomerId(record.customer_id??record.id)
    changeView({target:{kind:record.kind as DocumentTargetKindV1,id:record.id},status:view.status,after:null,page:1},[],record.label)
  }
  async function mutate(){
    if(!confirm||busy)return
    setBusy(true);setError('')
    if(!pending.current){const operation=confirm.status==='active'?'document.archive':'document.restore';const input={command_id:crypto.randomUUID(),id:confirm.id,expected_version:confirm.version};pending.current={execute:()=>repository.documentCommand(operation,input)}}
    try{
      await pending.current.execute();if(!lifetime.current)return
      pending.current=null;setPendingUncertain(false);setConfirm(null);metadata.close();setMessage('Metadatos actualizados.');await load()
    }catch(e){
      if(!lifetime.current)return
      const unknown=!!pending.current&&e instanceof ProductUiError&&(e.code==='transport_uncertain'||e.code==='internal_safe')
      setError(unknown?'No se pudo confirmar el resultado. Reintenta la misma acción.':safeMessage(e));setPendingUncertain(unknown);if(!unknown)pending.current=null
    }finally{if(lifetime.current)setBusy(false)}
  }
  async function downloadFile(){
    if(!download||busy)return
    setBusy(true);setError('')
    try{
      downloadIntent.current??=Object.freeze({command_id:crypto.randomUUID(),id:download.id,expected_version:download.version})
      if(!ticket.current)ticket.current=await repository.contentCommand('document.request_download',downloadIntent.current)
      if(!lifetime.current)return
      if(!ticket.current.ticket_id)throw new ProductUiError('internal_safe')
      const blob=await repository.downloadDocument(download.id,ticket.current.ticket_id)
      if(!lifetime.current)return
      const url=URL.createObjectURL(blob),anchor=document.createElement('a')
      anchor.href=url;anchor.download=blob.type==='application/pdf'?'document.pdf':blob.type==='image/png'?'document.png':'document.jpg';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
      downloadIntent.current=null;ticket.current=null;setDownload(null)
    }catch(e){if(lifetime.current){setError(safeMessage(e));if(!(e instanceof ProductUiError&&e.code==='transport_uncertain')){downloadIntent.current=null;ticket.current=null}}}
    finally{if(lifetime.current)setBusy(false)}
  }
  const contextHref=target?documentTargetHref(target):null
  return <div className="space-y-4" data-documents-pro="scoped-v1">
    <PageHeader title="Documentos" description="Documentación de tus clientes y operaciones, reunida en su contexto." action={authorized&&target&&contentEnabled?<button className={primary} disabled={locked} onClick={()=>setUpload(true)}>Subir documento local</button>:undefined}/>
    <PreviewNotice/>
    {!authorized?<section className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="font-semibold">Acceso a documentación</h2><p className="mt-2 text-sm text-slate-600">Documentos disponibles para administradores del espacio.</p></section>:<>
      <div className="grid min-w-0 gap-4 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <aside aria-label="Accesos de documentos" className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 lg:self-start">
          <button className={`${control} w-full text-left lg:hidden`} aria-expanded={sidebarOpen} onClick={()=>setSidebarOpen(v=>!v)}>{sidebarOpen?'Ocultar biblioteca':'Mostrar biblioteca'}</button>
          <div className={sidebarOpen?'block':'hidden lg:block'}>
          <h2 className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Biblioteca</h2>
          <div className="mt-2 flex flex-wrap gap-2 lg:flex-col">
            <button className={`${control} text-left ${!target?'border-indigo-200 bg-indigo-50 text-indigo-700':''}`} disabled={locked} onClick={()=>changeView({target:null,status:'active',after:null,page:1})}>Todos los documentos</button>
            {target&&<><button className={`${control} text-left ${view.status==='active'?'border-indigo-200 bg-indigo-50 text-indigo-700':''}`} disabled={locked} onClick={()=>changeView({...view,status:'active',after:null,page:1},[],target.label)}>Activos del registro</button><button className={`${control} text-left ${view.status==='archived'?'border-indigo-200 bg-indigo-50 text-indigo-700':''}`} disabled={locked} onClick={()=>changeView({...view,status:'archived',after:null,page:1},[],target.label)}>Archivados del registro</button></>}
          </div>
          <div className="mt-4 border-t pt-3"><h2 className="text-sm font-semibold">Carpetas</h2><p className="mt-1 text-xs leading-5 text-slate-500">La clasificación por carpetas está pendiente de habilitación.</p></div>
          {maintenanceEnabled&&<button className={`${control} mt-4 w-full text-left text-xs`} disabled={locked} onClick={()=>setCleanup(true)}>Revisar subidas caducadas</button>}
          </div>
        </aside>
        <div className="min-w-0 space-y-4">
          {!target&&<section className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-5"><p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Biblioteca del espacio</p><h2 className="mt-2 text-lg font-semibold text-slate-900">Inventario general pendiente de habilitación</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Puedes consultar la documentación de una empresa o una operación. El inventario general y la búsqueda de archivos todavía no están disponibles.</p><label className="mt-4 block text-sm font-medium text-slate-600">Buscar documentos<input className={`${control} mt-1 w-full max-w-lg`} disabled placeholder="Búsqueda de archivos pendiente de habilitación"/></label></section>}
          <section aria-label="Seleccionar registro para documentos" className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold">{target?'Cambiar registro':'Abrir documentación de un registro'}</h2><p className="mt-1 text-xs leading-5 text-slate-500">Busca una empresa, contrato, servicio, línea u oportunidad. Esta búsqueda selecciona el registro; no busca archivos.</p>
            <form onSubmit={search} className="mt-3 flex flex-wrap gap-2"><input className={`${control} min-w-0 flex-1`} aria-label="Buscar cliente para documentos" placeholder="Empresa u operación comercial" required minLength={2} maxLength={100} disabled={locked} value={query} onChange={e=>{searchEpoch.current++;setQuery(e.target.value);setResults(null);setSearching(false)}}/><button className={primary} disabled={locked||searching}>{searching?'Buscando…':'Buscar registro'}</button></form>
            {results&&<div className="mt-3 flex flex-wrap gap-2">{results.items.filter(r=>Object.hasOwn(documentTargets,r.kind)).map(r=><button key={r.kind+':'+r.id} className={control} disabled={locked} onClick={()=>selectTarget(r)}>{documentTargets[r.kind as DocumentTargetKindV1]} · {r.label}</button>)}{!results.items.some(r=>Object.hasOwn(documentTargets,r.kind))&&<p role="status" className="text-sm text-slate-500">Sin registros compatibles en esta consulta.</p>}<p className="w-full text-xs text-slate-500">La selección devuelve hasta cinco coincidencias por tipo. No representa el inventario de documentos.</p></div>}
          </section>
          {visibleError&&!download&&!confirm&&<div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-800">{visibleError}{target&&<button className={`${control} ml-2`} disabled={locked} onClick={()=>void load()}>Reintentar consulta</button>}</div>}
          {message&&<p role="status" className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
          {target&&<section aria-label="Inventario del registro" aria-busy={loading} className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4"><div className="min-w-0"><p className="text-xs font-medium text-slate-500">Documentación del registro</p><h2 className="mt-1 break-words text-base font-semibold">{target.label}</h2>{contextHref&&<a className="mt-1 inline-flex text-xs font-semibold text-indigo-700 underline-offset-4 hover:underline" href={contextHref}>Abrir {documentTargets[target.kind].toLowerCase()}</a>}</div><div className="flex flex-wrap gap-2"><label className="text-xs text-slate-600">Estado de documentos<select aria-label="Estado de documentos" className={`${control} ml-2`} disabled={locked} value={view.status} onChange={e=>changeView({...view,status:e.target.value as DocumentView['status'],after:null,page:1},[],target.label)}><option value="active">Activos</option><option value="archived">Archivados</option></select></label><button className={control} disabled={locked||loading} onClick={()=>void load()}>Actualizar documentos</button></div></div>
            {loading&&<p role="status" className="p-6 text-sm text-slate-600">Cargando documentos…</p>}
            {data&&<><div className="flex flex-wrap justify-between gap-2 border-b bg-slate-50 px-4 py-2 text-xs text-slate-500"><span>{data.items.length} documentos en esta página</span><span>Total del registro no disponible · Orden estable del registro</span></div>
              {data.items.length?<table className="block w-full border-collapse text-left text-sm lg:table"><caption className="sr-only">Documentos autorizados del registro seleccionado</caption><thead className="hidden bg-slate-50 text-xs text-slate-500 lg:table-header-group"><tr><th scope="col" className="px-4 py-3">Documento</th><th scope="col" className="px-3 py-3">Formato</th><th scope="col" className="px-3 py-3">Tamaño</th><th scope="col" className="px-3 py-3">Estado</th><th scope="col" className="px-4 py-3 text-right">Acciones</th></tr></thead><tbody className="block space-y-3 p-3 lg:table-row-group lg:space-y-0 lg:p-0">{data.items.map(d=><tr data-document-id={d.id} data-document-version={d.version} data-document-media-type={d.media_type??''} data-document-size={d.size_bytes??''} key={d.id} className="grid min-w-0 grid-cols-2 gap-3 rounded-lg border border-slate-200 p-3 lg:table-row lg:border-x-0 lg:border-t lg:p-0">
                <td className="col-span-2 min-w-0 lg:table-cell lg:px-4 lg:py-3"><p className="break-words font-semibold text-slate-900">Documento · {documentCategories[d.document_kind]}</p><p className="mt-1 break-words text-xs text-slate-500">{target.label}</p></td>
                <td className="min-w-0 lg:table-cell lg:px-3 lg:py-3"><span className="mb-1 block text-xs text-slate-500 lg:hidden">Formato</span><span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{documentFormat(d.media_type)}</span></td>
                <td className="min-w-0 break-words text-xs text-slate-600 lg:table-cell lg:px-3 lg:py-3"><span className="mb-1 block text-xs text-slate-500 lg:hidden">Tamaño</span>{documentSize(d.size_bytes)}</td>
                <td className="lg:table-cell lg:px-3 lg:py-3"><Status value={d.status}/></td>
                <td className="col-span-2 lg:table-cell lg:px-4 lg:py-3"><div className="flex flex-wrap gap-2 lg:justify-end"><button className={`${control} text-xs`} disabled={locked} onClick={()=>{setError('');void metadata.open(d.id)}}>Ver metadatos</button>{contentEnabled&&d.status==='active'&&['image/png','image/jpeg'].includes(d.media_type??'')&&<button className={`${control} text-xs`} disabled={locked} onClick={()=>setPreview(d)}>Vista previa de imagen</button>}{contentEnabled&&d.status==='active'&&<button className={`${control} text-xs`} disabled={locked} onClick={()=>{downloadIntent.current=null;ticket.current=null;setError('');setDownload(d)}}>Descargar archivo privado</button>}<button className={`${control} text-xs`} disabled={locked} onClick={()=>{pending.current=null;setPendingUncertain(false);setConfirm(d);setError('')}}>{d.status==='active'?'Archivar documento':'Restaurar documento'}</button></div></td>
              </tr>)}</tbody></table>:<div className="p-6"><h3 className="font-medium">Sin documentos {view.status==='active'?'activos':'archivados'} en esta página</h3><p className="mt-2 text-sm leading-6 text-slate-500">{view.after?'Puedes volver a la página anterior o al inicio del listado.':'Prueba otro estado o abre la documentación de otro registro.'}</p></div>}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4"><p className="text-xs text-slate-500">Página {view.page} · Hasta 20 documentos</p><div className="flex flex-wrap gap-2">{view.after&&<button className={`${control} text-xs`} disabled={locked} onClick={()=>changeView({...view,after:null,page:1},[],target.label)}>Volver al inicio del listado</button>}<button className={`${control} text-xs`} disabled={locked||!back.length} onClick={()=>changeView({...view,after:back.at(-1)??null,page:Math.max(1,view.page-1)},back.slice(0,-1),target.label)}>Página anterior de documentos</button><button className={`${control} text-xs`} disabled={locked||!data.next_id} onClick={()=>{if(data.next_id)changeView({...view,after:data.next_id,page:view.page+1},[...back,view.after],target.label)}}>Siguiente página de documentos</button></div></div>
            </>}
            {currentPage?.denied&&<p className="px-4 pb-4 text-sm text-slate-600">La consulta no muestra documentos mientras tu acceso está restringido.</p>}
          </section>}
          <p className="text-xs leading-5 text-slate-500">{contentEnabled?'El nombre original y la fecha no forman parte de esta consulta. Vista previa privada existente para PNG y JPEG; los PDF se tratan como adjuntos. Vista previa PDF pendiente de habilitación.':'El nombre original y la fecha no están disponibles en esta consulta. Subida, descarga y vista previa pendientes de habilitación.'}</p>
        </div>
      </div>
      {cleanup&&<DocumentCleanup onClose={()=>setCleanup(false)}/>}
      {preview&&<DocumentImagePreview key={preview.id} document={preview} onClose={()=>setPreview(null)}/>}
      {upload&&<DocumentUpload key={target?.id} customerId={customerId} targetKind={target?.kind} targetId={target?.id} onClose={()=>setUpload(false)} onSaved={async()=>{await load()}}/>}
      <ConfirmDialog open={!!download} title="Descargar archivo privado" description="Se solicitará un acceso de 30 segundos que revalida tus permisos. Archivo sin análisis antivirus." loading={busy} error={error} onConfirm={downloadFile} onCancel={()=>{if(!busy){setDownload(null);downloadIntent.current=null;ticket.current=null}}}/>
      {selected&&<Drawer title="Metadatos del documento" onClose={()=>metadata.close()}><dl className="space-y-3 text-sm"><div><dt>Tipo</dt><dd>{selected.document_kind}</dd></div><div><dt>Formato</dt><dd>{selected.media_type??'No disponible'}</dd></div><div><dt>Tamaño</dt><dd>{selected.size_bytes===null?'No disponible':`${selected.size_bytes} bytes`}</dd></div><div><dt>Estado</dt><dd>{selected.status==='active'?'Activo':'Archivado'}</dd></div></dl><p className="text-xs text-slate-500">No incluye nombre, contenido, ruta ni enlace de descarga.</p>{documentTargetHref(selected.target)&&<a className={control} href={documentTargetHref(selected.target)!}>Abrir registro vinculado</a>}{contentEnabled&&maintenanceEnabled&&selected.status==='active'&&<DocumentIntegrity key={selected.id} document={selected} onVerified={async()=>{await metadata.refresh(selected.id);await load()}}/>}</Drawer>}
      <ConfirmDialog cancelDisabled={pendingUncertain} confirmLabel={pendingUncertain?'Reintentar la misma acción':'Confirmar'} open={!!confirm} title={confirm?.status==='active'?'Archivar documento':'Restaurar documento'} description={pendingUncertain?'El resultado está pendiente de confirmación. Reintenta la misma acción antes de cerrar.':'Confirma el cambio de estado de los metadatos.'} loading={busy} error={error} onConfirm={mutate} onCancel={()=>{if(!busy&&!pendingUncertain){setConfirm(null);pending.current=null}}}/>
    </>}
  </div>
}
