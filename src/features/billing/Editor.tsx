'use client'
import { invoicePreviewTotals } from './integration'
import { useState } from 'react'
import { Plus, Trash2, Download } from 'lucide-react'
import { Drawer, control, primary } from '@/features/product/ui'
import {
  calculateInvoiceTotals,
  formatInvoiceCurrency,
  calcLineTotals,
} from '@/lib/invoicing/calc'
import type { InvoiceItem } from '@/lib/invoicing/types'
import { buildInvoicePdfBytes } from './pdf'
import { validateDraft, type InvoiceFormData, type InvoiceLink } from './model'
import type { CompanyForm } from '@/features/settings/LocalCompany'
const money = formatInvoiceCurrency
export function InvoiceEditor({
  initial,
  customers,
  links,
  issuer,
  warnings = [],
  onSave,
  onClose,
  integrated = false,
  locked = false,
  serverError,
  onRetry,
  onReload,
  immutableCustomer = false,
}: {
  initial: InvoiceFormData
  customers: { id: string; name: string }[]
  links: InvoiceLink[]
  issuer: CompanyForm
  warnings?: string[]
  onSave: (form: InvoiceFormData) => void
  onClose: () => void
  integrated?: boolean
  locked?: boolean
  serverError?: string
  onRetry?: () => void
  onReload?: () => void
  immutableCustomer?: boolean
}) {
  const [form, setForm] = useState(initial),
    [errors, setErrors] = useState<string[]>([]),
    [reviewed, setReviewed] = useState(false),
    totals = calculateInvoiceTotals(form.items)
  const exact=integrated?invoicePreviewTotals(form):null
  function field<K extends keyof InvoiceFormData>(
    key: K,
    value: InvoiceFormData[K],
  ) {
    setForm({
      ...form,
      [key]: value,
      ...(key === 'clientId'
        ? { contractId: null, serviceId: null, opportunityId: null }
        : {}),
      ...(key === 'contractId' ? { serviceId: null } : {}),
    })
    setReviewed(false)
  }
  function item(index: number, key: string, value: string | number) {
    setForm({
      ...form,
      items: form.items.map((i, n) =>
        n === index ? { ...i, [key]: value } : i,
      ),
    })
    setReviewed(false)
  }
  function save() {
    const next = validateDraft(
      form,
      customers.map((c) => c.id),
      links,
    )
    setErrors(next)
    if (!next.length && reviewed) onSave(structuredClone(form))
  }
  function pdf() {
    const next = validateDraft(
      form,
      customers.map((c) => c.id),
      links,
    )
    setErrors(next)
    if (next.length) return
    const client = customers.find((c) => c.id === form.clientId)!
    const bytes = buildInvoicePdfBytes(
      {
        display: null,
        status: 'draft',
        issueDate: form.issueDate,
        dueDate: form.dueDate,
        currency: form.currency,
        ...totals,
        notes: `BORRADOR LOCAL DE DEMOSTRACIÓN · NO EMITIDO\n${form.notes}`,
        issuer: { ...issuer, legalName: issuer.legalName },
        customer: { name: client.name },
        linkedOpportunity: links.find(
          (l) => l.kind === 'opportunityId' && l.id === form.opportunityId,
        )?.label,
        exchange:
          form.currency !== 'EUR'
            ? {
                currency: form.currency,
                rate: form.exchangeRateToEur!,
                date: form.exchangeRateDate,
                source: form.exchangeRateSource,
              }
            : null,
      },
      form.items.map(
        (i, n): InvoiceItem => ({
          id: `local_${n}`,
          invoice_id: 'local',
          workspace_id: 'local',
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unitPrice,
          discount_rate: i.discountRate,
          tax_rate: i.taxRate,
          withholding_rate: i.withholdingRate,
          sort_order: n,
          line_subtotal: calcLineTotals(i).lineSubtotal,
          line_tax_total: calcLineTotals(i).lineTaxTotal,
          line_withholding_total: calcLineTotals(i).lineWithholdingTotal,
          line_total: calcLineTotals(i).lineTotal,
        }),
      ),
    )
    const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }),
      url = URL.createObjectURL(blob),
      a = document.createElement('a')
    a.href = url
    a.download = 'Borrador_local_no_emitido.pdf'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <Drawer title="Revisar borrador local" onClose={onClose}>
      <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">
        {integrated ? 'Datos sintéticos locales. Los importes son una vista previa; el servidor recalcula y guarda el borrador sin reservar número. La emisión requiere una confirmación posterior.' : 'Solo datos de prueba. No se persiste en el servidor y no reserva número fiscal. Los borradores de esta sesión se pierden al salir del módulo.'}
      </p>
      {serverError && <p role="alert" className="text-sm text-red-700">{serverError}</p>}
      {onRetry && <button type="button" className={primary} onClick={onRetry}>Reintentar la misma acción</button>}
      {onReload && <button type="button" className={control} onClick={onReload}>Recargar y revisar</button>}
      <fieldset disabled={locked} className="space-y-4">
      {warnings.map((w) => (
        <p key={w} role="status" className="text-xs text-amber-700">
          {w}
        </p>
      ))}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-slate-500">
          Cliente
          <select
            aria-label="Cliente de factura"
            disabled={immutableCustomer}
            className={`${control} mt-1 w-full`}
            value={form.clientId ?? ''}
            onChange={(e) => field('clientId', e.target.value || null)}
          >
            <option value="">Seleccionar cliente</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-500">
          Serie
          <input
            aria-label="Serie"
            maxLength={8}
            className={`${control} mt-1 w-full`}
            value={form.series}
            onChange={(e) => field('series', e.target.value.toUpperCase())}
          />
        </label>
        <label className="text-xs text-slate-500">
          Fecha de emisión
          <input
            aria-label="Fecha de emisión"
            type="date"
            className={`${control} mt-1 w-full`}
            value={form.issueDate}
            onChange={(e) => field('issueDate', e.target.value)}
          />
        </label>
        <label className="text-xs text-slate-500">
          Vencimiento
          <input
            aria-label="Vencimiento de factura"
            type="date"
            className={`${control} mt-1 w-full`}
            value={form.dueDate ?? ''}
            onChange={(e) => field('dueDate', e.target.value || null)}
          />
        </label>
        <label className="text-xs text-slate-500">
          Divisa
          <select
            aria-label="Divisa"
            className={`${control} mt-1 w-full`}
            value={form.currency}
            onChange={(e) => field('currency', e.target.value)}
          >
            {['EUR', 'USD', 'GBP'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-[10px] text-slate-400">
            {integrated?'Emisor autorizado · datos fiscales congelados al emitir':'Emisor de prueba · snapshot al guardar'}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-700">
            {issuer.legalName || 'Emisor pendiente'}
          </p>
          <p className="text-[10px] text-slate-500">
            {issuer.taxId || 'Identidad fiscal no completada'}
          </p>
        </div>
      </div>
      <fieldset className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-3">
        <legend className="px-1 text-xs font-semibold text-slate-700">
          Vínculos de prueba del cliente
        </legend>
        {(
          [
            ['opportunityId', 'Oportunidad'],
            ['contractId', 'Contrato'],
            ['serviceId', 'Servicio'],
          ] as const
        ).map(([kind, label]) => (
          <label key={kind} className="min-w-0 text-xs text-slate-500">
            {label}
            <select
              aria-label={`${label} de factura`}
              className={`${control} mt-1 w-full`}
              value={form[kind] ?? ''}
              disabled={!form.clientId}
              onChange={(e) => field(kind, e.target.value || null)}
            >
              <option value="">Sin vínculo</option>
              {links
                .filter(
                  (l) =>
                    l.kind === kind &&
                    l.customerId === form.clientId &&
                    (kind !== 'serviceId' ||
                      !form.contractId ||
                      l.contractId === form.contractId),
                )
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
            </select>
          </label>
        ))}
      </fieldset>
      {form.currency !== 'EUR' && (
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="text-xs">
            1 {form.currency} en EUR
            <input
              aria-label="Tipo de cambio"
              type="number"
              min="0"
              step="0.000001"
              value={form.exchangeRateToEur ?? ''}
              onChange={(e) =>
                field(
                  'exchangeRateToEur',
                  e.target.value ? Number(e.target.value) : null,
                )
              }
              className={`${control} mt-1 w-full`}
            />
          </label>
          <label className="text-xs">
            Fecha de cambio
            <input
              aria-label="Fecha de cambio"
              type="date"
              value={form.exchangeRateDate ?? ''}
              onChange={(e) =>
                field('exchangeRateDate', e.target.value || null)
              }
              className={`${control} mt-1 w-full`}
            />
          </label>
          <label className="text-xs">
            Fuente
            <input
              aria-label="Fuente de cambio"
              value={form.exchangeRateSource}
              onChange={(e) => field('exchangeRateSource', e.target.value)}
              className={`${control} mt-1 w-full`}
            />
          </label>
        </div>
      )}
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-800">Conceptos</h3>
        {form.items.map((i, index) => (
          <div
            key={index}
            className="mb-3 rounded-lg border border-slate-200 p-3"
          >
            <label className="text-xs text-slate-500">
              Concepto {index + 1}
              <input
                aria-label={`Concepto ${index + 1}`}
                maxLength={300}
                value={i.description}
                onChange={(e) => item(index, 'description', e.target.value)}
                className={`${control} mt-1 w-full`}
              />
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                ['quantity', 'Cantidad', i.quantity],
                ['unitPrice', 'Precio', i.unitPrice],
                ['discountRate', 'Descuento %', i.discountRate],
                ['taxRate', 'IVA %', i.taxRate],
                ['withholdingRate', 'IRPF %', i.withholdingRate],
              ].map(([key, label, value]) => (
                <label key={key} className="text-[10px] text-slate-500">
                  {label}
                  <input
                    aria-label={`${label} ${index + 1}`}
                    type="number"
                    min="0"
                    max={String(key).endsWith('Rate') ? 100 : undefined}
                    step="0.01"
                    value={value}
                    onChange={(e) =>
                      item(index, String(key), Number(e.target.value))
                    }
                    className={`${control} mt-1 w-full`}
                  />
                </label>
              ))}
              <button
                type="button"
                aria-label={`Quitar concepto ${index + 1}`}
                className={`${control} mt-auto`}
                disabled={form.items.length === 1}
                onClick={() => {
                  field(
                    'items',
                    form.items.filter((_, n) => n !== index),
                  )
                }}
              >
                <Trash2 className="mx-auto h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-right text-xs font-semibold text-slate-700">
              {money(calcLineTotals(i).lineTotal, form.currency)}
            </p>
          </div>
        ))}
        <button
          type="button"
          className={control}
          disabled={form.items.length >= 50}
          onClick={() =>
            field('items', [
              ...form.items,
              {
                description: '',
                quantity: 1,
                unitPrice: 0,
                taxRate: 21,
                discountRate: 0,
                withholdingRate: 0,
                sortOrder: form.items.length,
              },
            ])
          }
        >
          <Plus className="mr-1 inline h-4 w-4" />
          Añadir concepto
        </button>
      </section>
      <label className="block text-xs text-slate-500">
        Notas
        <textarea
          aria-label="Notas de factura"
          value={form.notes}
          maxLength={1000}
          onChange={(e) => field('notes', e.target.value)}
          className={`${control} mt-1 w-full`}
        />
      </label>
      <dl className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
        {[
          ['Base imponible', integrated?(exact?exact.subtotal_minor/100:null):totals.subtotal],
          ['IVA', integrated?(exact?exact.tax_minor/100:null):totals.taxTotal],
          ['IRPF', integrated?(exact?exact.withholding_minor/100:null):totals.withholdingTotal],
          ['Total', integrated?(exact?exact.total_minor/100:null):totals.total],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <dt className="text-slate-500">{k}</dt>
            <dd className="font-semibold text-slate-900">
              {v===null?'—':money(Number(v), form.currency)}
            </dd>
          </div>
        ))}
      </dl>
      {integrated&&!exact&&<p className="text-xs text-amber-800">Completa las líneas con cantidades e importes válidos para calcular la previsión exacta.</p>}
      {errors.length > 0 && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-xs text-red-700"
        >
          {errors.map((e) => (
            <p key={e}>{e}</p>
          ))}
        </div>
      )}
      <label className="flex items-start gap-2 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={reviewed}
          onChange={(e) => setReviewed(e.target.checked)}
        />
        He revisado cliente, conceptos, importes, impuestos y fechas de este
        borrador de prueba.
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={primary}
          disabled={!reviewed}
          onClick={save}
        >
          Guardar borrador local
        </button>
        <button type="button" className={control} disabled={integrated} onClick={pdf}>
          <Download className="mr-1 inline h-4 w-4" />
          PDF de borrador
        </button>
        <button
          type="button"
          className={control}
          disabled
          title="El contrato de contexto por factura no está publicado"
        >
          Consultar factura con IA
        </button>
        <button
          type="button"
          className={control}
          disabled
          title="Emisión pendiente de contrato fiscal y autorización"
        >
          Emitir factura
        </button>
      </div>
      <p className="text-[10px] text-slate-400">
        La emisión real exige identidad fiscal, numeración atómica, permisos y
        almacenamiento seguro.
      </p>
      </fieldset>
    </Drawer>
  )
}
