import Link from 'next/link'
import { AlertTriangle, CalendarDays, CheckSquare2, Clock3, RadioTower, Users } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SectionCard } from '@/components/SectionCard'
import { Badge } from '@/components/Badge'
import { previewCustomers, previewMeetings, previewOpportunities, previewPermanences, previewRenewals, previewTasks } from '@/lib/telecom-preview/data'
import { previewDate, urgencyLabel } from '@/lib/telecom-preview/presentation'
import { syntheticPreviewAllowed } from '@/lib/telecom-preview/access'

const date = previewDate

export default function DashboardPage() {
  if (!syntheticPreviewAllowed()) return <PageHeader title="Dashboard telecom" description="Vista sintética no disponible en este entorno." />
  const activeCustomers = previewCustomers.filter(item => item.status === 'active' && item.lifecycle === 'customer').length
  const openOpportunities = previewOpportunities.filter(item => item.status === 'open').length
  const pendingTasks = previewTasks.filter(item => item.status === 'pending' || item.status === 'in_progress').length
  const attention = [...previewRenewals, ...previewPermanences]
  const metrics: Array<{ label: string; value: number; icon: typeof Users; note: string }> = [
    { label: 'Clientes activos', value: activeCustomers, icon: Users, note: 'Empresas visibles en cartera' },
    { label: 'Tareas abiertas', value: pendingTasks, icon: CheckSquare2, note: 'Pendientes y en curso' },
    { label: 'Oportunidades', value: openOpportunities, icon: RadioTower, note: 'Negocio comercial abierto' },
    { label: 'Reuniones de hoy', value: previewMeetings.length, icon: CalendarDays, note: 'Agenda validada' },
  ]
  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard telecom" description="Cartera comercial sintética · consulta de solo lectura" action={<Badge variant="indigo" dot>Datos de demostración</Badge>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon, note }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-600">{label}</p><Icon className="h-5 w-5 text-indigo-500" /></div>
            <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{note}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <SectionCard title="Atención comercial" description="Fechas procedentes del contrato telecom.v1">
          <div className="space-y-3">
            {attention.map(item => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <div><p className="font-medium text-slate-900">{item.title}</p><p className="mt-1 text-sm text-slate-500">{item.customer?.display_name ?? 'Cliente no disponible'}</p></div>
                <div className="text-right"><Badge variant={item.kind === 'renewal' ? 'indigo' : 'warning'}>{item.kind === 'renewal' ? 'Renovación' : 'Permanencia'}</Badge><p className="mt-1 text-sm font-semibold text-slate-700">{date(item.kind === 'renewal' ? item.target_on : item.ends_on)}</p><p className="text-xs text-slate-500">{urgencyLabel(item.kind === 'renewal' ? item.target_on : item.ends_on)}</p></div>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Agenda comercial" description="Tareas abiertas y reuniones · referencia 30 sep 2026">
          <div className="space-y-3">
            {previewTasks.map(item => <Link key={item.id} href={`/clients/${item.customer?.id}`} className="block rounded-xl border border-slate-100 p-3 hover:border-indigo-200"><div className="flex gap-3"><CheckSquare2 className="mt-0.5 h-4 w-4 text-indigo-500"/><div><p className="text-sm font-medium text-slate-900">{item.title}</p><p className="text-xs text-slate-500">{item.customer?.display_name}</p></div></div></Link>)}
            {previewMeetings.map(item => <Link key={item.id} href={`/clients/${item.customer?.id}`} className="block rounded-xl border border-slate-100 p-3 hover:border-indigo-200"><div className="flex gap-3"><Clock3 className="mt-0.5 h-4 w-4 text-sky-500"/><div><p className="text-sm font-medium text-slate-900">{item.title}</p><p className="text-xs text-slate-500">{new Date(item.starts_at).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Madrid'})} · {item.customer?.display_name}</p></div></div></Link>)}
          </div>
        </SectionCard>
      </div>
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/><p>Los indicadores de equipo y crecimiento no están disponibles en esta versión. No se muestran como cero.</p></div>
    </div>
  )
}
