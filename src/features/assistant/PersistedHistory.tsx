'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { useProduct } from '@/features/product/integration/Provider'
import { control, primary, Drawer } from '@/features/product/ui'
import type { ConversationRecordV2 } from '@/assistant/conversation-contract-v2'
import { historyRequestV2, historyErrorTextV2, HistoryClientErrorV2, type HistoryResultsV2 } from './history-client-v2'

type HistoryState = {
  actorId: string | null
  list: HistoryResultsV2['thread.list']
  selected: ConversationRecordV2 | null
  messages: HistoryResultsV2['message.page'] | null
  threadCursors: string[]
  messageCursors: number[]
}

/** User-owned display history; never CRM facts, model context or action authority. */
export function PersistedHistory() {
  const { actorId } = useProduct()
  const [state, setState] = useState<HistoryState | null>(null)
  const [busy, setBusy] = useState(true), [error, setError] = useState('')
  const [title, setTitle] = useState(''), [rename, setRename] = useState('')
  const [archive, setArchive] = useState(false)
  const controller = useRef<AbortController | null>(null), epoch = useRef(0), locked = useRef(false)
  const lastSelection = useRef<string | null>(null)
  const [pendingCreate, setPendingCreate] = useState<{ id: string; title: string } | null>(null)
  const invalidate = useCallback(() => { ++epoch.current; controller.current?.abort(); locked.current = false }, [])
  const current = state?.actorId === actorId ? state : null

  useEffect(() => {
    const abort = new AbortController(), generation = ++epoch.current
    controller.current = abort
    void historyRequestV2('thread.list', { limit: 20 }, abort.signal).then(list => {
      if (generation === epoch.current) { setState({ actorId, list, selected: null, messages: null, threadCursors: [], messageCursors: [] }); setError(''); setBusy(false) }
    }).catch(cause => {
      if (generation === epoch.current) { setState(null); setError(historyErrorTextV2(cause)); setBusy(false) }
    })
    return invalidate
  }, [actorId, invalidate])

  async function run(action: (signal: AbortSignal) => Promise<HistoryState>) {
    if (locked.current) return
    locked.current = true
    const abort = new AbortController(), generation = ++epoch.current
    controller.current?.abort(); controller.current = abort
    setBusy(true); setState(null); setError(''); setArchive(false)
    try { const next = await action(abort.signal); if (generation === epoch.current) setState(next) }
    catch (cause) { if (generation === epoch.current) { setState(null); setError(historyErrorTextV2(cause)) } }
    finally { if (generation === epoch.current) { locked.current = false; setBusy(false) } }
  }
  async function load(signal: AbortSignal, threadCursors: string[] = [], selected: Pick<ConversationRecordV2, 'id'> | null = null): Promise<HistoryState> {
    const list = await historyRequestV2('thread.list', { limit: 20, ...(threadCursors.at(-1) ? { after_id: threadCursors.at(-1) } : {}) }, signal)
    if (!selected) return { actorId, list, selected: null, messages: null, threadCursors, messageCursors: [] }
    const fresh = await historyRequestV2('thread.get', { id: selected.id }, signal)
    const messages = await historyRequestV2('message.page', { id: fresh.record.id, limit: 20 }, signal)
    lastSelection.current = fresh.record.id
    return { actorId, list, selected: fresh.record, messages, threadCursors, messageCursors: [] }
  }
  return <div className="space-y-4">
    <PageHeader title="Asistente de cartera" description="Historial privado de tus conversaciones" />
    <p role="status" className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-900">Las consultas IA están en preparación. Puedes consultar y organizar tu historial; no se ejecutan acciones de negocio.</p>
    <div className="flex flex-wrap items-center gap-3"><button className={control} disabled={busy} onClick={() => void run(signal => load(signal, [], current?.selected ?? (lastSelection.current ? { id: lastSelection.current } : null)))}>Actualizar historial</button>{busy && <p role="status" className="text-sm text-slate-500">Consultando historial autorizado…</p>}</div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]" aria-busy={busy}>
      <aside aria-label="Conversaciones persistentes" className="min-w-0 space-y-4 rounded-xl border bg-white p-4">
        <h2 className="font-semibold">Tus conversaciones</h2>
        <form className="space-y-2" onSubmit={event => { event.preventDefault(); if (locked.current || busy || !title.trim() || error && !pendingCreate) return; const input = pendingCreate ?? Object.freeze({ id: crypto.randomUUID(), title: title.trim() }); setPendingCreate(input); void run(async signal => { let created; try { created = await historyRequestV2('thread.create', input, signal) } catch (cause) { if (cause instanceof HistoryClientErrorV2 && !['transport_uncertain', 'invalid_response'].includes(cause.code)) setPendingCreate(null); throw cause } setPendingCreate(null); lastSelection.current = created.record.id; const next = await load(signal, [], created.record); setTitle(''); return next }) }}>
          <label className="block text-sm">Título de nueva conversación<input aria-label="Título de nueva conversación" className={control + ' mt-1 w-full'} value={title} maxLength={120} disabled={busy || !!pendingCreate || !!error} onChange={event => setTitle(event.target.value)} /></label>
          <button className={primary + ' w-full'} disabled={busy || !title.trim() || !!error && !pendingCreate}>{pendingCreate ? 'Reintentar misma creación' : 'Nueva conversación'}</button>
        </form>
        {current && !current.list.items.length && <p className="text-sm text-slate-500">No hay conversaciones en esta página.</p>}
        <div className="space-y-2">{current?.list.items.map(row => <button key={row.id} data-history-thread={row.id} aria-label={'Abrir conversación: ' + row.title} aria-pressed={current.selected?.id === row.id} className={control + ' w-full break-words text-left'} disabled={busy} onClick={() => void run(signal => load(signal, current.threadCursors, row))}>{row.title}</button>)}</div>
        <p className="text-xs text-slate-500">Hasta 20 conversaciones por página. El historial pertenece a tu usuario.</p>
        <div className="flex flex-wrap gap-2"><button className={control} disabled={busy || !current?.threadCursors.length} onClick={() => void run(signal => load(signal, current!.threadCursors.slice(0, -1)))}>Conversaciones anteriores</button><button className={control} disabled={busy || !current?.list.next_id} onClick={() => void run(signal => load(signal, [...current!.threadCursors, current!.list.next_id!]))}>Más conversaciones</button></div>
      </aside>
      <section aria-label="Mensajes históricos" className="min-w-0 space-y-4 rounded-xl border bg-white p-4">
        <h2 className="break-words font-semibold">{current?.selected?.title ?? 'Selecciona una conversación'}</h2>
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Contenido histórico, sin verificar como datos actuales del CRM. Para conocer el estado actual se necesita una nueva consulta autorizada.</p>
        {current?.selected && <>
          {current.selected.archived && <p role="status" className="text-sm">Conversación archivada. Sus mensajes se conservan.</p>}
          {!current.selected.archived && <form className="flex flex-wrap items-end gap-2" onSubmit={event => { event.preventDefault(); if (busy || !rename.trim()) return; const input = { id: current.selected!.id, expected_version: current.selected!.version, title: rename.trim() }; void run(async signal => { const changed = await historyRequestV2('thread.rename', input, signal); const next = await load(signal, [], changed.record); setRename(''); return next }) }}>
            <label className="min-w-0 flex-1 text-sm">Nuevo título<input aria-label="Nuevo título de conversación" className={control + ' mt-1 w-full'} value={rename} maxLength={120} disabled={busy} onChange={event => setRename(event.target.value)} /></label><button className={control} disabled={busy || !rename.trim()}>Guardar título</button><button type="button" className={control} disabled={busy} onClick={() => setArchive(true)}>Archivar conversación</button>
          </form>}
          {current.messages?.items.map(message => <article key={message.id} data-history-message={message.id} className="rounded-xl border p-3"><p className="mb-2 text-xs font-semibold text-slate-500">{message.role === 'user' ? 'Tu mensaje' : 'Respuesta histórica del asistente'}</p><p className="whitespace-pre-wrap break-words text-sm">{message.content}</p></article>)}
          {current.messages && !current.messages.items.length && <p className="text-sm text-slate-500">Esta conversación todavía no tiene mensajes.</p>}
          <div className="flex flex-wrap gap-2">{(['previous', 'next'] as const).map(direction => <button key={direction} className={control} disabled={busy || (direction === 'previous' ? !current.messageCursors.length : current.messages?.next_sequence == null)} onClick={() => void run(async signal => {
            const fresh = await historyRequestV2('thread.get', { id: current.selected!.id }, signal)
            const cursors = direction === 'previous' ? current.messageCursors.slice(0, -1) : [...current.messageCursors, current.messages!.next_sequence!]
            const messages = await historyRequestV2('message.page', { id: fresh.record.id, limit: 20, ...(cursors.at(-1) !== undefined ? { after_sequence: cursors.at(-1) } : {}) }, signal)
            return { ...current, selected: fresh.record, messages, messageCursors: cursors }
          })}>{direction === 'previous' ? 'Mensajes anteriores' : 'Más mensajes'}</button>)}</div>
        </>}
        <label className="block text-sm">Consulta al asistente<input aria-label="Consulta al asistente" className={control + ' mt-1 w-full'} disabled placeholder="Consultas IA todavía no disponibles" /></label>
      </section>
    </div>
    {archive && current?.selected && <Drawer title="Archivar conversación" onClose={() => setArchive(false)}><p className="mb-4 text-sm">La conversación saldrá de la lista activa y conservará sus mensajes. No modifica registros del CRM.</p><button className={primary} disabled={busy} onClick={() => { const input = { id: current.selected!.id, expected_version: current.selected!.version }; void run(async signal => { const changed = await historyRequestV2('thread.archive', input, signal); return load(signal, [], changed.record) }) }}>Confirmar archivo</button></Drawer>}
  </div>
}
