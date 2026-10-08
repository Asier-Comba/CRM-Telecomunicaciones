'use client'
import {useEffect,useState} from 'react'
import {useRouter} from 'next/navigation'
import {Customers} from './Customers'
import {CustomerEditor} from './CustomerEditor'
import {useProduct} from '@/features/product/integration/Provider'
import {safeMessage} from '@/features/product/integration/repository'
import {control} from '@/features/product/ui'
import type {CustomerRow} from '@/features/product/model'
import type {TelecomCollectionInputsV1,TelecomCollectionPageV1} from '@/lib/contracts/telecom-collections-v1'
const initial={status:'',owner:'',source:'',lifecycle:'',operator:''}
export function IntegratedCustomers({initialCreate=false}:{initialCreate?:boolean}) {
  const {repository,role}=useProduct(),router=useRouter()
  const [data,setData]=useState<TelecomCollectionPageV1<'customer.list'>|null>(null)
  const [assignees,setAssignees]=useState<TelecomCollectionPageV1<'assignee.list'>|null>(null)
  const [filters,setFilters]=useState(initial),[cursors,setCursors]=useState<string[]>([]),[revision,setRevision]=useState(0)
  const [create,setCreate]=useState(initialCreate&&role!==null&&role!=='viewer'),[error,setError]=useState('')
  useEffect(()=>{
    let active=true
    const input={limit:20,sort:'id_asc',...(cursors.length?{after_id:cursors.at(-1)}:{}),...(filters.status?{status:filters.status}:{}),...(filters.owner?{assigned_user_id:filters.owner}:{}),...(filters.source?{source:filters.source}:{}),...(filters.lifecycle?{lifecycle:filters.lifecycle}:{}),...(filters.operator?{operator_id:filters.operator}:{})} as TelecomCollectionInputsV1['customer.list']
    void repository.collection('customer.list',input).then(v=>{if(active){setData(v);setError('')}}).catch(e=>{if(active){setData(null);setError(safeMessage(e))}})
    return()=>{active=false}
  },[repository,filters,cursors,revision])
  useEffect(()=>{let active=true;void repository.collection('assignee.list',{limit:100,sort:'id_asc'}).then(v=>{if(active)setAssignees(v)}).catch(()=>{if(active)setAssignees(null)});return()=>{active=false}},[repository,revision])
  function filter(key:keyof typeof initial,value:string){setData(null);setError('');setCursors([]);setFilters(v=>({...v,[key]:value}))}
  function reload(){setData(null);setError('');setCursors([]);setRevision(v=>v+1)}
  const rows:CustomerRow[]=(data?.items??[]).map(c=>({id:c.id,name:c.display_name,tradeName:null,status:c.status,lifecycle:c.lifecycle,source:c.source,assignedUserId:c.assigned_user_id,owner:c.assigned_user_id?assignees?.items.find(a=>a.user_id===c.assigned_user_id)?.display_name??'Responsable asignado':'Sin asignar',operators:[],services:null,lines:null,renewal:null,permanence:null,opportunity:null,nextAction:null}))
  return <div className="space-y-4">
    {error&&<div><p role="alert" className="text-sm text-red-700">{error}</p><button className={control} onClick={reload}>Reintentar clientes</button></div>}
    <Customers key={JSON.stringify([filters,cursors,revision])} rows={rows} onCreate={role&&role!=='viewer'?()=>setCreate(true):undefined} collection={{page:cursors.length+1,busy:!data&&!error,hasNext:!!data?.next_id,failed:!!error,values:filters,onFilter:filter,reload,next:()=>{if(data?.next_id){setData(null);setError('');setCursors(v=>[...v,data.next_id!])}},previous:()=>{setData(null);setError('');setCursors(v=>v.slice(0,-1))}}}/>
    <p className="text-xs text-slate-500">Usa la búsqueda global para localizar una empresa. Los filtros de esta vista consultan la colección completa; los recuentos corresponden a la página visible.</p>
    {create&&<CustomerEditor onClose={()=>setCreate(false)} onSaved={receipt=>{setCreate(false);router.push('/clients/'+receipt.id)}}/>}
  </div>
}
