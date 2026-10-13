'use client'
import {useRef,useState} from 'react'
import {ConfirmDialog} from '@/components/ConfirmDialog'
import {control} from '@/features/product/ui'
import {ProductUiError,safeMessage} from './repository'
/** A committed command is never repeated because its subsequent read failed. */
export function useReviewedCommand<P extends {description:string}>(execute:(p:P)=>Promise<unknown>,refresh:()=>Promise<void>,title:string){
 const [proposal,setProposal]=useState<P>(),[busy,setBusy]=useState(false),[frozen,setFrozen]=useState(false),[confirmed,setConfirmed]=useState(false),[blocked,setBlocked]=useState(false),[error,setError]=useState(''),pending=useRef<P|undefined>(undefined),receipt=useRef(false),inFlight=useRef(false)
 async function save(){if(inFlight.current||!proposal||blocked)return;inFlight.current=true;setBusy(true);setError('');try{if(!receipt.current){pending.current??=proposal;setFrozen(true);await execute(pending.current);receipt.current=true;pending.current=undefined;setProposal(undefined);setConfirmed(true);setFrozen(false)}await refresh()}catch(e){setError(safeMessage(e));if(!receipt.current&&e instanceof ProductUiError&&e.code!=='transport_uncertain'&&e.code!=='internal_safe'){pending.current=undefined;setFrozen(false);setBlocked(true)}}finally{inFlight.current=false;setBusy(false)}}
 function propose(p:P){if(busy||proposal||blocked||receipt.current)return;setError('');setProposal(p)}
 const locked=busy||!!proposal||blocked||confirmed
 const feedback=<><ConfirmDialog open={!!proposal} title={title} description={proposal?.description??''} loading={busy} confirmDisabled={blocked} error={error} confirmLabel={confirmed?'Actualizar lectura':frozen?'Reintentar misma operación':'Confirmar cambio'} onConfirm={()=>void save()} onCancel={()=>{if(!busy&&(receipt.current||!pending.current))setProposal(undefined)}}/>{confirmed&&<p role="status" className="text-sm text-emerald-700">Cambio registrado. Reintentar solo actualiza la lectura.</p>}{(blocked||confirmed&&!proposal)&&<button className={control} disabled={busy} onClick={()=>{if(inFlight.current)return;inFlight.current=true;setBusy(true);void refresh().then(()=>{if(!receipt.current){setBlocked(false);setProposal(undefined)}setError('')}).catch(e=>setError(safeMessage(e))).finally(()=>{inFlight.current=false;setBusy(false)})}}>Actualizar lectura</button>}{error&&!proposal&&<p role="alert">{error}</p>}</>
 return{propose,locked,busy,feedback}
}
