'use client'
import {useEffect,useState}from 'react'
import {useProduct}from './Provider'
import {safeMessage}from './repository'
import {control}from '@/features/product/ui'
import type {TeamListV1}from '@/lib/contracts/team-v1'
/** Only IDs read from the authorized roster or the authenticated actor are offered. */
export function AssigneeSelect({value,onChange,disabled=false,allowClear=false}:{value:string;onChange:(id:string)=>void;disabled?:boolean;allowClear?:boolean}){
 const {repository,role,actorId}=useProduct(),[team,setTeam]=useState<TeamListV1|null>(null),[error,setError]=useState('')
 const privileged=role==='owner'||role==='admin'
 useEffect(()=>{if(!privileged)return;let active=true;void repository.team().then(t=>{if(active){setTeam(t);setError('')}}).catch(e=>{if(active){setTeam(null);setError(safeMessage(e))}});return()=>{active=false}},[repository,privileged])
 const members=team?.items.filter(m=>m.status==='active'&&m.role!=='viewer')??[]
 const choices=privileged?members.map(m=>({id:m.user_id,label:m.user_id===actorId?'Tú':`Usuario ${m.user_id.slice(0,8)} · ${m.role}`})):(actorId?[{id:actorId,label:'Tú'}]:[])
 return <div><label className="block text-sm">Responsable<select aria-label="Responsable autorizado" className={control+' mt-1 w-full'} value={value} disabled={disabled||privileged&&!team} onChange={e=>onChange(e.target.value)}><option value="" disabled={!allowClear}>{allowClear?'Sin responsable':'Seleccionar responsable'}</option>{value&&!choices.some(c=>c.id===value)&&<option value={value}>Responsable actual (fuera de la selección)</option>}{choices.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}{!privileged&&<p className="mt-1 text-xs text-slate-500">La selección para tu rol incluye únicamente tu propia cuenta.</p>}{team?.next_id&&<p className="mt-1 text-xs text-amber-800">Selección parcial: primeros 100 miembros autorizados.</p>}</div>
}
