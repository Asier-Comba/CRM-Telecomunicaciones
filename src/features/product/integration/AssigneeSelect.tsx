'use client'
import {useEffect,useState} from 'react'
import {useProduct} from './Provider'
import {safeMessage} from './repository'
import {control} from '@/features/product/ui'
import type {TelecomCollectionPageV1} from '@/lib/contracts/telecom-collections-v1'
/** Ordinary active assignees, available to every normal reader role. */
export function AssigneeSelect({value,onChange,disabled=false,allowClear=false}:{value:string;onChange:(id:string)=>void;disabled?:boolean;allowClear?:boolean}) {
  const {repository,actorId}=useProduct()
  const [page,setPage]=useState<TelecomCollectionPageV1<'assignee.list'>|null>(null)
  const [cursors,setCursors]=useState<string[]>([]),[error,setError]=useState(''),[revision,setRevision]=useState(0)
  useEffect(()=>{
    let active=true
    void repository.collection('assignee.list',{limit:100,sort:'id_asc',...(cursors.length?{after_id:cursors.at(-1)}:{})}).then(v=>{if(active){setPage(v);setError('')}}).catch(e=>{if(active){setPage(null);setError(safeMessage(e))}})
    return()=>{active=false}
  },[repository,cursors,revision])
  const choices=page?.items??[]
  function previous(){setPage(null);setError('');setCursors(v=>v.slice(0,-1))}
  function next(){if(page?.next_id){setPage(null);setError('');setCursors(v=>[...v,page.next_id!])}}
  return <div className="space-y-2">
    <label className="block text-sm">Responsable<select aria-label="Responsable autorizado" className={control+' mt-1 w-full'} value={value} disabled={disabled||!page} onChange={e=>onChange(e.target.value)}>
      <option value="" disabled={!allowClear}>{allowClear?'Sin responsable':'Seleccionar responsable'}</option>
      {value&&!choices.some(c=>c.user_id===value)&&<option value={value} disabled>Responsable actual · fuera de esta página</option>}
      {choices.map(c=><option key={c.user_id} value={c.user_id}>{c.display_name}{c.user_id===actorId?' · Tú':''}</option>)}
    </select></label>
    {!page&&!error&&<p role="status" className="text-xs text-slate-500">Consultando responsables…</p>}
    {error&&<div><p role="alert" className="text-sm text-red-700">{error}</p><button type="button" className={control} onClick={()=>{setError('');setRevision(v=>v+1)}}>Reintentar responsables</button></div>}
    {(cursors.length>0||page?.next_id)&&<div className="flex flex-wrap items-center gap-2 text-xs"><button type="button" className={control} disabled={disabled||!page||!cursors.length} onClick={previous}>Responsables anteriores</button><span>Página {cursors.length+1}</span><button type="button" className={control} disabled={disabled||!page?.next_id} onClick={next}>Más responsables</button></div>}
  </div>
}
