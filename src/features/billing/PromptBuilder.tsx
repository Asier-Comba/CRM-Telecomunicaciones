'use client'
import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Wand2 } from 'lucide-react'
import { parseInvoiceText, type InvoiceParseResult } from './parse'
import { control, primary } from '@/features/product/ui'
type Speech = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult:
    | ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void)
    | null
  onerror: (() => void) | null
  onend: (() => void) | null
}
function ctor() {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: new () => Speech
    webkitSpeechRecognition?: new () => Speech
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}
export function PromptBuilder({
  customers,
  onGenerate,
  asOf,
}: {
  asOf?:string
  customers: { id: string; name: string }[]
  onGenerate: (result: InvoiceParseResult, source: 'text'|'audio') => void
}) {
  const [text, setText] = useState(''),
    [source,setSource] = useState<'text'|'audio'>('text'),
    [listening, setListening] = useState(false),
    [message, setMessage] = useState(''),
    rec = useRef<Speech | null>(null)
  useEffect(
    () => () => {
      if (rec.current) {
        rec.current.onresult = null
        rec.current.onend = null
        rec.current.onerror = null
        try { rec.current.abort() } catch { /* Retired callbacks must stay retired even if the browser refuses cleanup. */ }
      }
    },
    [],
  )
  function editText(value: string) {
    const speech = rec.current
    if (speech) {
      speech.onresult = null
      if (listening) {
        try {
          speech.abort()
          speech.onend = null
          speech.onerror = null
          rec.current = null
          setListening(false)
          setMessage('Dictado detenido para conservar tu corrección.')
        } catch {
          setMessage('No se pudo detener el dictado. Pulsa «Detener dictado» antes de continuar.')
        }
      }
    }
    setText(value)
    setSource('text')
  }
  function dictate() {
    if (listening) {
      try {
        rec.current?.stop()
      } catch {
        setMessage('No se pudo detener el dictado. Reintenta «Detener dictado» o escribe para conservar tu corrección.')
      }
      return
    }
    const Ctor = ctor()
    if (!Ctor) {
      setMessage('Dictado no disponible. Puedes escribir o pegar el texto.')
      return
    }
    let speech: Speech
    try {
      speech = new Ctor()
    } catch {
      setMessage('No se pudo iniciar el dictado.')
      return
    }
    const base = text ? `${text} ` : ''
    speech.lang = 'es-ES'
    speech.continuous = false
    speech.interimResults = true
    speech.onresult = (e) => {
      let next = ''
      for (let i = 0; i < e.results.length; i++)
        next += e.results[i][0]?.transcript ?? ''
      setText((base + next).slice(0, 2000))
      if (next.trim()) setSource('audio')
    }
    speech.onend = () => {
      speech.onresult = null
      speech.onerror = null
      speech.onend = null
      if (rec.current === speech) {
        rec.current = null
        setListening(false)
      }
    }
    speech.onerror = () => {
      speech.onresult = null
      speech.onend = null
      speech.onerror = null
      if (rec.current === speech) {
        rec.current = null
        setListening(false)
        setMessage('No se pudo completar el dictado.')
      }
    }
    rec.current = speech
    try {
      speech.start()
      setListening(true)
      setMessage('')
    } catch {
      speech.onresult = null
      speech.onend = null
      speech.onerror = null
      rec.current = null
      setMessage('No se pudo iniciar el dictado.')
    }
  }
  return (
    <section className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
      <h2 className="text-sm font-semibold text-indigo-900">
        Crear con texto o audio
      </h2>
      <p className="mb-3 mt-1 text-xs text-indigo-700">
        La propuesta no guarda ni emite la factura. Revisa los datos antes de guardar un borrador.
      </p>
      <textarea
        aria-label="Descripción de la factura"
        maxLength={2000}
        rows={3}
        value={text}
        onChange={(e) => editText(e.target.value)}
        placeholder="Factura a Bilbao Industrial Demo SL por servicio de conectividad de 1.200 euros + IVA, vencimiento en 15 días"
        className={`${control} w-full`}
      />
      <div className="mt-2 flex flex-wrap justify-between gap-2">
        <button
          type="button"
          className={control}
          onClick={dictate}
          aria-pressed={listening}
        >
          {listening ? (
            <MicOff className="mr-1 inline h-4 w-4" />
          ) : (
            <Mic className="mr-1 inline h-4 w-4" />
          )}
          {listening ? 'Detener dictado' : 'Dictar'}
        </button>
        <button
          type="button"
          disabled={!text.trim() || listening}
          className={primary}
          onClick={() => onGenerate(parseInvoiceText(text, customers,asOf),source)}
        >
          <Wand2 className="h-4 w-4" />
          Generar propuesta
        </button>
      </div>
      <p role="status" className="mt-2 text-[10px] text-slate-500">
        {message ||
          'Dictado gestionado por el navegador. La propuesta se interpreta con un parser local, sin IA externa.'}
      </p>
    </section>
  )
}
