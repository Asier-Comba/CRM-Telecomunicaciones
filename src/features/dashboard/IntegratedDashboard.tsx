'use client'
import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { SectionCard } from '@/components/SectionCard'
import { Kpis, PreviewNotice, PeriodSelect, control } from '@/features/product/ui'
import { useProduct } from '@/features/product/integration/Provider'
import { safeMessage } from '@/features/product/integration/repository'
import type { DashboardV2 } from '@/lib/contracts/product-dashboard-v2'
import type { Period } from '@/features/product/model'
const labels = { customers:'Clientes',contracts:'Contratos',services:'Servicios',lines:'Líneas',opportunities:'Oportunidades',tasks:'Tareas',meetings:'Reuniones',renewals:'Renovaciones',permanences:'Permanencias' }
const periodLabels = {customers_created:'Clientes creados',tasks_due:'Tareas con vencimiento',meetings_scheduled:'Reuniones programadas',renewals_due:'Renovaciones previstas',permanences_due:'Permanencias que terminan',opportunities_closed:'Oportunidades cerradas'}
export function IntegratedDashboard() {
  const {repository,role}=useProduct()
  const [audience,setAudience]=useState<'my'|'workspace'>('my'),[period,setPeriod]=useState<Period>('month'),[reload,setReload]=useState(0)
  const [state,setState]=useState<{data:DashboardV2|null;error:string;loading:boolean}>({data:null,error:'',loading:true})
  useEffect(()=>{let current=true;queueMicrotask(()=>{if(current)setState({data:null,error:'',loading:true})});void repository.dashboard({audience,period}).then(data=>{if(current)setState({data,error:'',loading:false})}).catch(e=>{if(current)setState({data:null,error:safeMessage(e),loading:false})});return()=>{current=false}},[repository,audience,period,reload])
  const data=state.data
  return <div className="space-y-4"><PageHeader title="Dashboard telecom" description="Cartera y actividad autorizadas en la base local"/><PreviewNotice/>
    <div className="flex flex-wrap items-center gap-3"><select className={control} aria-label="Ámbito del dashboard" value={audience} onChange={e=>setAudience(e.target.value as typeof audience)}><option value="my">Mi actividad</option>{['owner','admin'].includes(role??'') && <option value="workspace">Todo el espacio</option>}</select><PeriodSelect value={period} onChange={setPeriod}/><button className={control} onClick={()=>setReload(reload+1)}>Actualizar</button><span className="text-xs text-slate-500">Vista de equipo no disponible</span></div>
    {state.error && <p role="alert" className="text-red-700">{state.error}</p>}{state.loading && <p role="status">Cargando métricas…</p>}
    {data && <><Kpis items={Object.entries(data.snapshot_counts).map(([key,value])=>({label:labels[key as keyof typeof labels],value,note:'Cartera actual · ámbito seleccionado'}))}/>
    <SectionCard title="Actividad del periodo" description={data.period.start?`${data.period.start} hasta ${data.period.end_exclusive} (fin excluido)`:'Todo el histórico'}><Kpis items={Object.entries(data.period_counts).map(([key,value])=>({label:periodLabels[key as keyof typeof periodLabels],value}))}/></SectionCard>
    <SectionCard title="Facturación" description="Importes autorizados por moneda, sin conversión estimada">{data.financial_status==='unavailable'?<p className="text-sm text-slate-500">Información financiera no disponible para tu rol.</p>:data.financial?.currencies.map(c=><div key={c.currency} className="mb-3"><h3 className="mb-2 text-sm font-semibold">{c.currency}</h3><Kpis items={(['issued_minor','paid_minor','outstanding_minor','overdue_minor'] as const).map(key=>({label:{issued_minor:'Emitido',paid_minor:'Cobrado',outstanding_minor:'Pendiente',overdue_minor:'Vencido'}[key],value:new Intl.NumberFormat('es-ES',{style:'currency',currency:c.currency}).format(c[key]/100)}))}/></div>)}</SectionCard>
    <SectionCard title="Actividad reciente" description="Hasta 20 eventos registrados">{data.recent_activity.map(a=><p key={a.id} className="border-b py-2 text-sm text-slate-600">{{'entity.created':'Registro creado','entity.updated':'Registro actualizado','entity.contacted':'Contacto registrado','entity.status_changed':'Estado modificado','system.imported':'Importación registrada','system.synchronized':'Sincronización registrada'}[a.summary_code]??'Actividad registrada'} · {new Intl.DateTimeFormat('es-ES',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Madrid'}).format(new Date(a.occurred_at))}</p>)}{!data.recent_activity.length&&<p className="text-sm text-slate-500">Sin eventos en esta consulta.</p>}</SectionCard></>}
  </div>
}
