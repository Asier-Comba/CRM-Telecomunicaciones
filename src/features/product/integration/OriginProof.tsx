'use client'
import {useEffect,useRef,useState} from 'react'
import {useProduct} from './Provider'
import {safeMessage} from './repository'
import type {ProvenanceKindV1,ProvenanceResultV1} from '@/lib/contracts/provenance-v1'
import {control} from '@/features/product/ui'
export function OriginProof({kind,id}:{kind:ProvenanceKindV1;id:string}){
 const {repository,role}=useProduct(),[state,setState]=useState<{id:string;value:ProvenanceResultV1|null;error:string}>({id,value:null,error:''}),[busy,setBusy]=useState(false),attempt=useRef(0),alive=useRef(true)
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;attempt.current++}},[])
 if(role!=='owner'&&role!=='admin')return null
 const current=state.id===id?state:null
 async function read(){if(busy)return;const n=++attempt.current;setBusy(true);setState({id,value:null,error:''});try{const value=await repository.provenance({kind,id});if(alive.current&&attempt.current===n)setState({id,value,error:''})}catch(e){if(alive.current&&attempt.current===n)setState({id,value:null,error:safeMessage(e)})}finally{if(alive.current&&attempt.current===n)setBusy(false)}}
 return <section className="mt-2 space-y-2 text-xs"><button type="button" className={control} disabled={busy} onClick={read}>{busy?'Consultando origen…':'Comprobar origen registrado'}</button>{current?.error&&<p role="alert" className="text-red-700">{current.error}</p>}{current?.value&&<p data-origin-confidence={current.value.confidence} className="rounded-lg bg-slate-50 p-2">{current.value.confidence==='verified_new_manual'?'Alta manual nueva verificada · '+new Date(current.value.verified_at!).toLocaleString('es-ES'):current.value.confidence==='declared_legacy_manual'?'Origen manual declarado en un registro histórico. No acredita una alta manual nueva.':current.value.confidence==='declared_external'?'Origen externo declarado. Se conservan las restricciones de edición.':'Sin prueba de origen registrada.'}</p>}</section>
}
