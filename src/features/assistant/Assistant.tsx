'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Bot,
  Send,
  Plus,
  MessageSquare,
  Square,
  ShieldCheck,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/Badge'
import {
  readPreviewReply,
  type PreviewReply,
} from '@/lib/telecom-preview/reply'
import { AssistantResponseView } from './Response'
import { PreviewNotice, Drawer, control, primary } from '@/features/product/ui'
export type AssistantContext = {
  id: string
  name: string
  owner: string
  contracts: number | null
  services: number | null
  lines: number | null
}
type Turn = {
  id: number
  query: string
  reply: PreviewReply | null
  error: boolean
}
type Thread = { id: number; title: string; turns: Turn[]; renamed?: boolean }
const prompts = [
  'Dame el resumen del día',
  '¿Qué permanencias terminan pronto?',
  '¿Qué renovaciones tengo próximas?',
  '¿Qué oportunidades están abiertas?',
  'Resume Norte Telecom',
]
export function Assistant({ context }: { context: AssistantContext | null }) {
  const [threads, setThreads] = useState<Thread[]>([
      { id: 1, title: 'Nueva conversación', turns: [] },
    ]),
    [active, setActive] = useState(1),
    [text, setText] = useState(''),
    [loading, setLoading] = useState(false),
    [manage, setManage] = useState<'rename' | 'delete' | null>(null),
    [title, setTitle] = useState('')
  const controller = useRef<AbortController | null>(null),
    attempt = useRef(0),
    sequence = useRef(1),
    thread = threads.find((t) => t.id === active)!
  useEffect(
    () => () => {
      attempt.current++
      controller.current?.abort()
    },
    [],
  )
  function cancel() {
    attempt.current++
    controller.current?.abort()
    controller.current = null
    setLoading(false)
  }
  function newThread() {
    cancel()
    const id = ++sequence.current
    setThreads((prev) => [
      ...prev.slice(-7),
      { id, title: 'Nueva conversación', turns: [] },
    ])
    setActive(id)
    setText('')
  }
  async function ask(value: string) {
    if (
      loading ||
      !value.trim() ||
      new TextEncoder().encode(value).length > 500
    )
      return
    const request = ++attempt.current,
      threadId = active,
      id = ++sequence.current,
      abort = new AbortController()
    controller.current = abort
    setLoading(true)
    setText('')
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? {
              ...t,
              title: t.turns.length || t.renamed ? t.title : value.slice(0, 45),
              turns: [
                ...t.turns.slice(-11),
                { id, query: value, reply: null, error: false },
              ],
            }
          : t,
      ),
    )
    try {
      const response = await fetch('/api/assistant/read-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: value }),
        signal: abort.signal,
      })
      const reply = await readPreviewReply(response)
      if (!reply) throw new Error('unavailable')
      if (request !== attempt.current) return
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId
            ? {
                ...t,
                turns: t.turns.map((turn) =>
                  turn.id === id ? { ...turn, reply } : turn,
                ),
              }
            : t,
        ),
      )
    } catch {
      if (request === attempt.current)
        setThreads((prev) =>
          prev.map((t) =>
            t.id === threadId
              ? {
                  ...t,
                  turns: t.turns.map((turn) =>
                    turn.id === id ? { ...turn, error: true } : turn,
                  ),
                }
              : t,
          ),
        )
    } finally {
      if (request === attempt.current) {
        setLoading(false)
        controller.current = null
      }
    }
  }
  return (
    <div className="space-y-4">
      <PageHeader
        title="Asistente de cartera"
        description="Consulta tu negocio y entiende el siguiente paso"
        action={
          <Badge variant="indigo" dot>
            Solo lectura
          </Badge>
        }
      />
      <PreviewNotice />
      <div className="grid items-start gap-4 xl:grid-cols-[210px_minmax(0,1fr)_230px]">
        <aside className="rounded-xl border border-slate-200 bg-white p-3">
          <button className={`${primary} w-full`} onClick={newThread}>
            <Plus className="h-4 w-4" />
            Nueva conversación
          </button>
          <h2 className="px-2 pb-2 pt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Conversaciones de esta sesión
          </h2>
          <div className="max-h-48 space-y-1 overflow-y-auto xl:max-h-[500px]">
            {threads.map((t) => (
              <button
                key={t.id}
                aria-pressed={active === t.id}
                onClick={() => {
                  cancel()
                  setActive(t.id)
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-3 text-left text-xs ${active === t.id ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="truncate">{t.title}</span>
              </button>
            ))}
          </div>
          <p className="mt-4 px-2 text-[10px] leading-4 text-slate-400">
            Historial local temporal. Se elimina al salir de la página. Las
            consultas no transmiten un historial simulado.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className={control}
              onClick={() => {
                setTitle(thread.title)
                setManage('rename')
              }}
            >
              Renombrar
            </button>
            <button className={control} onClick={() => setManage('delete')}>
              Eliminar conversación
            </button>
          </div>
        </aside>
        <section className="min-w-0 rounded-xl border border-slate-200 bg-white">
          <header className="flex items-center gap-3 border-b p-4">
            <Bot className="h-9 w-9 rounded-lg bg-indigo-50 p-2 text-indigo-600" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {thread.title}
              </h2>
              <p className="text-[11px] text-slate-500">
                Consultas predefinidas sobre datos sintéticos · sin modelo IA en
                vivo
              </p>
            </div>
          </header>
          <div
            className="max-h-[55dvh] space-y-4 overflow-y-auto p-4"
            aria-live="polite"
            aria-busy={loading}
          >
            {!thread.turns.length && (
              <div className="rounded-xl bg-slate-50 p-5">
                <p className="text-base font-semibold text-slate-800">
                  Tu cartera, en una consulta
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Revisa las tareas del día, identifica próximas renovaciones o
                  consulta los servicios de una empresa.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {prompts.map((p) => (
                    <button
                      key={p}
                      className="rounded-lg border border-indigo-100 bg-white px-3 py-2 text-left text-xs font-medium text-indigo-700"
                      onClick={() => void ask(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {thread.turns.map((t) => (
              <article key={t.id} className="space-y-3">
                <div className="ml-8 rounded-xl bg-indigo-600 px-4 py-3 text-sm text-white">
                  {t.query}
                </div>
                {t.reply ? (
                  <AssistantResponseView reply={t.reply} />
                ) : t.error ? (
                  <p
                    role="alert"
                    className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800"
                  >
                    No puedo consultar los datos ahora. Vuelve a escribir la
                    consulta para reintentarlo.
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    {loading
                      ? 'Consultando datos autorizados…'
                      : 'Consulta cancelada.'}
                  </p>
                )}
              </article>
            ))}
          </div>
          <form
            className="border-t bg-white p-3"
            onSubmit={(e) => {
              e.preventDefault()
              void ask(text)
            }}
          >
            <div className="flex gap-2">
              <input
                aria-label="Consulta al asistente"
                maxLength={500}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={
                  context
                    ? `Consultar sobre ${context.name}`
                    : 'Ej.: ¿Cuántas líneas tiene Norte Telecom?'
                }
                className={`${control} min-w-0 flex-1`}
              />
              {loading ? (
                <button type="button" className={control} onClick={cancel}>
                  <Square className="h-4 w-4" />
                  <span className="sr-only">Cancelar consulta</span>
                </button>
              ) : (
                <button
                  className={primary}
                  disabled={
                    !text.trim() || new TextEncoder().encode(text).length > 500
                  }
                >
                  <Send className="h-4 w-4" />
                  <span className="sr-only">Consultar</span>
                </button>
              )}
            </div>
            <p className="mt-2 text-[10px] text-slate-400">
              {new TextEncoder().encode(text).length > 500
                ? 'Acorta la consulta para continuar. '
                : ''}
              No ejecuta cambios ni envíos
            </p>
          </form>
        </section>
        <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Contexto de la consulta
          </h2>
          {context ? (
            <>
              <Badge variant="indigo">Cliente seleccionado</Badge>
              <Link
                href={`/clients/${context.id}`}
                className="block text-sm font-semibold text-indigo-700"
              >
                {context.name}
              </Link>
              <p className="text-xs text-slate-500">{context.owner}</p>
              <dl className="space-y-3 text-xs">
                {[
                  ['Contratos', context.contracts],
                  ['Servicios', context.services],
                  ['Líneas', context.lines],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="font-semibold">
                      {value ?? 'No disponible'}
                    </dd>
                  </div>
                ))}
              </dl>
              <button
                className={`${control} w-full text-left`}
                disabled={loading}
                onClick={() => void ask(`Resume ${context.name}`)}
              >
                Consultar cliente
              </button>
              <p className="text-[10px] leading-4 text-slate-400">
                Referencia validada en servidor. La preview consulta por nombre;
                no transmite permisos ni payload sensible.
              </p>
            </>
          ) : (
            <p className="text-xs leading-5 text-slate-500">
              Selecciona un cliente desde su ficha 360 para contextualizar la
              entrada. Las fuentes y la cobertura se indican en cada respuesta.
            </p>
          )}
          <div className="border-t pt-3">
            <p className="flex gap-2 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              Acciones protegidas
            </p>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">
              Confirmaciones, facturación y acciones externas están
              desactivadas. Datos protegidos ocultos.
            </p>
          </div>
        </aside>
      </div>
      {manage && (
        <Drawer
          title={
            manage === 'rename'
              ? 'Renombrar conversación local'
              : 'Eliminar conversación local'
          }
          onClose={() => setManage(null)}
        >
          <p className="text-xs text-slate-500">
            Esta acción afecta solo al historial temporal de esta página.
          </p>
          {manage === 'rename' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!title.trim()) return
                setThreads((prev) =>
                  prev.map((t) =>
                    t.id === active
                      ? { ...t, title: title.trim(), renamed: true }
                      : t,
                  ),
                )
                setManage(null)
              }}
            >
              <label className="block text-xs text-slate-500">
                Título
                <input
                  aria-label="Título de conversación"
                  maxLength={60}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`${control} my-2 w-full`}
                />
              </label>
              <button className={primary} disabled={!title.trim()}>
                Guardar título local
              </button>
            </form>
          ) : (
            <button
              className={primary}
              onClick={() => {
                cancel()
                const remaining = threads.filter((t) => t.id !== active)
                const next = remaining[0]?.id ?? ++sequence.current
                setThreads(
                  remaining.length
                    ? remaining
                    : [{ id: next, title: 'Nueva conversación', turns: [] }],
                )
                setActive(next)
                setText('')
                setManage(null)
              }}
            >
              Eliminar de esta sesión
            </button>
          )}
        </Drawer>
      )}
    </div>
  )
}
