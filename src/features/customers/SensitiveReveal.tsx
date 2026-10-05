'use client'
import {useEffect,useRef,useState} from 'react'
import {useProduct} from '@/features/product/integration/Provider'
import {safeMessage,ProductUiError} from '@/features/product/integration/repository'
import {Drawer,control,primary} from '@/features/product/ui'
import type {SensitiveInputV1} from '@/lib/contracts/sensitive-v1'
const labels={email:'Correo del contacto',phone:'Teléfono del contacto',fiscal_id:'Identificación fiscal del cliente'}
/** Each display or copy obtains a fresh, requested-field-only authorization and audit. */
export function SensitiveReveal({entityKind,entityId,field}:{entityKind:'contact'|'customer';entityId:string;field:'email'|'phone'|'fiscal_id'}){
 const {role}=useProduct(),allowed=!!role&&role!=='viewer'&&(field!=='fiscal_id'||role==='owner'||role==='admin'),[open,setOpen]=useState(false)
 if(!allowed)return null
 return <><button type="button" className={control} onClick={()=>setOpen(true)}>{field==='email'?'Revelar correo':field==='phone'?'Revelar teléfono':'Revelar identificación fiscal'}</button>{open&&<RevealPanel input={{entity_kind:entityKind,entity_id:entityId,fields:[field]}} field={field} onClose={()=>setOpen(false)}/>}</>
}
function RevealPanel({input,field,onClose}:{input:SensitiveInputV1;field:'email'|'phone'|'fiscal_id';onClose:()=>void}){
 const {repository}=useProduct(),[value,setValue]=useState<string|null|undefined>(undefined),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),mounted=useRef(true)
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[])
 async function read(copy=false){if(busy)return;setBusy(true);setValue(undefined);setError('');setNotice('');try{
  const result=await repository.sensitive(input),next=result.values[field];if(!mounted.current)return;setValue(next)
  if(copy&&next!==null&&next!==undefined){try{await navigator.clipboard.writeText(next);if(mounted.current)setNotice('Campo copiado tras comprobar de nuevo tus permisos.')}catch{if(mounted.current)setError('No se pudo copiar. Puedes seleccionar el campo mostrado.')}}
 }catch(e){if(mounted.current)setError(safeMessage(e instanceof ProductUiError?e:new ProductUiError('internal_safe')))}finally{if(mounted.current)setBusy(false)}}
 return <Drawer title={labels[field]} onClose={()=>{if(!busy){mounted.current=false;setValue(undefined);onClose()}}}><p className="text-sm text-slate-500">Se solicitará únicamente este campo. Cada consulta comprueba tus permisos actuales y registra el acceso sin guardar el valor en la auditoría.</p>{value!==undefined&&<div className="break-all rounded-lg border bg-slate-50 p-4 text-sm" data-sensitive-value>{value??'Campo no registrado.'}</div>}{busy&&<p role="status" className="text-sm text-slate-500">Consultando campo autorizado…</p>}{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}{notice&&<p role="status" className="text-sm text-emerald-700">{notice}</p>}<div className="flex flex-wrap gap-2"><button className={primary} disabled={busy} onClick={()=>void read()}>Consultar campo autorizado</button>{value!==undefined&&value!==null&&<button className={control} disabled={busy} onClick={()=>void read(true)}>Copiar campo autorizado</button>}</div><p className="text-xs text-slate-500">El valor visible se elimina al cerrar. Copiarlo lo guarda en el portapapeles del dispositivo.</p></Drawer>
}
