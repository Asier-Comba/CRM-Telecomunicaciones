'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CalendarDays } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SectionCard } from '@/components/SectionCard'
import { Badge } from '@/components/Badge'
import { Kpis, PreviewNotice, PeriodSelect, Empty } from '@/features/product/ui'
import { inPeriod, calendarDate, weekStart, addDays, type Period, type CustomerRow, type CalendarEntry } from '@/features/product/model'
import type { TelecomContractV1, TelecomServiceV1, TelecomLineV1, OpportunityItemV1, ActivityItemV1 } from '@/lib/contracts/telecom-v1'
import { previewDate } from '@/lib/telecom-preview/presentation'
export type DashboardData = { customers: CustomerRow[]; contracts: readonly TelecomContractV1[]; services: readonly TelecomServiceV1[]; lines: readonly TelecomLineV1[]; opportunities: readonly OpportunityItemV1[]; activity: readonly ActivityItemV1[]; events: CalendarEntry[]; asOf: string }
export function Dashboard({ data }: { data: DashboardData }) {
  const [period,setPeriod]=useState<Period>('month'), today=data.asOf.slice(0,10), start=weekStart(today)
  const events=data.events.filter(e=>calendarDate(e.date)===today), deadlines=data.events.filter(e=>['renewal','permanence'].includes(e.type)).sort((a,b)=>a.date.localeCompare(b.date))
  const operators=[...new Set(data.contracts.map(c=>c.operator.display_name))], stages=[...new Set(data.opportunities.map(o=>o.stage.display_name))]
  const maxContracts=Math.max(1,...operators.map(o=>data.contracts.filter(c=>c.operator.display_name===o).length))
  const activity=data.activity.filter(a=>inPeriod(a.occurred_at,period,data.asOf)), starts=data.contracts.filter(c=>inPeriod(c.start_date,period,data.asOf))
  return <div className="space-y-4">
    <PageHeader title="Dashboard telecom" description="Tu negocio, tu cartera y el siguiente paso" action={<Link className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white" href="/assistant">Consultar al asistente<ArrowRight className="h-4 w-4"/></Link>}/>
    <PreviewNotice/>
    <Kpis items={[{label:'Clientes activos',value:data.customers.filter(c=>c.status==='active'&&c.lifecycle==='customer').length,note:'Empresas de esta muestra'}, {label:'Contratos activos',value:data.contracts.filter(c=>c.status==='active').length,note:'Registros conocidos · cobertura parcial'}, {label:'Líneas activas',value:data.lines.filter(l=>l.status==='active').length,note:'Registros conocidos · cobertura parcial'}, {label:'Oportunidades abiertas',value:data.opportunities.filter(o=>o.status==='open').length,note:'Pipeline disponible'}, {label:'Renovaciones próximas',value:deadlines.filter(e=>e.type==='renewal').length,note:'Fechas conocidas'}, {label:'Permanencias próximas',value:deadlines.filter(e=>e.type==='permanence').length,tone:'text-amber-600',note:'Fechas conocidas'}, {label:'Tareas abiertas',value:data.events.filter(e=>e.type==='task').length,note:'Pendientes y en curso'}, {label:'Reuniones de hoy',value:events.filter(e=>e.type==='meeting').length,note:'Horario Europe/Madrid'}]}/>
    <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr]">
      <SectionCard title="Rendimiento comercial" description="Altas registradas en el periodo; la cartera es una instantánea" action={<PeriodSelect value={period} onChange={setPeriod}/> }>
        <div className="grid grid-cols-2 gap-4"><div><p className="text-3xl font-bold text-slate-900">{starts.length}</p><p className="text-xs text-slate-500">Contratos con fecha de alta</p></div><div><p className="text-3xl font-bold text-slate-900">{activity.length}</p><p className="text-xs text-slate-500">Actividades registradas</p></div></div>
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">Ingresos recurrentes, crecimiento y objetivos requieren métricas autorizadas. Los registros de la muestra no prueban el rendimiento total.</div>
      </SectionCard>
      <SectionCard title="Distribución de cartera" description="Contratos conocidos por operador"><div className="space-y-4">{operators.map(o=>{const count=data.contracts.filter(c=>c.operator.display_name===o).length;return <div key={o}><div className="mb-1 flex justify-between gap-2 text-xs"><span className="font-medium text-slate-700">{o}</span><span>{count}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-500" style={{width:`${count/maxContracts*100}%`}}/></div></div>})}</div><p className="mt-4 text-[11px] text-slate-400">{data.services.length} servicios disponibles en la muestra</p></SectionCard>
      <SectionCard title="Pipeline comercial" description="Oportunidades abiertas por etapa"><div className="space-y-3">{stages.map(s=><Link href="/opportunities" key={s} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5 text-sm hover:bg-indigo-50"><span className="text-slate-700">{s}</span><Badge variant="indigo">{data.opportunities.filter(o=>o.stage.display_name===s).length}</Badge></Link>)}</div><Link href="/opportunities" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600">Ver pipeline<ArrowRight className="h-3 w-3"/></Link></SectionCard>
    </div>
    <SectionCard title="Semana operativa" description="Reuniones, tareas y fechas comerciales" action={<Link href="/calendar" className="flex gap-1 text-xs font-semibold text-indigo-600"><CalendarDays className="h-4 w-4"/>Calendario</Link>}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">{Array.from({length:7},(_,i)=>{const day=addDays(start,i),entries=data.events.filter(e=>calendarDate(e.date)===day);return <div key={day} className={`min-h-28 rounded-lg border p-2.5 ${day===today?'border-indigo-200 bg-indigo-50/40':'border-slate-100 bg-slate-50/50'}`}><p className="mb-2 text-xs font-semibold text-slate-500">{new Intl.DateTimeFormat('es-ES',{weekday:'short',day:'numeric',timeZone:'UTC'}).format(new Date(`${day}T12:00:00Z`))}</p>{entries.map(e=><Link href={`/clients/${e.customerId}`} key={e.id} className="mb-1.5 block rounded border-l-2 border-indigo-400 bg-white p-2 text-[11px] leading-4 text-slate-700">{e.title}</Link>)}{!entries.length&&<p className="text-[10px] text-slate-400">Sin citas en la muestra</p>}</div>})}</div>
    </SectionCard>
    <div className="grid gap-4 lg:grid-cols-3">
      <SectionCard title="Hoy" description="Lo más inmediato">{events.map(e=><Link key={e.id} href={`/clients/${e.customerId}`} className="mb-2 block rounded-lg border border-slate-100 p-3 hover:border-indigo-200"><p className="text-xs font-semibold text-slate-800">{e.title}</p><p className="mt-1 text-[11px] text-slate-500">{e.customer} · {previewDate(e.date)}</p></Link>)}{!events.length&&<Empty text="Sin eventos disponibles para hoy."/>}</SectionCard>
      <SectionCard title="Vencimientos críticos" description="Renovaciones y permanencias conocidas">{deadlines.map(e=><Link href={`/clients/${e.customerId}`} key={e.id} className="mb-2 block rounded-lg border border-amber-100 bg-amber-50/60 p-3"><p className="text-xs font-semibold text-slate-800">{e.title}</p><p className="mt-1 text-[11px] text-amber-800">{previewDate(e.date)} · {e.customer}</p></Link>)}</SectionCard>
      <SectionCard title="Actividad reciente" description="Registro de acciones comerciales">{activity.map(a=><div key={a.id} className="mb-3 border-l-2 border-indigo-200 pl-3"><p className="text-xs font-medium text-slate-800">{a.safe_summary}</p><p className="mt-1 text-[11px] text-slate-500">{a.customer?.display_name} · {previewDate(a.occurred_at)}</p></div>)}{!activity.length&&<Empty text="Sin actividad disponible en este periodo."/>}</SectionCard>
    </div>
  </div>
}
