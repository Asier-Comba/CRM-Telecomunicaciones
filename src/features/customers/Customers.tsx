'use client'
import {OperatorSelect} from '@/features/product/integration/OperatorSelect'
import { useState } from 'react'
import Link from 'next/link'
import { Building2, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import {
  Kpis,
  PreviewNotice,
  Status,
  Empty,
  SortButton,
  control,
  primary,
} from '@/features/product/ui'
import { filterCustomers, type CustomerRow } from '@/features/product/model'
import { previewDate } from '@/lib/telecom-preview/presentation'
import { useProduct } from '@/features/product/integration/Provider'
import {AssigneeSelect} from '@/features/product/integration/AssigneeSelect'
export type CustomerCollectionControls = {
  page:number;busy:boolean;failed?:boolean;hasNext:boolean
  values:{status:string;owner:string;source:string;lifecycle:string;operator:string}
  onFilter:(key:'status'|'owner'|'source'|'lifecycle'|'operator',value:string)=>void
  next:()=>void;previous:()=>void;reload:()=>void
}
const initial = {
  query: '',
  status: '',
  owner: '',
  operator: '',
  attention: '',
}
export function Customers({ rows, onCreate, collection }: { rows: CustomerRow[]; onCreate?: () => void;collection?:CustomerCollectionControls }) {
  const integrated = useProduct().repository.mode === 'integrated_local'
  const [localFilters, setFilters] = useState(initial),
    [page, setPage] = useState(0),
    [sort, setSort] = useState<'name' | 'services' | 'renewal'>('name'),
    [desc, setDesc] = useState(false),
    [selected, setSelected] = useState<string[]>([])
  const filters=collection?{...initial,status:collection.values.status,owner:collection.values.owner}:localFilters
  const owners = [...new Set(rows.map((r) => r.owner))],
    operators = [...new Set(rows.flatMap((r) => r.operators))]
  const filtered = collection?rows:filterCustomers(rows, filters).sort((a, b) => {
    const result =
      sort === 'services'
        ? (a.services ?? -1) - (b.services ?? -1)
        : String(a[sort] ?? '9999').localeCompare(
            String(b[sort] ?? '9999'),
            'es',
          )
    return desc ? -result : result
  })
  const size = 5,
    totalPages = Math.max(1, Math.ceil(filtered.length / size)),
    current = collection?collection.page-1:Math.min(page, totalPages - 1),
    visible = collection?filtered:filtered.slice(current * size, (current + 1) * size)
  function filter(key: keyof typeof initial, value: string) {
    if(collection&&(key==='status'||key==='owner')){collection.onFilter(key,value);setSelected([]);return}
    setFilters({ ...filters, [key]: value })
    setPage(0)
    setSelected([])
  }
  function order(key: typeof sort) {
    setSort(key)
    setDesc(key === sort ? !desc : false)
  }
  const reset = () => {
    setFilters(initial)
    setPage(0)
    setSelected([])
  }
  return (
    <div className="space-y-4">
      <PageHeader
        title="Clientes"
        description="Empresas, contactos y atención comercial"
        action={
          <button
            disabled={!onCreate}
            onClick={onCreate}
            title={onCreate ? 'Registrar cliente' : 'Alta no disponible'}
            className={primary}
          >
            <Plus className="h-4 w-4" />
            Nuevo cliente
          </button>
        }
      />
      <PreviewNotice />
      <Kpis
        items={collection?[
          {label:'Empresas en esta página',value:(collection.busy||collection.failed)?'—':rows.length},
          {label:'Activas en esta página',value:(collection.busy||collection.failed)?'—':rows.filter(r=>r.status==='active').length},
          {label:'Origen manual en esta página',value:(collection.busy||collection.failed)?'—':rows.filter(r=>r.source==='manual').length},
          {label:'Asignadas en esta página',value:(collection.busy||collection.failed)?'—':rows.filter(r=>r.assignedUserId).length},
        ]:[
          { label: 'Empresas visibles', value: rows.length },
          {
            label: 'Clientes activos',
            value: integrated ? '—' : rows.filter(
              (r) => r.status === 'active' && r.lifecycle === 'customer',
            ).length,
          },
          {
            label: 'Con renovación',
            value: integrated ? '—' : rows.filter((r) => r.renewal).length,
          },
          {
            label: 'Requieren seguimiento',
            value: integrated ? '—' : rows.filter((r) => r.nextAction).length,
          },
        ]}
      />
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
          {!collection&&<input
            aria-label="Buscar clientes"
            placeholder="Buscar empresa o nombre comercial"
            className={`${control} min-w-0 flex-1 sm:min-w-56`}
            value={filters.query}
            onChange={(e) => filter('query', e.target.value)}
          />}
          <select
            aria-label="Estado de cliente"
            className={control}
            value={filters.status}
            onChange={(e) => filter('status', e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
            {collection&&<option value="archived">Archivado</option>}
          </select>
          {collection?<div className="min-w-48"><AssigneeSelect allowClear clearLabel="Todos los responsables" value={collection.values.owner} onChange={v=>collection.onFilter('owner',v)} disabled={collection.busy}/></div>:<select
            aria-label="Comercial"
            className={control}
            value={filters.owner}
            onChange={(e) => filter('owner', e.target.value)}
          >
            <option value="">Todos los comerciales</option>
            {owners.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>}
          {collection&&<OperatorSelect value={collection.values.operator} onChange={v=>collection.onFilter('operator',v)}/>}
          {!collection&&<select
            aria-label="Operador"
            className={control}
            value={filters.operator}
            onChange={(e) => filter('operator', e.target.value)}
          >
            <option value="">Todos los operadores</option>
            {operators.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>}
          {!collection&&<select
            aria-label="Atención"
            className={control}
            value={filters.attention}
            onChange={(e) => filter('attention', e.target.value)}
          >
            <option value="">Toda la atención</option>
            <option value="renewal">Con renovación</option>
            <option value="permanence">Con permanencia</option>
            <option value="action">Con próxima acción</option>
          </select>}
          {collection&&<><select aria-label="Relación comercial de clientes" className={control} value={collection.values.lifecycle} onChange={e=>collection.onFilter('lifecycle',e.target.value)}><option value="">Todas las relaciones</option><option value="lead">Lead</option><option value="prospect">Prospecto</option><option value="customer">Cliente</option><option value="former_customer">Antiguo cliente</option></select><select aria-label="Origen de clientes" className={control} value={collection.values.source} onChange={e=>collection.onFilter('source',e.target.value)}><option value="">Todos los orígenes</option><option value="manual">Manual</option><option value="import">Importado</option><option value="integration">Integración</option></select><button className={control} disabled={collection.busy} onClick={collection.reload}>Actualizar clientes</button></>}
        </div>
        {selected.length > 0 && (
          <div
            role="status"
            className="flex flex-wrap gap-3 border-b bg-indigo-50 px-4 py-2 text-xs text-indigo-700"
          >
            {selected.length} seleccionados
            <button
              onClick={() => setSelected([])}
              className="font-semibold underline"
            >
              Quitar selección
            </button>
            <span>Acciones masivas pendientes de autorización</span>
          </div>
        )}
        {collection?.busy&&<p role="status" className="p-4 text-sm text-slate-500">Consultando clientes…</p>}
        <div className="divide-y divide-slate-100 md:hidden"><label className="flex items-center gap-2 p-4 text-xs text-slate-500"><input type="checkbox" aria-label="Seleccionar página" checked={visible.length>0&&visible.every(r=>selected.includes(r.id))} onChange={e=>setSelected(e.target.checked?visible.map(r=>r.id):[])}/>Seleccionar esta página</label>{visible.map(r=><article data-customer-id={r.id} key={r.id} className="space-y-3 p-4"><label className="flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" aria-label={`Seleccionar ${r.name}`} checked={selected.includes(r.id)} onChange={e=>setSelected(e.target.checked?[...selected,r.id]:selected.filter(id=>id!==r.id))}/>Seleccionar empresa</label><div className="flex items-start justify-between gap-3"><Link href={`/clients/${r.id}`} className="min-w-0 break-words font-semibold text-slate-900">{r.name}</Link><Status value={r.status}/></div><p className="text-sm text-slate-500">{r.owner} · {{lead:'Lead',prospect:'Prospecto',customer:'Cliente',former_customer:'Antiguo cliente'}[r.lifecycle]??r.lifecycle}</p>{r.source&&<p className="text-xs text-slate-500">Origen: {{manual:'Manual',import:'Importado',integration:'Integración'}[r.source]??r.source}</p>}{!collection&&<p className="text-xs text-slate-500">{r.services===null?'Cartera: No disponible':`${r.services} servicios · ${r.lines} líneas`}</p>}{!collection&&<p className="text-xs text-slate-500">Renovación: {r.renewal?previewDate(r.renewal):'No disponible'} · Permanencia: {r.permanence?previewDate(r.permanence):'No disponible'}</p>}<Link href={`/clients/${r.id}`} className="inline-flex text-xs font-semibold text-indigo-600">Abrir 360</Link></article>)}</div>
        <div className="relative hidden max-w-full overflow-x-auto md:block">
          <table className="w-full min-w-[1150px] text-left text-xs">
            <caption className="sr-only">
              Empresas y su cartera telecom. Datos protegidos ocultos.
            </caption>
            <thead className="bg-slate-50 text-[11px] text-slate-500">
              <tr>
                <th className="p-3">
                  <input
                    type="checkbox"
                    aria-label="Seleccionar página"
                    checked={
                      visible.length > 0 &&
                      visible.every((r) => selected.includes(r.id))
                    }
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [
                              ...new Set([
                                ...selected,
                                ...visible.map((r) => r.id),
                              ]),
                            ]
                          : selected.filter(
                              (id) => !visible.some((r) => r.id === id),
                            ),
                      )
                    }
                  />
                </th>
                <th
                  className="p-3"
                  aria-sort={
                    !collection&&sort === 'name'
                      ? desc
                        ? 'descending'
                        : 'ascending'
                      : 'none'
                  }
                >
                  <SortButton
                    disabled={!!collection}
                    active={!collection&&sort === 'name'}
                    descending={desc}
                    onClick={() => order('name')}
                  >
                    Empresa / contacto
                  </SortButton>
                </th>
                <th className="p-3">Comercial</th>
                <th className="p-3">Estado</th>
                {collection?<><th className="p-3">Relación comercial</th><th className="p-3">Origen</th></>:<><th className="p-3">Operadores</th>
                <th className="p-3">
                  <SortButton
                    disabled={!!collection}
                    active={sort === 'services'}
                    descending={desc}
                    onClick={() => order('services')}
                  >
                    Servicios / líneas
                  </SortButton>
                </th>
                <th className="p-3">
                  <SortButton
                    disabled={!!collection}
                    active={sort === 'renewal'}
                    descending={desc}
                    onClick={() => order('renewal')}
                  >
                    Renovación / permanencia
                  </SortButton>
                </th>
                <th className="p-3">Oportunidad / próxima acción</th></>}
                <th className="p-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((r) => (
                <tr data-customer-id={r.id} key={r.id} className="hover:bg-indigo-50/30">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar ${r.name}`}
                      checked={selected.includes(r.id)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, r.id]
                            : selected.filter((id) => id !== r.id),
                        )
                      }
                    />
                  </td>
                  <td className="max-w-56 p-3">
                    <Link
                      href={`/clients/${r.id}`}
                      className="flex gap-2 font-semibold text-slate-900 hover:text-indigo-600"
                    >
                      <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                      {r.name}
                    </Link>
                    {!collection&&<p className="mt-1 text-[10px] text-slate-400">Contacto no disponible</p>}
                  </td>
                  <td className="p-3 text-slate-600">{r.owner}</td>
                  <td className="p-3">
                    <Status value={r.status} />
                  </td>
                  {collection?<><td className="p-3 text-slate-600">{{lead:"Lead",prospect:"Prospecto",customer:"Cliente",former_customer:"Antiguo cliente"}[r.lifecycle]??r.lifecycle}</td><td className="p-3 text-slate-600">{{manual:"Manual",import:"Importado",integration:"Integración"}[r.source??""]??r.source??"No registrado"}</td></>:<><td className="max-w-40 p-3 text-slate-600">
                    {r.services === null
                      ? 'No disponible'
                      : r.operators.join(', ') || 'Sin operador conocido'}
                  </td>
                  <td className="p-3 text-slate-700">
                    {r.services === null
                      ? 'No disponible'
                      : `${r.services} servicios · ${r.lines} líneas`}
                  </td>
                  <td className="p-3">
                    <p>
                      {r.renewal
                        ? previewDate(r.renewal)
                        : 'Renovación no disponible'}
                    </p>
                    <p className="mt-1 text-slate-400">
                      {r.permanence
                        ? previewDate(r.permanence)
                        : 'Permanencia no disponible'}
                    </p>
                  </td>
                  <td className="max-w-52 p-3">
                    <p className="font-medium text-slate-700">
                      {r.opportunity ?? 'Sin oportunidad disponible'}
                    </p>
                    <p className="mt-1 text-slate-400">
                      {r.nextAction ?? 'Sin acción disponible'}
                    </p>
                  </td></>}
                  <td className="p-3">
                    <Link
                      href={`/clients/${r.id}`}
                      className="font-semibold text-indigo-600"
                    >
                      Abrir 360
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visible.length&&!collection?.busy&&!collection?.failed && <Empty reset={collection?undefined:reset} />}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
          <p role="status" className="text-xs text-slate-500">
            {collection?(collection.busy?'Cargando clientes…':collection.failed?'Clientes no disponibles':`Página ${collection.page} · ${rows.length} empresas en esta página`):`${filtered.length} resultados · página ${current + 1} de ${totalPages}`}
          </p>
          <div className="flex gap-2">
            <button
              className={control}
              aria-label="Página anterior"
              disabled={collection?collection.busy||collection.page===1:current===0}
              onClick={() => {setSelected([]);if(collection)collection.previous();else setPage(current - 1)}}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              className={control}
              aria-label="Página siguiente"
              disabled={collection?collection.busy||!collection.hasNext:current+1===totalPages}
              onClick={() => {setSelected([]);if(collection)collection.next();else setPage(current + 1)}}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </footer>
      </section>
      <p className="text-xs text-slate-500">
        CIF, teléfono y correo permanecen ocultos. No disponible indica falta de
        información, no un valor cero.
      </p>
    </div>
  )
}
