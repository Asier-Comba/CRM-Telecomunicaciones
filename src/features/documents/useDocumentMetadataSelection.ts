import { useCallback, useEffect, useRef, useState } from 'react'
import type { DocumentMetadataV1 } from '@/lib/contracts/document-v1'
import { ProductUiError, safeMessage, type ProductRepository } from '@/features/product/integration/repository'

/** Presentation lifetime only. Repository and backend still authorize every read. */
export function useDocumentMetadataSelection(repository: ProductRepository, scope: string, authorized: boolean) {
  const generation = useRef(0)
  const mounted = useRef(false)
  const opener = useRef<{scope:string;element:HTMLElement}|null>(null)
  const [state, setState] = useState<{
    scope: string
    record?: DocumentMetadataV1
    error?: string
  } | null>(null)

  useEffect(() => {
    let active = true
    mounted.current = true
    queueMicrotask(() => { if (active) setState(null) })
    return () => { active = false; mounted.current = false; opener.current = null; generation.current += 1 }
  }, [repository, scope, authorized])

  async function read(id: string, refresh: boolean) {
    if (!authorized) return
    const request = ++generation.current
    if(!refresh)opener.current=document.activeElement instanceof HTMLElement?{scope,element:document.activeElement}:null
    // Keep a displayed record only while refreshing that same document. A new
    // selection retires the previous record and its integrity action immediately.
    setState(previous => refresh && previous?.scope === scope && previous.record?.id === id
      ? { scope, record: previous.record } : null)
    try {
      const result = await repository.document(id)
      if (generation.current === request) setState({ scope, record: result.record })
    } catch (error) {
      if (generation.current === request) {
        // A refusal or hidden resource invalidates displayed metadata too. Only
        // a transient refresh failure may retain the same selected record.
        const withdrawn = error instanceof ProductUiError && (error.code === 'access_denied' || error.code === 'not_found')
        setState(previous => ({ scope, record: !withdrawn && refresh && previous?.scope === scope && previous.record?.id === id ? previous.record : undefined, error: safeMessage(error) }))
        if (refresh) throw error
      }
    }
  }

  const close = useCallback(() => {
    generation.current += 1
    const closed=generation.current,target=opener.current
    opener.current=null
    setState(null)
    // The dialog's development StrictMode cleanup can capture its own close
    // button. Restore the real invoker after unmount, without touching another
    // selection, retired actor/workspace or disconnected row.
    requestAnimationFrame(()=>{if(mounted.current&&authorized&&generation.current===closed&&target?.scope===scope&&target.element.isConnected)target.element.focus()})
  }, [scope,authorized])

  const current = state?.scope === scope ? state : null
  return { selected: current?.record ?? null, error: current?.error ?? '', open: (id: string) => read(id, false), refresh: (id: string) => read(id, true), close }
}
