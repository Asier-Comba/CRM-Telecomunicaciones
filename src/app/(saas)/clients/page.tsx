import Link from 'next/link'
import { Building2, ChevronRight, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/Badge'
import { previewCustomers, previewPermanences, previewRenewals, previewServices } from '@/lib/telecom-preview/data'

export default function ClientsPage() {
  return <div className="space-y-6">
    <PageHeader title="Clientes" description="Empresas y cartera telecom · solo lectura" action={<Badge variant="indigo">4 clientes sintéticos</Badge>} />
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid"><span>Empresa</span><span>Estado</span><span>Servicios</span><span>Próxima atención</span><span/></div>
      <div className="divide-y divide-slate-100">
        {previewCustomers.map(item => {
          const serviceCount=previewServices.filter(s=>s.customer.id===item.id).length
          const renewal=previewRenewals.find(r=>r.customer?.id===item.id)
          const permanence=previewPermanences.find(p=>p.customer?.id===item.id)
          return <Link key={item.id} href={`/clients/${item.id}`} className="grid gap-3 px-5 py-4 transition hover:bg-indigo-50/40 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-center md:gap-4">
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Building2 className="h-5 w-5"/></div><div><p className="font-semibold text-slate-950">{item.legal_name}</p><p className="text-sm text-slate-500">{item.assigned_user?.display_name ?? 'Sin comercial asignado'}</p></div></div>
            <div><Badge variant={item.status==='active'?'success':'default'} dot>{item.status==='active'?'Activo':'Inactivo'}</Badge></div>
            <p className="text-sm text-slate-700">{serviceCount ? `${serviceCount} servicio${serviceCount===1?'':'s'}` : 'Sin servicios'}</p>
            <p className="text-sm text-slate-600">{renewal ? `Renovación ${renewal.target_on}` : permanence ? `Permanencia ${permanence.ends_on}` : 'Datos no disponibles'}</p><ChevronRight className="hidden h-4 w-4 text-slate-400 md:block"/>
          </Link>
        })}
      </div>
    </div>
    <div className="flex items-center gap-2 text-sm text-slate-500"><ShieldCheck className="h-4 w-4"/>CIF, teléfono y correo permanecen ocultos en el contrato de lectura.</div>
  </div>
}
