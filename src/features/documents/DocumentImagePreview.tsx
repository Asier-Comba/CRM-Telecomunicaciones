'use client'
import {useEffect,useRef,useState} from 'react'
import Image from 'next/image'
import {useProduct} from '@/features/product/integration/Provider'
import {ProductUiError,safeMessage} from '@/features/product/integration/repository'
import {Drawer,control,primary} from '@/features/product/ui'
import type {DocumentMetadataV1} from '@/lib/contracts/document-v1'
import type {DocumentContentInputsV1,DocumentContentReceiptV1} from '@/lib/contracts/document-content-v1'
/** Image-only mounted preview; no remote image source, public URL or persistent cache. */
export function DocumentImagePreview({document,onClose}:{document:DocumentMetadataV1;onClose:()=>void}){
 const {repository}=useProduct(),[url,setUrl]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>(null),intent=useRef<DocumentContentInputsV1['document.request_download']|null>(null),ticket=useRef<DocumentContentReceiptV1|null>(null)
 useEffect(()=>()=>{if(url)URL.revokeObjectURL(url)},[url])
 async function show(){if(busy)return;setBusy(true);setError(null);setUrl(null);try{
  if(!['image/png','image/jpeg'].includes(document.media_type??''))throw new ProductUiError('unavailable')
  intent.current??=Object.freeze({command_id:crypto.randomUUID(),id:document.id,expected_version:document.version});ticket.current??=await repository.contentCommand('document.request_download',intent.current);if(!ticket.current.ticket_id)throw new ProductUiError('internal_safe')
  const bytes=await repository.downloadDocument(document.id,ticket.current.ticket_id);if(bytes.type!==document.media_type||bytes.size<1||bytes.size>10485760)throw new ProductUiError('internal_safe');setUrl(URL.createObjectURL(bytes));intent.current=null;ticket.current=null
 }catch(e){setError(e);if(!(e instanceof ProductUiError&&e.code==='transport_uncertain')){intent.current=null;ticket.current=null}}finally{setBusy(false)}}
 return <Drawer title="Vista previa de imagen" onClose={()=>{if(!busy)onClose()}}><p className="text-sm text-slate-500">La imagen se obtiene mediante un acceso privado que comprueba tus permisos actuales. PNG o JPEG; sin análisis antivirus ni certificación de integridad.</p>{url&&<div className="relative h-[50dvh] min-h-48 rounded-xl border bg-slate-50"><Image src={url} alt="Vista previa del documento" fill unoptimized sizes="(max-width: 640px) 90vw, 600px" className="object-contain" onError={()=>{setUrl(null);setError(new ProductUiError('internal_safe'))}}/></div>}{!!error&&<p role="alert" className="text-sm text-red-700">{safeMessage(error)}</p>}{busy&&<p role="status" className="text-sm text-slate-500">Consultando imagen autorizada…</p>}<button className={url?control:primary} disabled={busy} onClick={()=>void show()}>{url?'Consultar imagen de nuevo':error?'Reintentar vista previa':'Mostrar imagen autorizada'}</button><p className="text-xs text-slate-500">La copia temporal se descarta al cerrar este panel. Los PDF se descargan como adjuntos.</p></Drawer>
}
