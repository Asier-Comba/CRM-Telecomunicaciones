'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Send, MessageSquare } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/Badge'
import { PreviewNotice, Empty, control, primary } from '@/features/product/ui'
import { fold } from '@/features/product/model'
export type DemoThread = {
  id: string
  customerId: string
  customer: string
  subject: string
  channel: string
  owner: string
  unread: boolean
  messages: { text: string; direction: 'inbound' | 'outbound'; time: string }[]
}
export function Inbox({ threads }: { threads: DemoThread[] }) {
  const [selected, setSelected] = useState<string | null>(
      threads[0]?.id ?? null,
    ),
    [query, setQuery] = useState(''),
    [unread, setUnread] = useState(false),
    [read, setRead] = useState<string[]>([]),
    [drafts, setDrafts] = useState<Record<string, string>>({})
  const current = threads.find((t) => t.id === selected),
    visible = threads.filter(
      (t) =>
        (!query || fold(`${t.customer} ${t.subject}`).includes(fold(query))) &&
        (!unread || (t.unread && !read.includes(t.id))),
    )
  return (
    <div className="space-y-4">
      <PageHeader
        title="Inbox"
        description="Conversaciones y atención comercial en un solo lugar"
        action={<Badge variant="warning">Canales desconectados</Badge>}
      />
      <PreviewNotice />
      <p className="text-xs text-slate-500">
        Ejemplos de interfaz sintéticos. Los mensajes y borradores viven en esta
        sesión; no hay envíos externos.
      </p>
      <div className="grid overflow-hidden rounded-xl border border-slate-200 bg-white lg:grid-cols-[290px_minmax(0,1fr)_220px]">
        <aside className="border-b p-3 lg:border-b-0 lg:border-r">
          <input
            aria-label="Buscar conversaciones"
            placeholder="Buscar cliente o conversación"
            className={`${control} w-full`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <label className="my-3 flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={unread}
              onChange={(e) => setUnread(e.target.checked)}
            />
            Solo no leídas
          </label>
          <div className="space-y-1">
            {visible.map((t) => (
              <button
                key={t.id}
                aria-pressed={selected === t.id}
                onClick={() => {
                  setSelected(t.id)
                  setRead((prev) => [...new Set([...prev, t.id])])
                }}
                className={`block w-full rounded-lg p-3 text-left ${selected === t.id ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
              >
                <div className="flex justify-between gap-2">
                  <p className="truncate text-xs font-semibold text-slate-800">
                    {t.customer}
                  </p>
                  {t.unread && !read.includes(t.id) && (
                    <span
                      aria-label="No leída"
                      className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500"
                    />
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">{t.subject}</p>
                <p className="mt-2 text-[10px] text-slate-400">
                  {t.channel} · {t.owner}
                </p>
              </button>
            ))}
            {!visible.length && <Empty />}
          </div>
        </aside>
        <section className="min-w-0">
          {current ? (
            <>
              <header className="border-b p-4">
                <h2 className="text-sm font-semibold text-slate-900">
                  {current.subject}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {current.customer} · {current.channel}
                </p>
              </header>
              <div className="min-h-56 space-y-4 p-4">
                {current.messages.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${m.direction === 'outbound' ? 'ml-auto bg-indigo-50 text-indigo-900' : 'bg-slate-100 text-slate-700'}`}
                  >
                    <p>{m.text}</p>
                    <p className="mt-2 text-[10px] opacity-60">
                      {m.time} · Mensaje de ejemplo
                    </p>
                  </div>
                ))}
              </div>
              <div className="space-y-2 border-t p-3">
                <textarea
                  aria-label="Borrador de respuesta"
                  placeholder="Prepara una respuesta local de prueba"
                  className={`${control} w-full`}
                  value={drafts[current.id] ?? ''}
                  maxLength={2000}
                  onChange={(e) =>
                    setDrafts({ ...drafts, [current.id]: e.target.value })
                  }
                />
                <div className="flex flex-wrap justify-between gap-2">
                  <p role="status" className="text-[10px] text-slate-400">
                    Borrador temporal · envío desactivado
                  </p>
                  <button disabled className={primary}>
                    <Send className="h-4 w-4" />
                    Enviar mensaje
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-10">
              <MessageSquare className="mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">
                Selecciona una conversación.
              </p>
            </div>
          )}
        </section>
        <aside className="space-y-4 border-t bg-slate-50 p-4 lg:border-l lg:border-t-0">
          <h2 className="text-xs font-semibold text-slate-700">
            Contexto comercial
          </h2>
          {current && (
            <>
              <Link
                className="block text-xs font-semibold text-indigo-600"
                href={`/clients/${current.customerId}`}
              >
                {current.customer}
              </Link>
              <Badge>{current.channel}</Badge>
              <p className="text-xs text-slate-500">
                Asignación de ejemplo: {current.owner}
              </p>
              <button disabled className={control}>
                Cambiar asignación
              </button>
              <Link
                className="block text-xs font-semibold text-indigo-600"
                href={`/assistant?customer=${current.customerId}`}
              >
                Consultar contexto del cliente
              </Link>
            </>
          )}
          <p className="text-[10px] leading-4 text-slate-400">
            Proveedor, webhook, permisos e historial deben estar aceptados antes
            de activar el canal.
          </p>
        </aside>
      </div>
    </div>
  )
}
