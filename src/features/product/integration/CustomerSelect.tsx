'use client'
import { useEffect, useState } from 'react'
import { useProduct } from './Provider'
import { safeMessage } from './repository'
import { control } from '@/features/product/ui'
/** Company identity only; global search is not a complete inventory. */
export function CustomerSelect({value,onChange,disabled=false,inputLabel='Buscar empresa para agenda',clearLabel='Sin cliente'}:{value:string;onChange:(id:string)=>void;disabled?:boolean;inputLabel?:string;clearLabel?:string}){
 const {repository}=useProduct(),[query,setQuery]=useState(''),[result,setResult]=useState<{query:string;items:{id:string;label:string}[];error:string}|null>(null)
 useEffect(()=>{if(query.trim().length<2)return;let current=true;const timer=setTimeout(()=>{void repository.search(query).then(v=>{if(current)setResult({query,items:v.items.filter(i=>i.kind==='customer').map(i=>({id:i.id,label:i.label})),error:''})}).catch(e=>{if(current)setResult({query,items:[],error:safeMessage(e)})})},250);return()=>{current=false;clearTimeout(timer)}},[query,repository])
 const items=result?.query===query?result.items:[]
 return <div className="space-y-2"><label className="block text-sm">Buscar empresa<input aria-label={inputLabel} className={`${control} mt-1 w-full`} maxLength={100} disabled={disabled} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Escribe al menos 2 caracteres"/></label><label className="block text-sm">Cliente vinculado<select aria-label="Cliente vinculado" className={`${control} mt-1 w-full`} disabled={disabled} value={value} onChange={e=>onChange(e.target.value)}><option value="">{clearLabel}</option>{value&&!items.some(c=>c.id===value)&&<option value={value}>Cliente seleccionado</option>}{items.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>{query.trim().length>=2&&result?.query!==query&&<p role="status" className="text-xs text-slate-500">Buscando empresas…</p>}{result?.query===query&&result.error&&<p role="alert" className="text-sm text-red-700">{result.error}</p>}{query.trim().length>=2&&result?.query===query&&!items.length&&!result.error&&<p role="status" className="text-xs text-slate-500">No hay empresas en esta consulta.</p>}<p className="text-xs text-slate-500">Hasta cinco empresas autorizadas por búsqueda.</p></div>
}
