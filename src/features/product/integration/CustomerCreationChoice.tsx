'use client'
import {useState,type ReactNode} from 'react'
import {Drawer,primary} from '@/features/product/ui'
import {CustomerSelect} from './CustomerSelect'
import {useProduct} from './Provider'
import {safeMessage} from './repository'
import {customerCollectionIdentity} from '@/features/customers/customer-identity'
export function CustomerCreationChoice({customerId,title,onClose,children}:{customerId?:string;title:string;onClose:()=>void;children:(id:string)=>ReactNode}){
 const {repository}=useProduct(),[selected,setSelected]=useState(customerId),[choice,setChoice]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 if(selected)return children(selected)
 return <Drawer title={title} onClose={()=>{if(!busy)onClose()}}><CustomerSelect value={choice} onChange={setChoice} disabled={busy} inputLabel={'Buscar cliente para '+title} clearLabel="Selecciona cliente"/>{error&&<p role="alert">{error}</p>}<button className={primary} disabled={busy||!choice} onClick={()=>{setBusy(true);setError('');void customerCollectionIdentity(repository,choice).then(c=>{if(c.status!=='active'){setError('El cliente debe estar activo.');return}setSelected(c.id)}).catch(e=>setError(safeMessage(e))).finally(()=>setBusy(false))}}>Continuar con el cliente</button></Drawer>
}
