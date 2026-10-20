'use client'

import {useEffect,useRef,useState} from 'react'
import {Drawer,control,primary} from '@/features/product/ui'
import {useProduct} from '@/features/product/integration/Provider'
import {ProductUiError,safeMessage} from '@/features/product/integration/repository'
import {exactMinor} from '@/features/customers/CustomerDomainPages'
import {isStrictCalendarDateV1} from '@/lib/server/telecom-runtime-v1'
import type {CatalogInputMapV1,CatalogReceiptV1} from '@/lib/contracts/catalog-v1'
import type {PlanRowV1} from '@/lib/contracts/telecom-collections-v1'

type Input=CatalogInputMapV1['plan_version.create']
type Reviewed=Omit<Input,'command_id'>
type Recorded={receipt:CatalogReceiptV1;input:Input}
type Props={plan:PlanRowV1;onClose:()=>void;onPublished:(id:string)=>void}

function minor(value:string){
 const parts=value.trim().replace(',','.').split('.')
 if(!/^(0|[1-9][0-9]*)$/.test(parts[0])||parts.length>2||parts[1]!==undefined&&!/^[0-9]{1,2}$/.test(parts[1]))throw new ProductUiError('validation')
 const amount=BigInt(parts[0])*100n+BigInt((parts[1]??'').padEnd(2,'0'))
 if(amount>9223372036854775807n)throw new ProductUiError('validation')
 return amount.toString()
}

export function CatalogVersionCreate(props:Props){
 const {role,actorId,workspaceId}=useProduct()
 if(role!=='owner'&&role!=='admin')return null
 return <ScopedVersionCreate key={JSON.stringify([props.plan.id,actorId,workspaceId,role])} {...props}/>
}

function ScopedVersionCreate({plan:initialPlan,onClose,onPublished}:Props){
 const {repository}=useProduct()
 const [plan,setPlan]=useState<PlanRowV1|null>(null),[revision,setRevision]=useState(0),[loading,setLoading]=useState(true)
 const [from,setFrom]=useState(''),[until,setUntil]=useState(''),[currency,setCurrency]=useState('EUR'),[monthly,setMonthly]=useState(''),[setup,setSetup]=useState('')
 const [review,setReview]=useState<Reviewed|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>(null)
 const [recorded,setRecorded]=useState<Recorded|null>(null),[verified,setVerified]=useState(false)
 const pending=useRef<Input|null>(null),confirmed=useRef<Recorded|null>(null),inFlight=useRef(false),mounted=useRef(true)
 const uncertain=!recorded&&error instanceof ProductUiError&&['transport_uncertain','internal_safe'].includes(error.code)
 const conflict=!recorded&&error instanceof ProductUiError&&error.code==='conflict'
 const denied=error instanceof ProductUiError&&error.code==='access_denied'
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[])
 useEffect(()=>{
  let active=true
  queueMicrotask(()=>{if(active){setLoading(true);setPlan(null)}})
  void repository.collection('plan.get',{id:initialPlan.id}).then(result=>{
   if(!active)return
   if(result.record.id!==initialPlan.id)throw new ProductUiError('internal_safe')
   setPlan(result.record);setLoading(false)
  }).catch(e=>{if(active){setError(e);setLoading(false)}})
  return()=>{active=false}
 },[repository,initialPlan.id,revision])

 function prepare(){
  setError(null)
  try{
   if(!plan||plan.status!=='active'||!isStrictCalendarDateV1(from)||until&&(!isStrictCalendarDateV1(until)||until<from))throw new ProductUiError('validation')
   setReview(Object.freeze({plan_id:plan.id,expected_version:plan.version,valid_from:from,valid_until:until||null,currency,recurring_amount_minor:minor(monthly),one_time_amount_minor:minor(setup),is_bundle:false,components:Object.freeze([Object.freeze({component_kind:'base' as const,service_kind:plan.service_kind,addon_code:null,quantity:1})]),entitlements:Object.freeze([])}))
  }catch(e){setError(e)}
 }
 async function recover(saved:Recorded){
  const {receipt,input}=saved
  const row=(await repository.collection('plan_version.get',{id:receipt.id})).record
  if(!mounted.current)return
  if(row.id!==receipt.id||row.plan_id!==input.plan_id||row.version_number!==receipt.version_number||row.valid_from!==input.valid_from||row.valid_until!==input.valid_until||row.currency!==input.currency||row.recurring_amount_minor!==input.recurring_amount_minor)throw new ProductUiError('internal_safe')
  const terms=(await repository.telecom('plan_version.terms_get',{id:receipt.id})).record
  if(!mounted.current)return
  const component=terms.components[0]
  if(terms.id!==receipt.id||terms.plan_id!==input.plan_id||terms.version_number!==receipt.version_number||terms.terms_status!=='published'||terms.recurring_period!=='month'||terms.valid_from!==input.valid_from||terms.valid_until!==input.valid_until||terms.currency!==input.currency||terms.recurring_amount_minor!==input.recurring_amount_minor||terms.one_time_amount_minor!==input.one_time_amount_minor||terms.is_bundle!==false||terms.components.length!==1||component?.component_kind!=='base'||component.service_kind!==input.components[0].service_kind||component.quantity!==1||component.addon_code!==null||terms.entitlements.length!==0)throw new ProductUiError('internal_safe')
  setVerified(true);setError(null)
 }
 async function execute(){
  if(inFlight.current||confirmed.current||!review||denied||conflict)return
  inFlight.current=true;setBusy(true);setError(null)
  try{
   pending.current??=Object.freeze({...review,command_id:crypto.randomUUID()})
   const receipt=await repository.telecom('plan_version.create',pending.current)
   if(!mounted.current)return
   const saved={receipt,input:pending.current};confirmed.current=saved;setRecorded(saved);pending.current=null
   await recover(saved)
  }catch(e){if(mounted.current){setError(e);if(confirmed.current||!(e instanceof ProductUiError&&['transport_uncertain','internal_safe'].includes(e.code)))pending.current=null}}
  finally{inFlight.current=false;if(mounted.current)setBusy(false)}
 }
 async function reread(){
  if(inFlight.current||!confirmed.current)return
  inFlight.current=true;setBusy(true);setError(null)
  try{await recover(confirmed.current)}catch(e){if(mounted.current)setError(e)}finally{inFlight.current=false;if(mounted.current)setBusy(false)}
 }
 function refresh(){if(busy||uncertain||recorded)return;pending.current=null;setReview(null);setError(null);setRevision(v=>v+1)}
 const locked=busy||uncertain||!!review||!!recorded||denied||conflict
 return <Drawer title={'Nueva versión de '+(plan?.display_name??initialPlan.display_name)} closeDisabled={busy||uncertain} onClose={()=>{if(!busy&&!uncertain)onClose()}}>
  <p className="text-sm text-slate-600">Publica los precios de un servicio simple. Se registrará un componente base de la tarifa, sin prestaciones adicionales ni paquete convergente. No modifica versiones vendidas ni contratos existentes.</p>
  {error!==null&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{uncertain?'No se pudo confirmar el resultado. Comprueba la misma publicación antes de salir.':safeMessage(error)}</p>}
  {loading?<p role="status">Consultando la versión actual de la tarifa…</p>:!plan?<button className={control} onClick={refresh}>Reintentar lectura de tarifa</button>:plan.status!=='active'?<p role="status">La tarifa está retirada. No se puede publicar una nueva versión.</p>:recorded?<div className="space-y-3 rounded-lg border bg-slate-50 p-4">
   <p role="status" className="text-sm font-semibold">{verified?'Versión publicada y recuperada':'Publicación registrada; recuperación pendiente'} · versión {recorded.receipt.version_number}</p>
   <p className="text-sm">Cuota mensual: {exactMinor(recorded.input.recurring_amount_minor,recorded.input.currency)} · Alta: {exactMinor(recorded.input.one_time_amount_minor,recorded.input.currency)}</p>
   {verified?<button className={primary} onClick={()=>onPublished(recorded.receipt.id)}>Ver condiciones publicadas</button>:<button className={primary} disabled={busy} onClick={()=>void reread()}>Recuperar versión registrada</button>}
  </div>:<form className="space-y-4" onSubmit={e=>{e.preventDefault();prepare()}}>
   <fieldset disabled={locked} className="space-y-3">
    <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm">Vigencia desde<input type="date" required min="1900-01-01" max="2199-12-31" className={control+' mt-1 w-full'} value={from} onChange={e=>setFrom(e.target.value)}/></label><label className="block text-sm">Vigencia hasta<input type="date" min={from||'1900-01-01'} max="2199-12-31" className={control+' mt-1 w-full'} value={until} onChange={e=>setUntil(e.target.value)}/><span className="text-xs text-slate-500">Opcional. Ambos extremos se incluyen.</span></label></div>
    <label className="block text-sm">Divisa<select className={control+' mt-1 w-full'} value={currency} onChange={e=>setCurrency(e.target.value)}>{['EUR','USD','GBP'].map(v=><option key={v}>{v}</option>)}</select></label>
    <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm">Cuota mensual<input inputMode="decimal" required maxLength={22} className={control+' mt-1 w-full'} value={monthly} onChange={e=>setMonthly(e.target.value)}/></label><label className="block text-sm">Alta o instalación<input inputMode="decimal" required maxLength={22} className={control+' mt-1 w-full'} value={setup} onChange={e=>setSetup(e.target.value)}/></label></div>
   </fieldset>
   <p className="text-xs text-slate-500">Importes en la divisa seleccionada, con hasta dos decimales. Introduce cero si no hay coste de alta. Las versiones son inmutables: una vigencia abierta no podrá acortarse; no se permiten fechas solapadas.</p>
   {conflict?<button type="button" className={control} onClick={refresh}>Recargar tarifa y revisar</button>:uncertain?<button type="button" className={primary} disabled={busy} onClick={()=>void execute()}>Comprobar la misma publicación</button>:review?<div className="space-y-3 rounded-lg bg-indigo-50 p-3"><p className="text-sm font-semibold">{plan.display_name} · revisión {review.expected_version}</p><p className="text-sm">Cuota mensual: {exactMinor(review.recurring_amount_minor,review.currency)} · Alta: {exactMinor(review.one_time_amount_minor,review.currency)}</p><p className="text-sm">{review.valid_from} — {review.valid_until??'Sin fin'}. La confirmación publica condiciones inmutables.</p><div className="flex flex-wrap gap-2"><button type="button" className={primary} disabled={busy||denied} onClick={()=>void execute()}>Confirmar publicación</button><button type="button" className={control} disabled={busy||denied} onClick={()=>setReview(null)}>Volver a editar versión</button></div></div>:<button className={primary} disabled={denied}>Revisar versión</button>}
  </form>}
 </Drawer>
}
