'use client'

import { useState } from 'react'
import { Bot, Send, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/Badge'
import type { AssistantResponse } from '@/assistant/ui-contract'

type Reply = { contract: 'assistant.preview-read.v1'; responses: AssistantResponse[] }
const prompts = ['Dame el resumen del día', '¿Qué permanencias terminan pronto?',
  '¿Qué renovaciones tengo próximas?', '¿Qué oportunidades están abiertas?', 'Resume Norte Telecom']

export default function AssistantPage() {
  const [text, setText] = useState('')
  const [reply, setReply] = useState<Reply | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  async function ask(value: string) {
    if (loading) return
    setText(value); setLoading(true); setReply(null); setError(false)
    try {
      const response = await fetch('/api/assistant/read-preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: value }),
      })
      if (!response.ok) throw new Error('unavailable')
      const data = await response.json() as Reply
      if (data.contract !== 'assistant.preview-read.v1' || !Array.isArray(data.responses)) throw new Error('invalid_response')
      setReply(data)
    } catch { setError(true) } finally { setLoading(false) }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Asistente de cartera" description="Consulta clientes, contratos, líneas, renovaciones y tareas" action={<Badge variant="indigo" dot>Solo lectura</Badge>} />
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <Bot className="h-10 w-10 shrink-0 rounded-xl bg-indigo-50 p-2 text-indigo-600" />
          <div><h2 className="font-semibold text-slate-950">Tu cartera, en una consulta</h2>
            <p className="mt-1 text-sm text-slate-500">Demostración sintética con consultas predefinidas. No utiliza un modelo IA en vivo.</p></div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {prompts.map(prompt => <button key={prompt} disabled={loading} onClick={() => void ask(prompt)} className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-50">{prompt}</button>)}
        </div>
        <form className="mt-5 flex gap-2" onSubmit={event => { event.preventDefault(); void ask(text) }}>
          <label htmlFor="assistant-query" className="sr-only">Consulta al asistente</label>
          <input id="assistant-query" value={text} onChange={event => setText(event.target.value)} maxLength={500} placeholder="Ej.: ¿Cuántas líneas tiene Norte Telecom?" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
          <button disabled={loading || !text.trim()} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-3 text-sm font-semibold text-white disabled:opacity-50"><Send className="h-4 w-4" />{loading ? 'Consultando…' : 'Consultar'}</button>
        </form>
      </section>
      <div aria-live="polite" aria-busy={loading} className="space-y-3">
        {error && <p className="rounded-xl bg-amber-50 p-4 text-amber-900">No puedo consultar los datos ahora. Inténtalo de nuevo.</p>}
        {reply?.responses.map((response, index) => <section key={index} className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2"><Badge variant={response.grounded ? 'success' : 'warning'}>{response.status}</Badge><p className="font-medium text-slate-950">{response.answer}</p></div>
          {response.blocks.table && <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{response.blocks.table.columns.filter(c => !['source', 'entity', 'as_of', 'freshness'].includes(c.key)).map(column => <th key={column.key} className="border-b p-2 text-slate-500">{column.label}</th>)}</tr></thead><tbody>{response.blocks.table.rows.map((row, rowIndex) => <tr key={rowIndex}>{response.blocks.table!.columns.filter(c => !['source', 'entity', 'as_of', 'freshness'].includes(c.key)).map(column => <td key={column.key} className="max-w-72 break-words border-b border-slate-100 p-2 text-slate-700">{row[column.key] === null ? 'No disponible' : String(row[column.key])}</td>)}</tr>)}</tbody></table></div>}
          {response.meta.capability && <details className="mt-3 text-xs text-slate-500"><summary className="cursor-pointer font-medium">Fuentes CRM</summary><p className="mt-2">{response.meta.capability} · Datos sintéticos · {response.meta.partial ? 'Cobertura parcial' : 'Cobertura completa'}</p></details>}
        </section>)}
      </div>
      <p className="flex items-center gap-2 text-sm text-slate-500"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />Datos protegidos ocultos. Sin cambios ni envíos a servicios externos.</p>
    </div>
  )
}
