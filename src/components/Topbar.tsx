'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Search, Menu, ShieldCheck } from 'lucide-react'
import { fold, customerHref, type SearchItem } from '@/features/product/model'
import { BRAND } from '@/lib/brand'
export function Topbar({
  onMenuClick,
  search = [],
}: {
  onMenuClick?: () => void
  search?: SearchItem[]
}) {
  const [query, setQuery] = useState(''),
    [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  const results =
    query.trim().length >= 2
      ? search
          .filter((s) => fold(`${s.label} ${s.detail}`).includes(fold(query)))
          .slice(0, 8)
      : []
  const labels = {
    customer: 'Cliente',
    contract: 'Contrato',
    service: 'Servicio',
    line: 'Línea',
    opportunity: 'Oportunidad',
  }
  return (
    <header className="relative z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={onMenuClick}
          aria-label="Abrir menú de navegación"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="hidden text-sm font-semibold text-slate-700 sm:block">
          {BRAND.appName}
        </span>
      </div>
      <div ref={ref} className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          aria-label="Búsqueda global"
          disabled={!search.length}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false)
          }}
          placeholder={
            search.length
              ? 'Buscar empresa, contrato, servicio…'
              : 'Búsqueda pendiente de conexión'
          }
          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
        />
        {open && query.length >= 2 && (
          <div
            aria-label="Resultados de búsqueda"
            className="absolute inset-x-0 top-full mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
          >
            <p className="px-3 py-2 text-[10px] font-semibold uppercase text-slate-400">
              Resultados sintéticos · abrir ficha del cliente
            </p>
            {results.map((r) => (
              <Link
                key={`${r.kind}-${r.id}`}
                onClick={() => {
                  setOpen(false)
                  setQuery('')
                }}
                href={customerHref(r.customerId) ?? '/clients'}
                className="block rounded-lg px-3 py-2 hover:bg-indigo-50"
              >
                <p className="text-xs font-semibold text-slate-800">
                  {r.label}
                </p>
                <p className="text-[11px] text-slate-500">
                  {labels[r.kind]} · {r.detail}
                </p>
              </Link>
            ))}
            {!results.length && (
              <p role="status" className="p-3 text-xs text-slate-500">
                Sin coincidencias en los datos disponibles.
              </p>
            )}
          </div>
        )}
      </div>
      <span className="hidden items-center gap-1.5 whitespace-nowrap text-xs text-slate-500 md:flex">
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        Acceso protegido
      </span>
    </header>
  )
}
