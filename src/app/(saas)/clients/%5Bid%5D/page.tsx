import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CalendarDays, FileClock, Layers3, PhoneCall, RadioTower, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/Badge'
import { SectionCard } from '@/components/SectionCard'
import { customerPreview } from '@/lib/telecom-preview/data'

const empty = <p className="text-sm text-slate-500">Sin registros en los datos disponibles.</p>
export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = customerPreview(id)
  if (!data) notFound()
  return <div className="space-y-6">
    <Link href="/clients" className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"><ArrowLeft className="h-4 w-4"/>Volver a clientes</Link>
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div><div className="mb-2 flex items-center gap-2"><Badge variant={data.customer.status==='active'?'success':'default'} dot>{data.customer.status==='active'?'Activo':'Inactivo'}</Badge><Badge variant="indigo">Customer 360</Badge></div><h1 className="text-2xl font-bold text-slate-950">{data.customer.legal_name}</h1><p className="mt-1 text-sm text-slate-500">Comercial: {data.customer.assigned_user?.display_name ?? 'Sin asignar'}</p></div>
      <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600"><ShieldCheck className="h-4 w-4 text-emerald-600"/>Datos protegidos ocultos</div>
    </div>
    <div className="grid gap-5 xl:grid-cols-2">
      <SectionCard title="Contratos" description="Operador, plan y vigencia">
        {data.contracts.length ? <div className="space-y-3">{data.contracts.map(item=><div key={item.id} className="rounded-xl border border-slate-100 p-4"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-slate-900">{item.operator.display_name}</p><Badge variant={item.status==='active'?'success':'default'}>{item.status}</Badge></div><p className="mt-1 text-sm text-slate-500">{item.plan?.display_name ?? 'Plan no disponible'} · Alta {item.start_date}</p></div>)}</div>:empty}
      </SectionCard>
      <SectionCard title="Servicios y líneas" description="Jerarquía contrato → servicio → línea">
        {data.services.length ? <div className="space-y-3">{data.services.map(item=>{const count=data.lines.filter(line=>line.service.id===item.id).length;return <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-4"><div className="flex gap-3"><RadioTower className="mt-0.5 h-5 w-5 text-indigo-500"/><div><p className="font-semibold text-slate-900">{item.display_name}</p><p className="text-sm text-slate-500">{item.service_kind} · {item.operator.display_name}</p></div></div><Badge variant={count?'indigo':'default'}>{count} línea{count===1?'':'s'}</Badge></div>})}</div>:empty}
      </SectionCard>
      <SectionCard title="Renovaciones y permanencia" description="Fechas exactas disponibles">
        {data.renewals.map(item=><div key={item.id} className="mb-3 flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/50 p-4"><div><p className="font-semibold text-slate-900">{item.title}</p><p className="text-sm text-slate-500">Objetivo {item.target_on}</p></div><FileClock className="h-5 w-5 text-indigo-600"/></div>)}
        {data.permanences.map(item=><div key={item.id} className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/60 p-4"><div><p className="font-semibold text-slate-900">{item.title}</p><p className="text-sm text-slate-500">Termina {item.ends_on}</p></div><Layers3 className="h-5 w-5 text-amber-600"/></div>)}
        {!data.renewals.length&&!data.permanences.length&&<p className="text-sm text-amber-800">No dispongo de información de renovación o permanencia para este cliente.</p>}
      </SectionCard>
      <SectionCard title="Atención" description="Tareas y reuniones">
        <div className="space-y-3">{data.tasks.map(item=><div key={item.id} className="flex gap-3 rounded-xl border border-slate-100 p-3"><PhoneCall className="mt-0.5 h-4 w-4 text-indigo-500"/><div><p className="text-sm font-medium text-slate-900">{item.title}</p><p className="text-xs text-slate-500">{item.due_at ?? 'Sin fecha'}</p></div></div>)}{data.meetings.map(item=><div key={item.id} className="flex gap-3 rounded-xl border border-slate-100 p-3"><CalendarDays className="mt-0.5 h-4 w-4 text-sky-500"/><div><p className="text-sm font-medium text-slate-900">{item.title}</p><p className="text-xs text-slate-500">{item.starts_at}</p></div></div>)}{!data.tasks.length&&!data.meetings.length&&empty}</div>
      </SectionCard>
    </div>
    <SectionCard title="Oportunidades y actividad reciente">
      <div className="grid gap-4 lg:grid-cols-2"><div>{data.opportunities.length?data.opportunities.map(item=><div key={item.id} className="mb-2 rounded-xl border border-slate-100 p-3"><p className="font-medium text-slate-900">{item.title}</p><p className="text-sm text-slate-500">{item.stage.display_name} · {item.follow_up_state==='overdue'?'Seguimiento atrasado':'Seguimiento programado'}</p></div>):empty}</div><div>{data.activity.length?data.activity.map(item=><div key={item.id} className="mb-2 rounded-xl bg-slate-50 p-3"><p className="text-sm font-medium text-slate-900">{item.safe_summary}</p><p className="text-xs text-slate-500">{item.occurred_at}</p></div>):<p className="text-sm text-slate-500">Información parcial: no hay actividad disponible.</p>}</div></div>
    </SectionCard>
  </div>
}
