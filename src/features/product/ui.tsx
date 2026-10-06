'use client'

import { useId, useRef, useEffect, type ReactNode } from 'react'
import { X, LockKeyhole, Search, ArrowUpDown } from 'lucide-react'
import { Badge } from '@/components/Badge'
import { periods, type Period } from './model'
import { useProduct } from './integration/Provider'

export const control =
  'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50'
export const primary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-45'
export function PreviewNotice() {
  const { repository } = useProduct()
  if (repository.mode === 'integrated_local') return <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900"><strong>Integración local</strong> · Datos sintéticos de prueba · Cambios guardados en la base local</div>
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs text-indigo-800">
      <span>
        <strong>Datos de demostración</strong> · instantánea del 30 sep 2026
      </span>
      <span>Solo lectura · información parcial indicada por sección</span>
    </div>
  )
}
export function Kpis({
  items,
}: {
  items: Array<{
    label: string
    value: ReactNode
    note?: string
    tone?: string
  }>
}) {
  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
        >
          <dt className="text-xs font-medium text-slate-500">{item.label}</dt>
          <dd
            className={`mt-1 break-words text-xl font-bold tracking-tight sm:text-2xl ${item.tone ?? 'text-slate-950'}`}
          >
            {item.value}
          </dd>
          {item.note && (
            <p className="mt-1 text-[11px] text-slate-500">{item.note}</p>
          )}
        </div>
      ))}
    </dl>
  )
}
export function Unavailable({
  title = 'Datos no disponibles',
  children,
}: {
  title?: string
  children?: ReactNode
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <LockKeyhole className="h-4 w-4" />
        {title}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        {children ??
          'Esta sección necesita una lectura autorizada. No se interpreta como ausencia de registros.'}
      </p>
    </div>
  )
}
export function Empty({
  text = 'No hay resultados con estos filtros.',
  reset,
}: {
  text?: string
  reset?: () => void
}) {
  return (
    <div className="py-10 text-center">
      <Search className="mx-auto mb-3 h-7 w-7 text-slate-300" />
      <p className="text-sm text-slate-600">{text}</p>
      {reset && (
        <button
          className="mt-3 text-sm font-semibold text-indigo-600"
          onClick={reset}
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )
}
export function PeriodSelect({
  value,
  onChange,
}: {
  value: Period
  onChange: (value: Period) => void
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-slate-500">
      Periodo
      <select
        aria-label="Periodo"
        className={control}
        value={value}
        onChange={(e) => onChange(e.target.value as Period)}
      >
        {periods.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
    </label>
  )
}
export function Status({ value }: { value: string }) {
  const names: Record<string, string> = {
    active: 'Activo',
    inactive: 'Inactivo',
    suspended: 'Suspendido',
    draft: 'Borrador',
    expired: 'Caducada', pending: 'Pendiente',
    in_progress: 'En curso',
    open: 'Abierta',
    won: 'Ganada',
    lost: 'Perdida',
    completed: 'Completada',
    scheduled: 'Programada', archived:'Archivado',cancelled:'Cancelado',ended:'Finalizado',retired:'Retirado',prepared:'Preparada',assigned:'Asignada',replaced:'Sustituida',requested:'Solicitada',rejected:'Rechazada',waiting_customer:'Esperando al cliente',waiting_operator:'Esperando al operador',resolved:'Resuelta',closed:'Cerrada',no_show:'No asistió',dismissed:'Descartada',not_applicable:'No aplica',
  }
  return (
    <Badge
      variant={
        ['active', 'won', 'completed'].includes(value)
          ? 'success'
          : ['suspended', 'lost'].includes(value)
            ? 'warning'
            : 'default'
      }
      dot
    >
      {names[value] ?? value}
    </Badge>
  )
}
export function SortButton({
  children,
  active,
  descending,
  onClick,
  disabled=false,
}: {
  children: ReactNode
  active: boolean
  descending: boolean
  onClick: () => void
  disabled?:boolean
}) {
  return (
    <button
      className="inline-flex items-center gap-1 text-left font-semibold hover:text-indigo-600"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
      {!disabled&&<ArrowUpDown className="h-3 w-3" />}
      {!disabled&&<span className="sr-only">
        {active ? (descending ? ', descendente' : ', ascendente') : ', ordenar'}
      </span>}
    </button>
  )
}
export function Tabs({
  items,
  value,
  onChange,
  prefix='',
}: {
  prefix?: string
  items: readonly string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div
      className="flex gap-1 overflow-x-auto border-b border-slate-200"
      role="tablist"
      aria-label="Secciones"
    >
      {items.map((item) => (
        <button
          type="button"
          role="tab"
          aria-selected={value === item}
          id={`${prefix}tab-${item}`}
          aria-controls={`${prefix}panel-${item}`}
          tabIndex={value === item ? 0 : -1}
          key={item}
          onClick={() => onChange(item)}
          onKeyDown={(e) => {
            const i = items.indexOf(item)
            if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
              e.preventDefault()
              const next =
                e.key === 'Home'
                  ? 0
                  : e.key === 'End'
                    ? items.length - 1
                    : (i + (e.key === 'ArrowRight' ? 1 : -1) + items.length) %
                      items.length
              onChange(items[next])
              document.getElementById(`${prefix}tab-${items[next]}`)?.focus()
            }
          }}
          className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-indigo-500 ${value === item ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          {item}
        </button>
      ))}
    </div>
  )
}
export function Drawer({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId()
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.showModal()
    return () => {
      previous?.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onCancel={(e) => { e.preventDefault(); onClose() }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-[min(36rem,100vw)] max-w-none border-l border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/35"
    >
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-white px-5 py-4">
        <h2 id={id} className="text-lg font-bold text-slate-900">
          {title}
        </h2>
        <button onClick={onClose} aria-label="Cerrar panel" className={control}>
          <X className="h-4 w-4" />
        </button>
      </header>
      <div className="space-y-5 p-5">{children}</div>
    </dialog>
  )
}
