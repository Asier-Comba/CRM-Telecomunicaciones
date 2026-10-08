import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Bot, Pencil } from 'lucide-react'
import { Badge } from '@/components/Badge'
import { customerPreview } from '@/lib/telecom-preview/data'
import { syntheticPreviewAllowed } from '@/lib/telecom-preview/access'
import { CustomerTabs } from '@/features/customers/CustomerTabs'
import { customerPanels } from '@/features/customers/CustomerSections'
import { integratedLocalAllowed } from '@/features/product/integration/mode'
import { IntegratedCustomerDetail } from '@/features/customers/IntegratedCustomerDetail'
import {
  Kpis,
  PreviewNotice,
  Status,
  control,
  primary,
} from '@/features/product/ui'
export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  if (integratedLocalAllowed()){const{id}=await params;return <IntegratedCustomerDetail key={id} id={id}/>}
  if (!syntheticPreviewAllowed()) notFound()
  const { id } = await params,
    data = customerPreview(id)
  if (!data) notFound()
  return (
    <div className="space-y-4">
      <Link
        href="/clients"
        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a clientes
      </Link>
      <PreviewNotice />
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <div className="mb-2 flex gap-2">
            <Status value={data.customer.status} />
            <Badge variant="indigo">Customer 360</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            {data.customer.legal_name}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Comercial:{' '}
            {data.customer.assigned_user?.display_name ?? 'Sin asignar'} · Datos
            protegidos ocultos
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            disabled
            title="Edición pendiente de backend autorizado"
            className={control}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <Link className={primary} href={`/assistant?customer=${id}`}>
            <Bot className="h-4 w-4" />
            Consultar sobre este cliente
          </Link>
        </div>
      </header>
      <Kpis
        items={[
          {
            label: 'Contratos',
            value: data.portfolioAvailable ? data.contracts.length : '—',
            note: data.portfolioAvailable
              ? 'Registros conocidos'
              : 'No disponible',
          },
          {
            label: 'Servicios',
            value: data.portfolioAvailable ? data.services.length : '—',
            note: data.portfolioAvailable
              ? 'Registros conocidos'
              : 'No disponible',
          },
          {
            label: 'Líneas',
            value: data.portfolioAvailable ? data.lines.length : '—',
            note: data.portfolioAvailable
              ? 'Identificadores ocultos'
              : 'No disponible',
          },
          {
            label: 'Tareas abiertas',
            value: data.tasks.length,
            note: 'Información disponible',
          },
        ]}
      />
      <CustomerTabs panels={customerPanels(data)} />
    </div>
  )
}
