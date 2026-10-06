'use client'
import {AssigneeSelect}from '@/features/product/integration/AssigneeSelect'
import { useRef, useState } from 'react'
import { Drawer, control, primary } from '@/features/product/ui'
import { useProduct } from '@/features/product/integration/Provider'
import { ProductUiError, customerSaveIntent, safeMessage } from '@/features/product/integration/repository'
import type { CustomerEditorV1, CustomerFieldsV1, ProductReceiptV1 } from '@/lib/contracts/product-v1'

export function CustomerEditor({ customer, onClose, onSaved, onReload }: { customer?: CustomerEditorV1; onClose: () => void; onSaved: (receipt: ProductReceiptV1) => void|Promise<void>; onReload?: () => void }) {
  const { repository } = useProduct()
  const [fields, setFields] = useState<CustomerFieldsV1>({ account_kind: customer?.account_kind ?? 'legal_entity', legal_name: customer?.legal_name ?? '', trade_name: customer?.trade_name ?? null, lifecycle: customer?.lifecycle ?? 'prospect', assigned_user_id:customer?.assigned_user_id??null })
  const [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null)
  const [writeConfirmed,setWriteConfirmed] = useState(false)
  const intent = useRef<{ execute: () => Promise<ProductReceiptV1>;readonly confirmed:boolean } | null>(null)
  const uncertain = error instanceof ProductUiError && error.code === 'transport_uncertain'
  const conflict = error instanceof ProductUiError && error.code === 'conflict'
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (busy || conflict) return
    setBusy(true); setError(null)
    if (!intent.current) {
      const action = customer ? customerSaveIntent('customer.update', { ...fields, id: customer.id, expected_version: customer.version }) : customerSaveIntent('customer.create', fields)
      intent.current = { execute: () => action.execute(repository),get confirmed(){return action.confirmed} }
    }
    try { const receipt = await intent.current.execute(); setWriteConfirmed(true); await onSaved(receipt); intent.current = null }
    catch (e) { setError(e);setWriteConfirmed(intent.current?.confirmed??false); if (!intent.current?.confirmed && !(e instanceof ProductUiError && e.code === 'transport_uncertain')) intent.current = null }
    finally { setBusy(false) }
  }
  function change<K extends keyof CustomerFieldsV1>(key: K, value: CustomerFieldsV1[K]) {
    setFields({ ...fields, [key]: value }); intent.current = null; setError(null);setWriteConfirmed(false)
  }
  return <Drawer title={customer ? 'Editar cliente' : 'Nuevo cliente'} onClose={() => { if (!busy) onClose() }}>
    <form onSubmit={save} className="space-y-4">
      <fieldset disabled={busy || uncertain || conflict || writeConfirmed} className="space-y-4">
        <label className="block text-sm">Tipo de cuenta<select className={`${control} mt-1 w-full`} value={fields.account_kind} onChange={e => change('account_kind',e.target.value as CustomerFieldsV1['account_kind'])}><option value="legal_entity">Empresa</option><option value="sole_trader">Autónomo</option></select></label>
        <label className="block text-sm">Razón social<input className={`${control} mt-1 w-full`} required maxLength={200} value={fields.legal_name} onChange={e => change('legal_name',e.target.value)} /></label>
        <label className="block text-sm">Nombre comercial<input className={`${control} mt-1 w-full`} maxLength={200} value={fields.trade_name ?? ''} onChange={e => change('trade_name',e.target.value || null)} /></label>
        <label className="block text-sm">Relación comercial<select className={`${control} mt-1 w-full`} value={fields.lifecycle} onChange={e => change('lifecycle',e.target.value as CustomerFieldsV1['lifecycle'])}><option value="lead">Lead</option><option value="prospect">Prospecto</option><option value="customer">Cliente</option><option value="former_customer">Antiguo cliente</option></select></label>
        <AssigneeSelect allowClear value={fields.assigned_user_id??''} onChange={id=>change('assigned_user_id',id||null)} disabled={busy||uncertain||conflict}/>
      </fieldset>
      {!!error && <p role="alert" className="text-sm text-red-700">{safeMessage(error)}</p>}
      {conflict && <button type="button" onClick={onReload} className={control}>Recargar y revisar</button>}
      <button className={primary} disabled={busy || conflict}>{busy ? 'Guardando…' : writeConfirmed ? 'Comprobar cliente guardado' : uncertain ? 'Reintentar la misma acción' : 'Guardar cliente'}</button>
    </form>
  </Drawer>
}
