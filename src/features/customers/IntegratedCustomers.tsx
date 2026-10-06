'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Customers } from './Customers'
import { CustomerEditor } from './CustomerEditor'
import { useProduct } from '@/features/product/integration/Provider'
import { safeMessage } from '@/features/product/integration/repository'
import { control, primary } from '@/features/product/ui'
import type { CustomerRow } from '@/features/product/model'
export function IntegratedCustomers({initialCreate=false}:{initialCreate?:boolean}) {
  const { repository, role } = useProduct(), router = useRouter()
  const [rows, setRows] = useState<CustomerRow[]>([]), [query,setQuery] = useState(''), [create,setCreate] = useState(initialCreate&&role!==null&&role!=='viewer'), [busy,setBusy] = useState(false), [error,setError] = useState('')
  async function search(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('')
    try {
      const result = await repository.search(query)
      setRows(result.items.filter(i => i.kind === 'customer').map(i => ({ id:i.id,name:i.label,tradeName:null,status:i.status,lifecycle:'',owner:'No disponible',operators:[],services:null,lines:null,renewal:null,permanence:null,opportunity:null,nextAction:null })))
    } catch(e) { setRows([]); setError(safeMessage(e)) } finally { setBusy(false) }
  }
  return <div className="space-y-4">
    <form onSubmit={search} className="flex flex-wrap items-center gap-2"><input className={control} aria-label="Consultar clientes locales" placeholder="Empresa: al menos 2 caracteres" required minLength={2} maxLength={100} value={query} onChange={e=>setQuery(e.target.value)} /><button className={primary} disabled={busy}>{busy ? 'Consultando…' : 'Consultar'}</button></form>
    <p className="text-xs text-slate-500">Búsqueda autorizada: hasta cinco empresas por consulta. La cartera y los totales por empresa todavía no están integrados.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <Customers rows={rows} onCreate={role && role !== 'viewer' ? ()=>setCreate(true) : undefined} />
    {create && <CustomerEditor onClose={()=>setCreate(false)} onSaved={receipt=>{setCreate(false);router.push(`/clients/${receipt.id}`)}} />}
  </div>
}
