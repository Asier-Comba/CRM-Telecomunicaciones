'use client'
import {useEffect,useRef,useState} from 'react'
import Image from 'next/image'
import {useProduct} from '@/features/product/integration/Provider'
import {ProductUiError,safeMessage} from '@/features/product/integration/repository'
import {Drawer,control,primary} from '@/features/product/ui'
import type {DocumentMetadataV1} from '@/lib/contracts/document-v1'
import type {DocumentContentInputsV1,DocumentContentReceiptV1} from '@/lib/contracts/document-content-v1'

type PreviewLifetime={scope:string;active:boolean;busy:boolean;url:string|null;intent:DocumentContentInputsV1['document.request_download']|null;ticket:DocumentContentReceiptV1|null}
/** Image-only mounted preview; every read still requires current backend authorization. */
export function DocumentImagePreview({document,onClose}:{document:DocumentMetadataV1;onClose:()=>void}){
 const {repository,actorId,workspaceId,role}=useProduct()
 const scope=JSON.stringify([actorId,workspaceId,role,document.id,document.version,document.media_type])
 const lifetime=useRef<PreviewLifetime|null>(null)
 const [state,setState]=useState<{scope:string;url:string|null;busy:boolean;error:unknown}|null>(null)
 const current=state?.scope===scope?state:null,url=current?.url??null,busy=current?.busy??false,error=current?.error??null
 useEffect(()=>{
  const mounted:PreviewLifetime={scope,active:true,busy:false,url:null,intent:null,ticket:null}
  lifetime.current=mounted
  queueMicrotask(()=>{if(mounted.active)setState({scope,url:null,busy:false,error:null})})
  return()=>{mounted.active=false;if(mounted.url)URL.revokeObjectURL(mounted.url);mounted.url=null;mounted.intent=null;mounted.ticket=null;if(lifetime.current===mounted)lifetime.current=null}
 },[repository,scope])
 async function show(){
  const mounted=lifetime.current
  if(!mounted?.active||mounted.scope!==scope||mounted.busy)return
  mounted.busy=true
  if(mounted.url)URL.revokeObjectURL(mounted.url)
  mounted.url=null;setState({scope,url:null,busy:true,error:null})
  try{
   if(!['image/png','image/jpeg'].includes(document.media_type??''))throw new ProductUiError('unavailable')
   mounted.intent??=Object.freeze({command_id:crypto.randomUUID(),id:document.id,expected_version:document.version})
   if(!mounted.ticket){const receipt=await repository.contentCommand('document.request_download',mounted.intent);if(!mounted.active)return;mounted.ticket=receipt}
   if(!mounted.ticket.ticket_id)throw new ProductUiError('internal_safe')
   const bytes=await repository.downloadDocument(document.id,mounted.ticket.ticket_id)
   if(!mounted.active)return
   if(bytes.type!==document.media_type||bytes.size<1||bytes.size>10485760)throw new ProductUiError('internal_safe')
   mounted.url=URL.createObjectURL(bytes);mounted.intent=null;mounted.ticket=null
   setState({scope,url:mounted.url,busy:true,error:null})
  }catch(e){
   if(mounted.active)setState({scope,url:null,busy:true,error:e})
   if(!(e instanceof ProductUiError&&e.code==='transport_uncertain')){mounted.intent=null;mounted.ticket=null}
  }finally{mounted.busy=false;if(mounted.active)setState(previous=>previous?.scope===scope?{...previous,busy:false}:previous)}
 }
 function discard(failedUrl:string|null){const mounted=lifetime.current;if(!mounted?.active||mounted.scope!==scope||mounted.url!==failedUrl)return;if(mounted.url)URL.revokeObjectURL(mounted.url);mounted.url=null;setState({scope,url:null,busy:mounted.busy,error:new ProductUiError('internal_safe')})}
 return <Drawer title="Vista previa de imagen" onClose={()=>{if(!busy)onClose()}}><p className="text-sm text-slate-500">La imagen se obtiene mediante un acceso privado que comprueba tus permisos actuales. PNG o JPEG; sin análisis antivirus ni certificación de integridad.</p>{url&&<div className="relative h-[50dvh] min-h-48 rounded-xl border bg-slate-50"><Image src={url} alt="Vista previa del documento" fill unoptimized sizes="(max-width: 640px) 90vw, 600px" className="object-contain" onError={()=>discard(url)}/></div>}{!!error&&<p role="alert" className="text-sm text-red-700">{safeMessage(error)}</p>}{busy&&<p role="status" className="text-sm text-slate-500">Consultando imagen autorizada…</p>}<button className={url?control:primary} disabled={busy} onClick={()=>void show()}>{url?'Consultar imagen de nuevo':error?'Reintentar vista previa':'Mostrar imagen autorizada'}</button><p className="text-xs text-slate-500">La copia temporal se descarta al cerrar este panel. Los PDF se descargan como adjuntos.</p></Drawer>
}
