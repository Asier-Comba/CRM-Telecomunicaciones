import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/Badge'
import { SectionCard } from '@/components/SectionCard'
import { customerPreview } from '@/lib/telecom-preview/data'
import { previewDate, previewStatus, urgencyLabel } from '@/lib/telecom-preview/presentation'
import { syntheticPreviewAllowed } from '@/lib/telecom-preview/access'

const empty = <p className="text-sm text-slate-500">Sin registros en los datos disponibles.</p>

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!syntheticPreviewAllowed()) notFound()
  const { id } = await params
  const data = customerPreview(id)
  if (!data) notFound()

  return (
    <div className="space-y-6">
      <Link href="/clients" className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"><ArrowLeft className="h-4 w-4" />Volver a clientes</Link>
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <div className="mb-2 flex gap-2"><Badge variant={data.customer.status === 'active' ? 'success' : 'default'} dot>{previewStatus[data.customer.status]}</Badge><Badge variant="indigo">Customer 360</Badge></div>
          <h1 className="text-2xl font-bold text-slate-950">{data.customer.legal_name}</h1>
          <p className="mt-1 text-sm text-slate-500">{previewStatus[data.customer.lifecycle]} · Comercial: {data.customer.assigned_user?.display_name ?? 'Sin asignar'}</p>
        </div>
        <p className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600"><ShieldCheck className="h-4 w-4 text-emerald-600" />Datos protegidos ocultos</p>
      </header>
      <div className="grid grid-cols-3 gap-3">
        {[['Contratos', data.contracts.length], ['Servicios', data.services.length], ['Líneas', data.lines.length]].map(([label, count]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-slate-950">{count}</p></div>)}
      </div>
      <SectionCard title="Contratos" description="Operador → contrato → servicios → líneas">
        <div className="space-y-5">
          {data.contracts.map(item => {
            const services = data.services.filter(s => s.contract.id === item.id)
            return <article key={item.id} className="overflow-hidden rounded-xl border border-slate-200">
              <div className="flex flex-wrap justify-between gap-3 bg-slate-50 p-4">
                <div><h3 className="font-semibold text-slate-900">{item.operator.display_name}</h3><p className="mt-1 text-sm text-slate-500">{item.plan?.display_name ?? 'Plan no disponible'} · Alta {previewDate(item.start_date)}</p><p className="mt-1 text-xs text-slate-500">{services.length} servicios · Referencia contractual oculta{item.end_date ? ` · Fin ${previewDate(item.end_date)}` : ''}</p></div>
                <Badge variant={item.status === 'active' ? 'success' : 'default'}>{previewStatus[item.status]}</Badge>
              </div>
              <div className="space-y-3 p-4">
                {services.map(service => {
                  const lines = data.lines.filter(line => line.service.id === service.id)
                  return <section key={service.id} className="border-l-2 border-indigo-200 pl-4">
                    <div className="flex flex-wrap justify-between gap-2"><p className="font-medium text-slate-900">{service.display_name}</p><Badge variant="indigo">{lines.length} línea{lines.length === 1 ? '' : 's'}</Badge></div>
                    <p className="mt-1 text-xs text-slate-500">{service.service_kind === 'fiber' ? 'Fibra' : service.service_kind === 'mobile' ? 'Móvil' : service.service_kind} · {previewStatus[service.status]} · {previewDate(service.activated_on)}</p>
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                      {lines.map((line, index) => <li key={line.id} className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><p className="font-medium text-slate-800">Línea {index + 1} · {previewStatus[line.status]}</p><p className="mt-1">Identificador oculto · Alta {previewDate(line.activated_on)}</p></li>)}
                    </ul>
                  </section>
                })}
                {!services.length && empty}
              </div>
            </article>
          })}
          {!data.contracts.length && empty}
        </div>
      </SectionCard>
      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="Renovaciones y permanencia" description="Urgencia calculada al 30 sep 2026">
          <div className="space-y-3">
            {[...data.renewals, ...data.permanences].map(item => {
              const date = item.kind === 'renewal' ? item.target_on : item.ends_on
              return <div key={item.id} className="rounded-xl border border-amber-100 bg-amber-50/60 p-4"><p className="font-semibold text-slate-900">{item.title}</p><p className="mt-1 text-sm text-slate-600">{previewDate(date)} · {urgencyLabel(date)}</p></div>
            })}
            {!data.renewals.length && !data.permanences.length && <p className="text-sm text-amber-800">No dispongo de información de renovación o permanencia para este cliente.</p>}
          </div>
        </SectionCard>
        <SectionCard title="Tareas y reuniones">
          <div className="space-y-3">
            {data.tasks.map(item => <div key={item.id} className="rounded-xl border border-slate-100 p-3"><p className="text-sm font-medium text-slate-900">{item.title}</p><p className="mt-1 text-xs text-slate-500">Tarea · {previewStatus[item.status]} · {previewDate(item.due_at)}</p></div>)}
            {data.meetings.map(item => <div key={item.id} className="rounded-xl border border-slate-100 p-3"><p className="text-sm font-medium text-slate-900">{item.title}</p><p className="mt-1 text-xs text-slate-500">Reunión · {previewDate(item.starts_at)}</p></div>)}
            {!data.tasks.length && !data.meetings.length && empty}
          </div>
        </SectionCard>
        <SectionCard title="Oportunidades">
          {data.opportunities.map(item => <div key={item.id} className="mb-3 rounded-xl border border-slate-100 p-3"><p className="font-medium text-slate-900">{item.title}</p><p className="mt-1 text-sm text-slate-500">{item.stage.display_name} · {item.follow_up_state === 'overdue' ? 'Seguimiento atrasado' : 'Seguimiento programado'}</p></div>)}
          {!data.opportunities.length && empty}
        </SectionCard>
        <SectionCard title="Actividad reciente">
          {data.activity.map(item => <div key={item.id} className="mb-3 rounded-xl bg-slate-50 p-3"><p className="text-sm font-medium text-slate-900">{item.safe_summary}</p><p className="mt-1 text-xs text-slate-500">{previewDate(item.occurred_at)}</p></div>)}
          {!data.activity.length && <p className="text-sm text-slate-500">Información parcial: no hay actividad disponible.</p>}
        </SectionCard>
      </div>
    </div>
  )
}
