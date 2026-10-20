'use client'
import {useEffect,useState} from 'react'
import {useProduct} from '@/features/product/integration/Provider'
import {ProductUiError,safeMessage} from '@/features/product/integration/repository'
import {exactMinor} from '@/features/customers/CustomerDomainPages'
import {control} from '@/features/product/ui'
import type {CatalogTermsV1} from '@/lib/contracts/catalog-v1'

export function ServiceSoldVersion({id,operatorId,startDate,serviceKind,value,disabled,onChange}:{id:string|null;operatorId:string;startDate:string;serviceKind:string;value:string|null;disabled:boolean;onChange:(id:string|null)=>void}){
 const {repository}=useProduct(),[revision,setRevision]=useState(0)
 const key=JSON.stringify([id,operatorId,startDate,serviceKind,revision])
 const [state,setState]=useState<{key:string;terms?:CatalogTermsV1;error?:string}>()
 const current=state?.key===key?state:undefined
 useEffect(()=>{
  if(!id)return
  let active=true
  void Promise.all([repository.collection('plan_version.get',{id}),repository.telecom('plan_version.terms_get',{id})]).then(([header,result])=>{
   const t=result.record,h=header.record
   if(t.id!==id||h.id!==id||t.plan_id!==h.plan_id||h.operator_id!==operatorId||h.version_number!==t.version_number||h.currency!==t.currency||h.recurring_amount_minor!==t.recurring_amount_minor)throw new ProductUiError('internal_safe')
   if(t.terms_status!=='published'||t.is_bundle!==false||t.recurring_period!=='month'||t.recurring_amount_minor===null||t.one_time_amount_minor===null||t.valid_from>startDate||t.valid_until!==null&&t.valid_until<startDate||h.service_kind!==serviceKind||t.components.filter(c=>c.component_kind==='base').length!==1||!t.components.some(c=>c.component_kind==='base'&&c.service_kind===serviceKind&&c.quantity===1)){
    if(active)setState({key,error:'La versión vendida no es una tarifa publicada de un único servicio compatible. Puedes registrar el servicio sin asignarle una tarifa.'})
    return
   }
   if(active)setState({key,terms:t})
  }).catch(e=>{if(active)setState({key,error:safeMessage(e)})})
  return()=>{active=false}
 },[repository,id,operatorId,startDate,serviceKind,key])
 if(!id)return <p className="text-sm text-slate-500">El contrato no tiene una versión vendida. El servicio se registrará sin tarifa ni precio asignados.</p>
 return <section aria-label="Tarifa vendida del nuevo servicio" className="space-y-2 rounded-lg border p-3">
  {!current?<p role="status">Consultando la versión vendida del contrato…</p>:current.error?<><p role="alert" className="text-sm text-amber-800">{current.error}</p><button type="button" className={control} disabled={disabled} onClick={()=>{onChange(null);setRevision(n=>n+1)}}>Reintentar versión del servicio</button></>:current.terms&&<>
   <p className="text-sm">Versión vendida {current.terms.version_number}</p>
   <p className="text-sm">Cuota mensual: {exactMinor(current.terms.recurring_amount_minor,current.terms.currency)}</p>
   <p className="text-sm">Alta: {exactMinor(current.terms.one_time_amount_minor,current.terms.currency)}</p>
   <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={value===id} disabled={disabled} onChange={e=>onChange(e.target.checked?id:null)}/>Asignar al servicio la versión vendida del contrato</label>
  </>}
  <p className="text-xs text-slate-500">{value?'Conserva estas condiciones publicadas. La cuota pertenece a la tarifa; no añade otro cargo al contrato ni a la línea.':'Sin selección explícita, el servicio no tendrá una versión de tarifa ni precio asignados.'}</p>
 </section>
}
