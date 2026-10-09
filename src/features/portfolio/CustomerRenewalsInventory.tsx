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
import {productDate} from '@/features/product/presentation'
import type {PortfolioGetV1,PortfolioReceiptV1} from '@/lib/contracts/portfolio-v1'

export function CustomerRenewalsInventory({customer,createAllowed=false,onCreated}:{customer:CustomerIdentity;createAllowed?:boolean;onCreated?:()=>void}){
 const {repository,role}=useProduct(),[creating,setCreating]=useState(false),[contractId,setContractId]=useState(''),[parent,setParent]=useState<{value:PortfolioGetV1;label:string}|null>(null)
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0),[created,setCreated]=useState<{id:string;date:string}|null>(null)
 async function prepare(){
  if(!contractId||busy)return;setBusy(true);setError('')
  try{
   const value=await repository.portfolio('contract',contractId)
   if(value.kind!=='contract'||value.record.id!==contractId||value.record.customer_id!==customer.id)throw new ProductUiError('not_found')
   if(value.record.source!=='manual'||!['draft','active'].includes(value.record.status)){setError('Selecciona un contrato manual en borrador o activo para registrar el seguimiento.');return}
   setParent({value,label:customerName(customer)+' · contrato del '+productDate(value.record.start_date)})
  }catch(e){setError(safeMessage(e))}finally{setBusy(false)}
 }
 async function saved(receipt:PortfolioReceiptV1){
  if(receipt.operation!=='contract.record_renewal'||receipt.source!=='manual'||parent?.value.kind!=='contract')throw new ProductUiError('internal_safe')
  const value=await repository.portfolio('renewal',receipt.id)
  if(value.kind!=='renewal'||value.record.id!==receipt.id||value.record.contract_id!==parent.value.record.id||value.record.source!=='manual'||value.record.version<receipt.version)throw new ProductUiError('internal_safe')
  const contract=await repository.portfolio('contract',value.record.contract_id)
  if(contract.kind!=='contract'||contract.record.id!==parent.value.record.id||contract.record.customer_id!==customer.id)throw new ProductUiError('internal_safe')
  setCreated({id:value.record.id,date:value.record.target_on});setCreating(false);setParent(null);setRevision(v=>v+1);onCreated?.()
 }
 return <div className="space-y-3">
  {created&&<p role="status">Seguimiento de renovación registrado para el {productDate(created.date)}. <Link className="font-semibold text-indigo-700" href={'/portfolio?kind=renewal&id='+created.id}>Ver renovación registrada</Link></p>}
  {createAllowed&&role&&role!=='viewer'&&<button className={primary} onClick={()=>{setContractId('');setParent(null);setError('');setCreating(true)}}>Nueva renovación manual</button>}
  <CustomerDomainPages key={revision} area="Renovaciones" customerId={customer.id}/>
  {creating&&(parent?<PortfolioCreate parent={parent} customers={[]} renewalOnly onClose={()=>{setCreating(false);setParent(null)}} onSaved={saved}/>:<Drawer title="Nueva renovación del cliente" onClose={()=>{if(!busy)setCreating(false)}}>
   <div className="space-y-4"><p className="text-sm">Selecciona un contrato de {customerName(customer)} para registrar su fecha de seguimiento.</p>
    <PortfolioRelationSelect kind="contract" customerId={customer.id} label="Contrato de la renovación" value={contractId} onChange={setContractId} disabled={busy}/>
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
    <button className={control} disabled={busy||!contractId} onClick={()=>void prepare()}>{busy?'Consultando contrato…':'Continuar con el contrato'}</button>
   </div>
  </Drawer>)}
 </div>
}
