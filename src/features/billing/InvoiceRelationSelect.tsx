'use client'
import {useCallback,useEffect,useState} from 'react'
import {useProduct} from '@/features/product/integration/Provider'
import {ProductUiError,safeMessage} from '@/features/product/integration/repository'
import {control,statusLabel} from '@/features/product/ui'
import {productDate} from '@/features/product/presentation'
import type {InvoiceLink} from './model'

type Kind=InvoiceLink['kind']
const labels={contractId:'Contrato',serviceId:'Servicio',opportunityId:'Oportunidad'}
const operations={contractId:'contract.list',serviceId:'service.list',opportunityId:'opportunity.list'} as const
type Props={kind:Kind;customerId:string;contractId:string|null;value:string;onChange:(id:string)=>void;onVerified:(kind:Kind,id:string,link:InvoiceLink|null)=>void}
const emptyCursors:string[]=[]
const predecessor=(id:string)=>{if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id))throw new ProductUiError('validation');const n=BigInt('0x'+id.replaceAll('-',''));if(n===BigInt(0))return null;const h=(n-BigInt(1)).toString(16).padStart(32,'0');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20)}

/** Bounded ordinary reads, selected-id verification and no inferred relationships. */
export function InvoiceRelationSelect({kind,customerId,contractId,value,onChange,onVerified}:Props){
 const {repository}=useProduct(),scope=JSON.stringify([kind,customerId,kind==='serviceId'?contractId:null]),[paging,setPaging]=useState<{scope:string;cursors:string[]}>(),cursors=paging?.scope===scope?paging.cursors:emptyCursors,[revision,setRevision]=useState(0),key=JSON.stringify([scope,cursors,revision]),[state,setState]=useState<{key:string;items?:InvoiceLink[];next?:string|null;error?:string}>(),[selected,setSelected]=useState<{key:string;link:InvoiceLink|null}>(),selectedKey=JSON.stringify([key,value]),current=state?.key===key?state:undefined,selectedLink=selected?.key===selectedKey?selected.link:null
 const read=useCallback(async(after:string|null,limit:number)=>{
  const page=await repository.collection(operations[kind],{customer_id:customerId,limit,sort:'id_asc',...(after?{after_id:after}:{}),...(kind==='serviceId'&&contractId?{contract_id:contractId}:{})})
  const items=page.items.map(row=>{if(row.customer_id!==customerId||kind==='serviceId'&&contractId&&(!('contract_id'in row)||row.contract_id!==contractId))throw new ProductUiError('internal_safe');const title='title'in row?row.title:'display_name'in row?row.display_name:'start_date'in row?'Contrato del '+productDate(row.start_date):null;if(!title)throw new ProductUiError('internal_safe');return{kind,id:row.id,customerId:row.customer_id,label:title+' · '+statusLabel(row.status),...('contract_id'in row?{contractId:row.contract_id}:{})}})
  return {items,next:page.next_id}
 },[repository,kind,customerId,contractId])
 useEffect(()=>{if(!customerId)return;let active=true;void read(cursors.at(-1)??null,20).then(result=>{if(active)setState({key,...result})}).catch(error=>{if(active)setState({key,error:safeMessage(error)})});return()=>{active=false}
 },[read,key,customerId,cursors])
 useEffect(()=>{if(!customerId||!value){onVerified(kind,value,null);return}let active=true;onVerified(kind,value,null);void Promise.resolve().then(()=>read(predecessor(value),1)).then(result=>{if(!active)return;const link=result.items[0]?.id===value?result.items[0]:null;setSelected({key:selectedKey,link});onVerified(kind,value,link)}).catch(()=>{if(active){setSelected({key:selectedKey,link:null});onVerified(kind,value,null)}});return()=>{active=false}
 },[read,selectedKey,customerId,kind,value,onVerified])
 const outside=!!value&&!current?.items?.some(link=>link.id===value)
 return <div className="min-w-0 space-y-2"><label className="block text-xs text-slate-500">{labels[kind]}<select aria-label={labels[kind]+' de factura'} className={control+' mt-1 w-full'} value={value} disabled={!customerId||!current?.items} onChange={event=>onChange(event.target.value)}><option value="">Sin vínculo</option>{outside&&<option value={value} disabled={!selectedLink}>{selectedLink?.label??'Relación no disponible'}</option>}{current?.items?.map(link=><option key={link.id} value={link.id}>{link.label}</option>)}</select></label>{value&&selectedLink&&<p data-invoice-relation-current={kind} className="break-words text-xs text-slate-600">{selectedLink.label}</p>}{current?.error&&<p role="alert" className="text-xs text-red-700">{current.error}</p>}{value&&selected?.key===selectedKey&&!selectedLink&&<p role="status" className="text-xs text-amber-800">La relación seleccionada no está disponible para este cliente y contrato.</p>}<div className="flex flex-wrap gap-2"><button type="button" className={control} disabled={!current?.items||!cursors.length} onClick={()=>setPaging({scope,cursors:cursors.slice(0,-1)})}>Vínculos anteriores de {labels[kind].toLowerCase()}</button><button type="button" className={control} disabled={!current?.next} onClick={()=>{if(current?.next)setPaging({scope,cursors:[...cursors,current.next]})}}>Más vínculos de {labels[kind].toLowerCase()}</button><button type="button" className={control} disabled={!customerId} onClick={()=>setRevision(v=>v+1)}>Actualizar vínculos de {labels[kind].toLowerCase()}</button></div></div>
}
