'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/Badge'
import {
  PreviewNotice,
  Drawer,
  Empty,
  control,
  primary,
} from '@/features/product/ui'
import {
  addDays,
  weekStart,
  calendarDate,
  type CalendarEntry,
} from '@/features/product/model'
import { previewDate } from '@/lib/telecom-preview/presentation'
const types = {
  meeting: 'Reunión',
  task: 'Tarea',
  renewal: 'Renovación',
  permanence: 'Permanencia',
}
const colors = {
  meeting: 'border-sky-300 bg-sky-50 text-sky-800',
  task: 'border-indigo-300 bg-indigo-50 text-indigo-800',
  renewal: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  permanence: 'border-amber-300 bg-amber-50 text-amber-900',
}
const time = (value: string) =>
  new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Madrid',
  }).format(new Date(value))
/** Compact weekly cards share columns when their displayed footprints overlap. */
function weekPositions(entries:CalendarEntry[]){
 const rows=entries.map(entry=>{const parts=time(entry.date).split(':').map(Number);return{entry,top:Math.max(0,Math.min(11.25,parts[0]+parts[1]/60-8))*48}}).sort((a,b)=>a.top-b.top||a.entry.id.localeCompare(b.entry.id))
 const groups:{end:number;columns:number[];rows:{entry:CalendarEntry;top:number;column:number}[]}[]=[]
 for(const row of rows){let group=groups.at(-1);if(!group||row.top>=group.end){group={end:row.top+48,columns:[],rows:[]};groups.push(group)}let column=group.columns.findIndex(end=>end<=row.top);if(column<0)column=group.columns.length;group.columns[column]=row.top+48;group.end=Math.max(group.end,row.top+48);group.rows.push({...row,column})}
 return groups.flatMap(group=>group.rows.map(row=>({...row,count:group.columns.length})))
}
function monthDays(anchor: string) {
  const first = anchor.slice(0, 7) + '-01',
    start = weekStart(first)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}
function moveMonth(anchor: string, delta: number) {
  const d = new Date(`${anchor.slice(0, 7)}-01T12:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + delta)
  return d.toISOString().slice(0, 10)
}
export function Calendar({
  entries,
  asOf,
  onCreate,
  onSelect,
  onRange,
}: {
  entries: CalendarEntry[]
  asOf: string
  onCreate?: () => void
  onSelect?: (entry: CalendarEntry) => void
  onRange?: (anchor: string) => void
}) {
  const today = calendarDate(asOf),
    [anchor, setAnchor] = useState(today),
    [view, setView] = useState<'day' | 'week' | 'month' | 'agenda'>('week'),
    [owner, setOwner] = useState(''),
    [type, setType] = useState(''),
    [selected, setSelected] = useState<CalendarEntry | null>(null)
  useEffect(()=>{onRange?.(anchor)},[anchor,onRange])
  const start = weekStart(anchor),
    days = Array.from({ length: 7 }, (_, i) => addDays(start, i)),
    gridDays=view==='day'?[anchor]:days,
    month = monthDays(anchor),
    filtered = entries.filter(
      (e) => (!owner || e.owner === owner) && (!type || e.type === type),
    ),
    owners = [...new Set(entries.map((e) => e.owner))]
  const current = filtered
    .filter((e) =>
      view === 'month'
        ? calendarDate(e.date).slice(0, 7) === anchor.slice(0, 7)
        : view==='day'?calendarDate(e.date)===anchor:calendarDate(e.date) >= start && calendarDate(e.date) <= days[6],
    )
    .sort((a, b) => a.date.localeCompare(b.date))
  const monthLabel = new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${anchor}T12:00:00Z`))
  const event = (e: CalendarEntry, compact = false) => (
    <button
      key={e.id}
      data-calendar-id={e.id}
      title={e.title}
      onClick={() => onSelect ? onSelect(e) : setSelected(e)}
      className={`mb-1 block w-full rounded border-l-2 p-1.5 ${compact?'h-12 overflow-hidden':''} text-left text-[10px] leading-4 ${colors[e.type]}`}
    >
      <span className={compact?'block truncate font-semibold':'block font-semibold'}>
        {e.allDay ? types[e.type] : time(e.date)} · {e.title}
      </span>
      <span className="block truncate opacity-80">{e.customer}</span>
    </button>
  )
  return (
    <div className="space-y-4">
      <PageHeader
        title="Calendario y tareas"
        description="Agenda, seguimiento y fechas de tu cartera"
        action={
          <button
            disabled={!onCreate}
            onClick={onCreate}
            title={onCreate ? 'Crear tarea o reunión local' : 'Alta pendiente de contrato autorizado de calendario'}
            className={primary}
          >
            <Plus className="h-4 w-4" />
            Nueva cita
          </button>
        }
      />
      <PreviewNotice />
      <div className="grid items-start gap-4 xl:grid-cols-[230px_1fr]">
        <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-1">
            <p className="text-xs font-semibold capitalize">{monthLabel}</p>
            <button
              className="p-1"
              aria-label="Mes anterior"
              onClick={() => setAnchor(moveMonth(anchor, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              className="p-1"
              aria-label="Mes siguiente"
              onClick={() => setAnchor(moveMonth(anchor, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
              <span key={d} className="font-semibold text-slate-400">
                {d}
              </span>
            ))}
            {month.map((day) => (
              <button
                aria-label={`Ir al ${day}`}
                aria-pressed={anchor === day}
                key={day}
                onClick={() => setAnchor(day)}
                className={`relative rounded py-1.5 ${anchor === day ? 'bg-indigo-600 text-white' : day.slice(0, 7) === anchor.slice(0, 7) ? 'text-slate-700 hover:bg-indigo-50' : 'text-slate-300'}`}
              >
                {Number(day.slice(8))}
                {entries.some((e) => calendarDate(e.date) === day) && (
                  <span className="absolute bottom-0 left-1/2 h-1 w-1 rounded-full bg-indigo-300" />
                )}
              </button>
            ))}
          </div>
          <label className="block text-xs text-slate-500">
            Comercial
            <select
              aria-label="Filtrar calendario por comercial"
              className={`${control} mt-1 w-full`}
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            >
              <option value="">Todos</option>
              {owners.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-slate-500">
            Tipo
            <select
              aria-label="Tipo de evento"
              className={`${control} mt-1 w-full`}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">Todos</option>
              {Object.entries(types).map(([key, label]) => (
                <option value={key} key={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="space-y-2">
            {Object.entries(types).map(([key, label]) => (
              <p
                className="flex items-center gap-2 text-[11px] text-slate-500"
                key={key}
              >
                <span
                  className={`h-2.5 w-2.5 rounded border ${colors[key as keyof typeof colors]}`}
                />
                {label}
              </p>
            ))}
          </div>
          <p className="text-[10px] leading-4 text-slate-400">
            Horario Europe/Madrid. Llamadas, instalación y vencimiento de
            contrato necesitan su proyección de eventos.
          </p>
        </aside>
        <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
            <div className="flex flex-wrap items-center gap-2">
              <button className={control} onClick={() => setAnchor(today)}>
                Hoy
              </button>
              <button
                className={control}
                aria-label="Periodo anterior"
                onClick={() =>
                  setAnchor(
                    view === 'month'
                      ? moveMonth(anchor, -1)
                      : addDays(anchor, view==='day'?-1:-7),
                  )
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                className={control}
                aria-label="Periodo siguiente"
                onClick={() =>
                  setAnchor(
                    view === 'month'
                      ? moveMonth(anchor, 1)
                      : addDays(anchor, view==='day'?1:7),
                  )
                }
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <h2 className="text-sm font-semibold text-slate-800">
                {view === 'month'
                  ? monthLabel
                  : view==='day'?previewDate(anchor):`${previewDate(start)} – ${previewDate(days[6])}`}
              </h2>
            </div>
            <div className="flex rounded-lg bg-slate-100 p-1">
              {(['day', 'week', 'month', 'agenda'] as const).map((v) => (
                <button
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                  key={v}
                  className={`rounded px-3 py-1.5 text-xs font-medium ${view === v ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
                >
                  {v==='day'?'Día':v === 'week' ? 'Semana' : v === 'month' ? 'Mes' : 'Agenda'}
                </button>
              ))}
            </div>
          </header>
          {view === 'agenda' ? (
            <div className="p-4">
              {current.map((e) => (
                <div
                  key={e.id}
                  className="mb-3 grid gap-2 sm:grid-cols-[120px_1fr]"
                >
                  <p className="pt-2 text-xs font-semibold text-slate-500">
                    {previewDate(e.date)}
                  </p>
                  {event(e)}
                </div>
              ))}
              {!current.length && (
                <Empty text="Sin eventos disponibles en esta semana." />
              )}
            </div>
          ) : view === 'month' ? (
            <div className="overflow-x-auto">
              <div className="grid min-w-[650px] grid-cols-7">
                {month.map((day) => (
                  <div
                    key={day}
                    className={`min-h-28 border-b border-r border-slate-100 p-2 ${day.slice(0, 7) !== anchor.slice(0, 7) ? 'bg-slate-50' : ''}`}
                  >
                    <p
                      className={`mb-2 text-xs font-semibold ${day === today ? 'text-indigo-600' : 'text-slate-500'}`}
                    >
                      {Number(day.slice(8))}
                    </p>
                    {filtered
                      .filter((e) => calendarDate(e.date) === day)
                      .map(e=>event(e))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className={view==='day'?'min-w-0':'min-w-[740px]'}>
                <div className={`grid ${view==='day'?'grid-cols-[48px_minmax(0,1fr)]':'grid-cols-[48px_repeat(7,1fr)]'} border-b border-slate-100`}>
                  <span className="p-2 text-[10px] text-slate-400">Madrid</span>
                  {gridDays.map((day) => (
                    <div
                      className={`border-l border-slate-100 p-2 text-center text-xs font-semibold ${day === today ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500'}`}
                      key={day}
                    >
                      {new Intl.DateTimeFormat('es-ES', {
                        weekday: 'short',
                        day: 'numeric',
                        timeZone: 'UTC',
                      }).format(new Date(`${day}T12:00:00Z`))}
                    </div>
                  ))}
                </div>
                <div className={`grid ${view==='day'?'grid-cols-[48px_minmax(0,1fr)]':'grid-cols-[48px_repeat(7,1fr)]'} border-b border-slate-100`}>
                  <span className="p-1 text-[9px] text-slate-400">
                    Todo el día
                  </span>
                  {gridDays.map((day) => (
                    <div
                      key={day}
                      className="min-h-10 border-l border-slate-100 p-1"
                    >
                      {filtered
                        .filter((e) => e.allDay && calendarDate(e.date) === day)
                        .map(e=>event(e))}
                    </div>
                  ))}
                </div>
                <div className={`grid ${view==='day'?'grid-cols-[48px_minmax(0,1fr)]':'grid-cols-[48px_repeat(7,1fr)]'}`}>
                  <div>
                    {Array.from({ length: 12 }, (_, i) => (
                      <div
                        key={i}
                        className="h-12 border-b border-slate-100 pr-1 text-right text-[10px] text-slate-400"
                      >
                        {i + 8}:00
                      </div>
                    ))}
                  </div>
                  {gridDays.map((day) => (
                    <div
                      key={day}
                      className="relative border-l border-slate-100"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <div
                          key={i}
                          className="h-12 border-b border-slate-100"
                        />
                      ))}
                      {weekPositions(filtered.filter(e=>!e.allDay&&calendarDate(e.date)===day)).map(({entry,top,column,count})=><div key={entry.id} className="absolute" style={{top,left:`calc(${column/count*100}% + 2px)`,width:`calc(${100/count}% - 4px)`}}>{event(entry,true)}</div>)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <footer className="border-t px-4 py-2 text-[11px] text-slate-500">
            {current.length} registros en el periodo · sincronización externa no disponible
          </footer>
        </section>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">Próximas citas y fechas</h2>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {filtered
            .filter((e) => calendarDate(e.date) >= today)
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(0, 4)
            .map(e=>event(e))}
        </div>
      </div>
      {selected && (
        <Drawer title={selected.title} onClose={() => setSelected(null)}>
          <Badge variant="indigo">{types[selected.type]}</Badge>
          <dl className="space-y-3 text-sm">
            {[
              ['Fecha', previewDate(selected.date)],
              ['Empresa', selected.customer],
              ['Comercial', selected.owner],
              [
                'Fin',
                selected.end ? previewDate(selected.end) : 'No disponible',
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-slate-400">{label}</dt>
                <dd className="mt-1 text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
          {selected.customerId && (
            <Link className={primary} href={`/clients/${selected.customerId}`}>
              Abrir cliente
            </Link>
          )}
          <div className="flex gap-2">
            <button className={control} disabled>
              Editar cita
            </button>
            <button className={control} disabled>
              Cancelar cita
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Las modificaciones requieren un contrato seguro de calendario.
          </p>
        </Drawer>
      )}
    </div>
  )
}
