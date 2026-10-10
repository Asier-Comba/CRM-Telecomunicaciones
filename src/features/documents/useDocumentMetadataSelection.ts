import { useEffect, useRef, useState } from 'react'
import type { DocumentMetadataV1 } from '@/lib/contracts/document-v1'
import { safeMessage, type ProductRepository } from '@/features/product/integration/repository'

/** Presentation lifetime only. Repository and backend still authorize every read. */
export function useDocumentMetadataSelection(repository: ProductRepository, scope: string, authorized: boolean) {
  const generation = useRef(0)
  const [state, setState] = useState<{
    scope: string
    record?: DocumentMetadataV1
    error?: string
  } | null>(null)

  useEffect(() => {
    let active = true
    queueMicrotask(() => { if (active) setState(null) })
    return () => { active = false; generation.current += 1 }
  }, [repository, scope])

  async function read(id: string, refresh: boolean) {
    if (!authorized) return
    const request = ++generation.current
    setState(previous => previous?.scope === scope ? { scope, record: previous.record } : null)
    try {
      const result = await repository.document(id)
      if (generation.current === request) setState({ scope, record: result.record })
    } catch (error) {
      if (generation.current === request) {
        setState(previous => ({ scope, record: refresh && previous?.scope === scope ? previous.record : undefined, error: safeMessage(error) }))
        if (refresh) throw error
      }
    }
  }

  function close() {
    generation.current += 1
    setState(null)
  }

  const current = state?.scope === scope ? state : null
  return { selected: current?.record ?? null, error: current?.error ?? '', open: (id: string) => read(id, false), refresh: (id: string) => read(id, true), close }
}
