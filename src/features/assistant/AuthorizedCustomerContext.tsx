'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useProduct } from '@/features/product/integration/Provider'
import { ProductUiError, safeMessage } from '@/features/product/integration/repository'
import { customerCollectionIdentity } from '@/features/customers/customer-identity'
import { Customer360Overview } from '@/features/customers/Customer360Overview'
import { control } from '@/features/product/ui'
import type { CustomerRowV1 } from '@/lib/contracts/telecom-collections-v1'

/** Display context only: exact ordinary identity before any dependent read.
 * A URL reference grants no tenant authority and is never sent to a model. */
export function AuthorizedCustomerContext({ id, onAccessDenied }: { id: string; onAccessDenied: () => void }) {
  const { repository } = useProduct()
  const [customer, setCustomer] = useState<CustomerRowV1 | null>(null)
  const [error, setError] = useState(''), [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    void customerCollectionIdentity(repository, id).then(record => {
      if (active) { setCustomer(record); setError('') }
    }).catch(cause => {
      if (!active) return
      setCustomer(null); setError(safeMessage(cause))
      if (cause instanceof ProductUiError && cause.code === 'access_denied') onAccessDenied()
    })
    return () => { active = false }
  }, [repository, id, revision, onAccessDenied])
  return <section aria-label="Contexto autorizado del cliente" className="space-y-3 rounded-xl border bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Contexto del cliente</h2><button className={control} onClick={() => { setCustomer(null); setError(''); setRevision(value => value + 1) }}>Actualizar contexto</button></div>
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : !customer ? <p role="status" className="text-sm text-slate-500">Consultando el cliente autorizado…</p> : <>
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="break-words font-semibold">{customer.display_name}</h3><Link className={control} href={'/clients/' + customer.id}>Abrir ficha del cliente</Link></div>
      <p className="text-sm text-slate-500">Datos actuales consultados para tu acceso. Este contexto no sustituye los mensajes históricos ni se ha enviado a un proveedor IA.</p>
      <Customer360Overview key={revision} customerId={customer.id} onAccessDenied={onAccessDenied} />
    </>}
  </section>
}
