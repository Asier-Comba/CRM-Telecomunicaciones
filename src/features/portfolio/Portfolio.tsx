'use client'
import { useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/PageHeader'
import {
  Kpis,
  Tabs,
  PreviewNotice,
  Empty,
  control,
  Status,
  Drawer,
} from '@/features/product/ui'
import { fold } from '@/features/product/model'
export type PortfolioRow = {
  id: string
  name: string
  customer: string
  customerId: string
  operator: string
  plan: string
  status: string
  date: string
  type: string
}
export type PortfolioData = Record<
  | 'Contratos'
  | 'Servicios'
  | 'Líneas'
  | 'Operadores'
  | 'Planes/Tarifas'
  | 'Renovaciones'
  | 'Permanencias',
  PortfolioRow[]
>
export function Portfolio({ data }: { data: PortfolioData }) {
  const [tab, setTab] = useState('Contratos'),
    [query, setQuery] = useState(''),
    [status, setStatus] = useState(''),
    [operator, setOperator] = useState(''),
    [sort, setSort] = useState('name'),
    [selected, setSelected] = useState<PortfolioRow | null>(null)
  const all = data[tab as keyof PortfolioData],
    rows = all
      .filter(
        (r) =>
          (!query ||
            fold(`${r.name} ${r.customer} ${r.plan}`).includes(fold(query))) &&
          (!status || r.status === status) &&
          (!operator || r.operator === operator),
      )
      .sort((a, b) =>
        sort === 'date'
          ? a.date.localeCompare(b.date)
          : a.name.localeCompare(b.name, 'es'),
      )
  return (
    <div className="space-y-4">
      <PageHeader
        title="Cartera Telecom"
        description="Contratos, servicios y líneas; cada activo con su contexto"
      />
      <PreviewNotice />
      <Kpis
        items={[
          { label: 'Contratos conocidos', value: data.Contratos.length },
          { label: 'Servicios conocidos', value: data.Servicios.length },
          { label: 'Líneas conocidas', value: data.Líneas.length },
          { label: 'Operadores de la muestra', value: data.Operadores.length },
        ]}
      />
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <Tabs
          items={Object.keys(data)}
          value={tab}
          onChange={(t) => {
            setTab(t)
            setStatus('')
            setQuery('')
            setOperator('')
          }}
        />
        <section
          role="tabpanel"
          id={`panel-${tab}`}
          aria-labelledby={`tab-${tab}`}
        >
          <div className="flex flex-wrap gap-2 border-b p-3">
            <input
              aria-label="Buscar en cartera"
              placeholder="Buscar cliente, contrato o tarifa"
              className={`${control} min-w-0 flex-1`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              aria-label="Estado de cartera"
              className={control}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Todos los estados</option>
              {[...new Set(all.map((r) => r.status))].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              aria-label="Operador de cartera"
              className={control}
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
            >
              <option value="">Todos los operadores</option>
              {[...new Set(all.map((r) => r.operator))].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              aria-label="Ordenar cartera"
              className={control}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="name">Nombre</option>
              <option value="date">Fecha</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <caption className="sr-only">{tab} de la muestra telecom</caption>
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {[
                    'Activo',
                    'Empresa',
                    'Operador / plan',
                    'Estado',
                    'Fecha',
                    'Detalle',
                  ].map((h) => (
                    <th key={h} className="p-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-indigo-50/30">
                    <td className="p-3">
                      <p className="font-semibold text-slate-900">{r.name}</p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        {r.type}
                      </p>
                    </td>
                    <td className="p-3">
                      <Link
                        className="text-indigo-700"
                        href={`/clients/${r.customerId}`}
                      >
                        {r.customer}
                      </Link>
                    </td>
                    <td className="p-3">
                      <p>{r.operator}</p>
                      <p className="mt-1 text-slate-400">{r.plan}</p>
                    </td>
                    <td className="p-3">
                      <Status value={r.status} />
                    </td>
                    <td className="p-3">{r.date}</td>
                    <td className="p-3">
                      <button
                        className="font-semibold text-indigo-600"
                        onClick={() => setSelected(r)}
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && (
            <Empty
              reset={() => {
                setQuery('')
                setStatus('')
                setOperator('')
              }}
            />
          )}
          <p role="status" className="border-t p-3 text-xs text-slate-500">
            {rows.length} registros conocidos · cartera parcial; no equivale al
            total del negocio
          </p>
        </section>
      </div>
      <p className="text-xs text-slate-500">
        Planes y operadores se deducen de los contratos disponibles. No hay
        catálogo ni tarifas económicas publicados. Importaciones pendientes de
        conexión.
      </p>
      {selected && (
        <Drawer title={selected.name} onClose={() => setSelected(null)}>
          <dl className="space-y-3 text-sm">
            {[
              ['Empresa', selected.customer],
              ['Operador', selected.operator],
              ['Plan', selected.plan],
              ['Fecha', selected.date],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-slate-400">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <Status value={selected.status} />
          <Link
            className="block text-sm font-semibold text-indigo-600"
            href={`/clients/${selected.customerId}`}
          >
            Abrir ficha 360
          </Link>
          <Link
            className="block text-sm font-semibold text-indigo-600"
            href={`/assistant?customer=${selected.customerId}`}
          >
            Consultar sobre este activo
          </Link>
          <p className="text-xs text-slate-500">
            El asistente recibe contexto de cliente; el contrato de consulta por
            activo todavía no está publicado.
          </p>
          <button disabled className={control}>
            Editar activo
          </button>
        </Drawer>
      )}
    </div>
  )
}
