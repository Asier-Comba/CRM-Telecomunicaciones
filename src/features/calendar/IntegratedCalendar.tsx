'use client'
import {AssigneeSelect}from '@/features/product/integration/AssigneeSelect'
import { PortfolioEditor } from '@/features/portfolio/IntegratedPortfolio'
import type { PortfolioGetV1 } from '@/lib/contracts/portfolio-v1'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Calendar } from './Calendar'
import { useProduct } from '@/features/product/integration/Provider'
import { safeMessage, commandIntent, ProductUiError } from '@/features/product/integration/repository'
import { Drawer, control, primary, Status } from '@/features/product/ui'
import type { CalendarEntry } from '@/features/product/model'
import type { CalendarPageV1, WorkGetV1 } from '@/lib/contracts/product-queries-v1'
import type { ProductReceiptV1 } from '@/lib/contracts/product-v1'
export function IntegratedCalendar({customerId}:{customerId?:string}){
  const {repository,role}=useProduct()
  const [asOf]=useState(()=>new Date().toISOString()),[anchor,setAnchor]=useState(asOf.slice(0,10)),[reload,setReload]=useState(0)
  const [data,setData]=useState<CalendarPageV1|null>(null),[error,setError]=useState(''),[selected,setSelected]=useState<{kind:'task'|'meeting';id?:string}|null>(null)
  const [deadline,setDeadline]=useState<{value:PortfolioGetV1;label:string}|null>(null)
  const onRange=useCallback((value:string)=>setAnchor(value),[])
  useEffect(()=>{let active=true;const from=new Date(`${anchor}T00:00:00Z`),to=new Date(from);from.setUTCDate(from.getUTCDate()-31);to.setUTCDate(to.getUTCDate()+62)
    void repository.calendar({range_start:from.toISOString(),range_end:to.toISOString(),limit:100,...(customerId?{customer_id:customerId}:{})}).then(page=>{if(active){setData(page);setError('')}}).catch(e=>{if(active){setData(null);setError(safeMessage(e))}});return()=>{active=false}
  },[repository,anchor,reload,customerId])
  const entries:CalendarEntry[]=(data?.items??[]).map(e=>({id:e.id,type:e.kind,title:e.title,date:e.date??e.at,end:e.ends_at,allDay:e.all_day,customerId:e.customer_id,customer:e.customer_id?'Cliente vinculado':'Sin cliente',owner:e.assigned_user_id?'Asignado':'Sin asignar'}))
  return <div className="space-y-3">{error&&<p role="alert" className="text-red-700">{error}</p>}<Calendar entries={entries} asOf={asOf} onRange={onRange} onCreate={role && role!=='viewer'?()=>setSelected({kind:'meeting'}):undefined} onSelect={async e=>{if(e.type==='task'||e.type==='meeting')setSelected({kind:e.type,id:e.id});else if(e.type==='renewal'||e.type==='permanence'){try{setDeadline({value:await repository.portfolio(e.type,e.id),label:e.title})}catch(error){setError(safeMessage(error))}}}}/>{data?.next && <p className="text-sm text-amber-800">Cobertura parcial: se muestran los primeros 100 registros del intervalo. Hay más registros.</p>}{deadline&&<PortfolioEditor item={deadline} canWrite={role!==null&&role!=='viewer'} onClose={()=>setDeadline(null)} onSaved={async()=>{setDeadline(null);setReload(reload+1)}}/>}{selected&&<WorkEditor customerId={customerId} key={`${selected.kind}:${selected.id??'new'}`} initialKind={selected.kind} id={selected.id} canWrite={role!==null&&role!=='viewer'} onClose={()=>setSelected(null)} onSaved={()=>{setSelected(null);setReload(reload+1)}}/>}</div>
}
function localInput(instant:string|null|undefined){if(!instant)return '';const d=new Date(instant);const offset=d.getTimezoneOffset();return new Date(d.getTime()-offset*60000).toISOString().slice(0,16)}
function WorkEditor({initialKind,id,customerId,canWrite,onClose,onSaved}:{customerId?:string;initialKind:'task'|'meeting';id?:string;canWrite:boolean;onClose:()=>void;onSaved:()=>void}){
  const {repository}=useProduct(),[kind,setKind]=useState(initialKind),[record,setRecord]=useState<WorkGetV1|null>(null),[title,setTitle]=useState(''),[start,setStart]=useState(''),[end,setEnd]=useState(''),[error,setError]=useState<unknown>(null),[busy,setBusy]=useState(false)
  const [assignee,setAssignee]=useState(''),[priority,setPriority]=useState<'low'|'normal'|'high'>('normal')
  const intent=useRef<{execute:()=>Promise<ProductReceiptV1>}|null>(null)
  useEffect(()=>{if(!id)return;let active=true;void repository.work(initialKind,id).then(value=>{if(!active)return;setRecord(value);setTitle(value.record.title);if(value.kind==='task'||value.kind==='meeting')setAssignee(value.record.assigned_user_id??'');if(value.kind==='task')setPriority(value.record.priority??'normal');if(value.kind==='task'){setStart(localInput(value.record.due_at))}else if(value.kind==='meeting'){setStart(localInput(value.record.starts_at));setEnd(localInput(value.record.ends_at))}}).catch(e=>{if(active)setError(e)});return()=>{active=false}},[repository,id,initialKind])
  const conflict=error instanceof ProductUiError&&error.code==='conflict',uncertain=error instanceof ProductUiError&&error.code==='transport_uncertain'
  const terminal=!!record&&!['pending','in_progress','scheduled'].includes(record.record.status)
  const locked=busy||conflict||uncertain||terminal||!canWrite||!!id&&!record
  async function submit(action:'save'|'complete'|'cancel'|'start'|'reopen'|'no_show'){
    if(busy||conflict||!canWrite)return;setBusy(true);setError(null)
    try{
      if(!intent.current){
        const base=id&&record?{id,expected_version:record.record.version}:null
        const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone
        const starts=start?new Date(start).toISOString():null,ends=end?new Date(end).toISOString():null
        let command
        if(action==='start'&&base)command=commandIntent('task.start',base)
        else if(action==='reopen'&&base)command=commandIntent('task.reopen',base)
        else if(action==='no_show'&&base)command=commandIntent('meeting.no_show',base)
        else if(action==='complete'&&base)command=kind==='task'?commandIntent('task.complete',base):commandIntent('meeting.complete',base)
        else if(action==='cancel'&&base)command=kind==='task'?commandIntent('task.cancel',base):commandIntent('meeting.cancel',base)
        else if(kind==='task')command=base?commandIntent('task.update',{...base,title,due_at:starts,priority,assigned_user_id:assignee||null}):commandIntent('task.create',{title,due_at:starts,priority,assigned_user_id:assignee||null,...(customerId?{customer_id:customerId}:{})})
        else{if(!starts||!ends)throw new ProductUiError('validation');command=base&&record?.kind==='meeting'&&(record.record.title!==title||record.record.assigned_user_id!==(assignee||null))?commandIntent('meeting.update',{...base,title,starts_at:starts,ends_at:ends,timezone,all_day:false,assigned_user_id:assignee||null}):base?commandIntent('meeting.reschedule',{...base,starts_at:starts,ends_at:ends,timezone,all_day:false}):commandIntent('meeting.create',{title,starts_at:starts,ends_at:ends,timezone,all_day:false,assigned_user_id:assignee||null,...(customerId?{customer_id:customerId}:{})})}
        intent.current={execute:()=>command.execute(repository)}
      }
      await intent.current.execute();intent.current=null;onSaved()
    }catch(e){setError(e);if(!(e instanceof ProductUiError&&e.code==='transport_uncertain'))intent.current=null}finally{setBusy(false)}
  }
  function changed(){intent.current=null;setError(null)}
  return <Drawer title={id?'Detalle de agenda':'Nueva tarea o reunión'} onClose={()=>{if(!busy)onClose()}}><form onSubmit={e=>{e.preventDefault();void submit('save')}} className="space-y-4">{record&&<Status value={record.record.status}/>}<fieldset disabled={locked} className="space-y-4">{!id&&<label className="block text-sm">Tipo<select aria-label="Tipo" className={`${control} mt-1 w-full`} value={kind} onChange={e=>{setKind(e.target.value as typeof kind);changed()}}><option value="meeting">Reunión</option><option value="task">Tarea</option></select></label>}<label className="block text-sm">Título<input className={`${control} mt-1 w-full`} required maxLength={200} value={title} onChange={e=>{setTitle(e.target.value);changed()}}/></label><label className="block text-sm">{kind==='task'?'Vencimiento':'Inicio'}<input className={`${control} mt-1 w-full`} type="datetime-local" required={kind==='meeting'} value={start} onChange={e=>{setStart(e.target.value);changed()}}/></label>{kind==='meeting'&&<label className="block text-sm">Fin<input className={`${control} mt-1 w-full`} type="datetime-local" required value={end} onChange={e=>{setEnd(e.target.value);changed()}}/></label>}{kind==='task'&&<label className="block text-sm">Prioridad<select aria-label="Prioridad" className={control} value={priority} onChange={e=>{setPriority(e.target.value as typeof priority);changed()}}><option value="low">Baja</option><option value="normal">Normal</option><option value="high">Alta</option></select></label>}<AssigneeSelect allowClear value={assignee} onChange={id=>{setAssignee(id);changed()}} disabled={locked}/><p className="text-xs text-slate-500">Hora local del dispositivo: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Los plazos por fecha se muestran por separado.</p></fieldset>{!!error&&<p role="alert" className="text-red-700">{safeMessage(error)}</p>}{conflict&&<button type="button" className={control} onClick={onSaved}>Cerrar y recargar para revisar</button>}{canWrite&&<div className="flex flex-wrap gap-2"><button className={primary} disabled={busy||conflict||terminal||!!id&&!record}>{busy?'Guardando…':uncertain?'Reintentar la misma acción':id&&kind==='meeting'?'Reprogramar reunión':'Guardar agenda'}</button>{record&&!uncertain&&kind==='task'&&['completed','cancelled'].includes(record.record.status)&&<button type="button" className={control} disabled={busy||conflict} onClick={()=>submit('reopen')}>Reabrir tarea</button>}{record&&!uncertain&&kind==='task'&&record.record.status==='pending'&&<button type="button" className={control} disabled={busy||conflict} onClick={()=>submit('start')}>Iniciar tarea</button>}{record&&!uncertain&&kind==='meeting'&&record.record.status==='scheduled'&&<button type="button" className={control} disabled={busy||conflict} onClick={()=>submit('no_show')}>Marcar ausencia</button>}{record&&!uncertain&&['pending','in_progress','scheduled'].includes(record.record.status)&&<><button type="button" className={control} disabled={busy||conflict} onClick={()=>submit('complete')}>Completar</button><button type="button" className={control} disabled={busy||conflict} onClick={()=>submit('cancel')}>Cancelar actividad</button></>}</div>}</form></Drawer>
}
