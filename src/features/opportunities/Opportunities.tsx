'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Plus, LayoutGrid, List } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import {
  Kpis,
  PreviewNotice,
  Empty,
  Drawer,
  control,
  primary,
  Status,
} from '@/features/product/ui'
import { fold } from '@/features/product/model'
import { previewDate } from '@/lib/telecom-preview/presentation'
import type { OpportunityItemV1 } from '@/lib/contracts/telecom-v1'
const money = (minor: number, currency: string) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(
    minor / 100,
  )
export function Opportunities({
  items,
}: {
  items: readonly OpportunityItemV1[]
}) {
  const [mode, setMode] = useState('board'),
    [query, setQuery] = useState(''),
    [owner, setOwner] = useState(''),
    [selected, setSelected] = useState<OpportunityItemV1 | null>(null)
  const rows = items.filter(
      (o) =>
        (!query ||
          fold(`${o.title} ${o.customer?.display_name}`).includes(
            fold(query),
          )) &&
        (!owner || o.owner?.display_name === owner),
    ),
    stages = [...new Set(items.map((o) => o.stage.display_name))]
  const card = (o: OpportunityItemV1) => (
    <button
      key={o.id}
      onClick={() => setSelected(o)}
      className="block w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-indigo-300"
    >
      <p className="text-xs font-semibold leading-5 text-slate-900">
        {o.title}
      </p>
      <p className="mt-1 text-[11px] text-slate-500">
        {o.customer?.display_name ?? 'Empresa no disponible'}
      </p>
      <div className="mt-3 flex justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-800">
          {o.amount
            ? money(o.amount.minor_units, o.amount.currency)
            : 'Valor no disponible'}
        </span>
        <Status value={o.status} />
      </div>
      <p className="mt-3 border-t pt-2 text-[10px] text-slate-500">
        {o.owner?.display_name ?? 'Sin comercial'}
      </p>
      <p
        className={`mt-1 text-[10px] ${o.follow_up_state === 'overdue' ? 'text-amber-700' : 'text-slate-500'}`}
      >
        {o.next_follow_up_at
          ? `Seguimiento ${previewDate(o.next_follow_up_at)}`
          : o.follow_up_state === 'overdue'
            ? 'Necesita seguimiento'
            : 'Fecha de seguimiento no disponible'}
      </p>
    </button>
  )
  return (
    <div className="space-y-4">
      <PageHeader
        title="Oportunidades"
        description="Pipeline comercial, responsables y próximas acciones"
        action={
          <button
            className={primary}
            disabled
            title="Creación pendiente de contrato CRUD autorizado"
          >
            <Plus className="h-4 w-4" />
            Nueva oportunidad
          </button>
        }
      />
      <PreviewNotice />
      <Kpis
        items={[
          {
            label: 'Oportunidades abiertas',
            value: items.filter((o) => o.status === 'open').length,
          },
          {
            label: 'Con valor publicado',
            value: items.filter((o) => o.amount).length,
            note: 'No se suman monedas ni valores desconocidos',
          },
          {
            label: 'Sin próximo seguimiento',
            value: items.filter((o) => !o.next_follow_up_at).length,
            tone: 'text-amber-600',
          },
          { label: 'Etapas publicadas', value: stages.length },
        ]}
      />
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white p-3">
        <input
          aria-label="Buscar oportunidades"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar oportunidad o empresa"
          className={`${control} w-full min-w-0 sm:w-auto sm:flex-1`}
        />
        <select
          aria-label="Comercial de oportunidad"
          className={control}
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
        >
          <option value="">Todos los comerciales</option>
          {[
            ...new Set(
              items.map((o) => o.owner?.display_name ?? 'Sin asignar'),
            ),
          ].map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <button
          className={control}
          aria-label="Vista pipeline"
          aria-pressed={mode === 'board'}
          onClick={() => setMode('board')}
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
        <button
          className={control}
          aria-label="Vista lista"
          aria-pressed={mode === 'list'}
          onClick={() => setMode('list')}
        >
          <List className="h-4 w-4" />
        </button>
      </div>
      {mode === 'board' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stages.map((stage) => (
            <section
              key={stage}
              className="rounded-xl border border-slate-200 bg-slate-100/60 p-3"
            >
              <h2 className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-700">
                {stage}
                <span className="rounded bg-white px-2 py-0.5 text-xs">
                  {rows.filter((o) => o.stage.display_name === stage).length}
                </span>
              </h2>
              <div className="space-y-3">
                {rows.filter((o) => o.stage.display_name === stage).map(card)}
              </div>
            </section>
          ))}
          <section className="rounded-xl border border-dashed border-slate-300 p-4">
            <h2 className="text-sm font-semibold text-slate-500">
              Definición del pipeline
            </h2>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Se muestran las etapas presentes en la lectura autorizada. El
              catálogo completo y el arrastre de tarjetas requieren contratos de
              etapas y mutaciones.
            </p>
          </section>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">{rows.map(card)}</div>
      )}
      {!rows.length && (
        <Empty
          reset={() => {
            setQuery('')
            setOwner('')
          }}
        />
      )}
      {selected && (
        <Drawer title={selected.title} onClose={() => setSelected(null)}>
          {card(selected)}
          <dl className="space-y-3 text-sm">
            {[
              [
                'Próxima acción',
                selected.next_follow_up_at
                  ? previewDate(selected.next_follow_up_at)
                  : 'Seguimiento requerido; fecha no disponible',
              ],
              ['Cierre previsto', 'No disponible'],
              [
                'Productos y contratos vinculados',
                'No disponibles en esta lectura',
              ],
              ['Historial', 'Pendiente de proyección autorizada'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-slate-400">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          {selected.customer && (
            <>
              <Link
                className="block text-sm font-semibold text-indigo-600"
                href={`/clients/${selected.customer.id}`}
              >
                Abrir empresa
              </Link>
              <Link
                className="block text-sm font-semibold text-indigo-600"
                href={`/assistant?customer=${selected.customer.id}`}
              >
                Consultar contexto del cliente
              </Link>
            </>
          )}
          <button disabled className={control}>
            Cambiar etapa
          </button>
          <p className="text-xs text-slate-500">
            Las acciones necesitan autorización del servidor.
          </p>
        </Drawer>
      )}
    </div>
  )
}
