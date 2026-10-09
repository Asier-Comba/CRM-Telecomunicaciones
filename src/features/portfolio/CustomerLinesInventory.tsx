'use client'
import {useState} from 'react'
import Link from 'next/link'
import {CustomerDomainPages} from '@/features/customers/CustomerDomainPages'
import {customerName,type CustomerIdentity} from '@/features/customers/customer-identity'
import {PortfolioCreate} from './PortfolioCreate'
import {PortfolioRelationSelect} from '@/features/product/integration/PortfolioRelationSelect'
import {useProduct} from '@/features/product/integration/Provider'
import {ProductUiError,safeMessage} from '@/features/product/integration/repository'
import {Drawer,control,primary} from '@/features/product/ui'
import type {PortfolioGetV1,PortfolioReceiptV1} from '@/lib/contracts/portfolio-v1'

export function CustomerLinesInventory({customer,createAllowed=false,onCreated}:{customer:CustomerIdentity;createAllowed?:boolean;onCreated?:()=>void}){
 const {repository,role}=useProduct(),[creating,setCreating]=useState(false),[serviceId,setServiceId]=useState(''),[parent,setParent]=useState<{value:PortfolioGetV1;label:string}|null>(null)
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0),[created,setCreated]=useState<{id:string;name:string}|null>(null)
 async function readParent(id:string){
  const value=await repository.portfolio('service',id)
  if(value.kind!=='service'||value.record.id!==id||value.record.customer_id!==customer.id)throw new ProductUiError('not_found')
  const contract=await repository.portfolio('contract',value.record.contract_id)
  if(contract.kind!=='contract'||contract.record.id!==value.record.contract_id||contract.record.customer_id!==customer.id)throw new ProductUiError('not_found')
  return {value,contract}
 }
 async function prepare(){
  if(!serviceId||busy)return;setBusy(true);setError('')
  try{
   const {value,contract}=await readParent(serviceId)
   if(value.record.source!=='manual'||contract.record.source!=='manual'||!['pending','active','suspended'].includes(value.record.status)||!['draft','active'].includes(contract.record.status)){setError('Selecciona un servicio manual pendiente, activo o suspendido bajo un contrato manual en borrador o activo.');return}
   setParent({value,label:customerName(customer)+' · '+value.record.display_name})
  }catch(e){setError(safeMessage(e))}finally{setBusy(false)}
 }
 async function saved(receipt:PortfolioReceiptV1){
  if(receipt.operation!=='line.create_manual'||receipt.source!=='manual'||parent?.value.kind!=='service')throw new ProductUiError('internal_safe')
  const value=await repository.portfolio('line',receipt.id)
  if(value.kind!=='line'||value.record.id!==receipt.id||value.record.service_id!==parent.value.record.id||value.record.source!=='manual'||value.record.version<receipt.version)throw new ProductUiError('internal_safe')
  const ancestry=await readParent(value.record.service_id)
  if(ancestry.value.record.contract_id!==parent.value.record.contract_id)throw new ProductUiError('internal_safe')
  setCreated({id:value.record.id,name:value.record.display_name??'Línea'});setCreating(false);setParent(null);setRevision(v=>v+1);onCreated?.()
 }
 return <div className="space-y-3">
  {created&&<p role="status">Línea manual registrada: {created.name}. <Link className="font-semibold text-indigo-700" href={'/portfolio?kind=line&id='+created.id}>Ver línea registrada</Link></p>}
  {createAllowed&&role&&role!=='viewer'&&<button className={primary} onClick={()=>{setServiceId('');setParent(null);setError('');setCreating(true)}}>Nueva línea manual</button>}
  <CustomerDomainPages key={revision} area="Líneas" customerId={customer.id}/>
  {creating&&(parent?<PortfolioCreate parent={parent} customers={[]} onClose={()=>{setCreating(false);setParent(null)}} onSaved={saved}/>:<Drawer title="Nueva línea del cliente" onClose={()=>{if(!busy)setCreating(false)}}>
   <div className="space-y-4"><p className="text-sm">Selecciona un servicio de {customerName(customer)}. La línea se registra pendiente, sin asignar número o SIM ni activar nada con el operador.</p>
    <PortfolioRelationSelect kind="service" customerId={customer.id} label="Servicio de la nueva línea" value={serviceId} onChange={setServiceId} disabled={busy}/>
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
    <button className={control} disabled={busy||!serviceId} onClick={()=>void prepare()}>{busy?'Consultando servicio…':'Continuar con el servicio'}</button>
   </div>
  </Drawer>)}
 </div>
}
