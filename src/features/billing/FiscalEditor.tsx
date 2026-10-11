'use client'

import { useId, useState } from 'react'
import type { BillingProfileV1, BillingReadDataV1 } from '@/lib/contracts/billing-v1'
import { ProductUiError, safeMessage } from '@/features/product/integration/repository'
import { control, primary, Drawer } from '@/features/product/ui'

type Configuration = Extract<BillingReadDataV1, { operation: 'configuration.get' }>
type FiscalField = {
  key: keyof BillingProfileV1
  label: string
  autoComplete?: string
  fullWidth?: boolean
}
const sections: readonly { legend: string; fields: readonly FiscalField[] }[] = [
  {
    legend: 'Identidad fiscal',
    fields: [
      { key: 'legal_name', label: 'Razón social fiscal', autoComplete: 'organization', fullWidth: true },
      { key: 'tax_id', label: 'Identificación fiscal', fullWidth: true },
    ],
  },
  {
    legend: 'Domicilio fiscal',
    fields: [
      { key: 'address', label: 'Dirección fiscal', autoComplete: 'street-address', fullWidth: true },
      { key: 'postal_code', label: 'Código postal', autoComplete: 'postal-code' },
      { key: 'city', label: 'Ciudad', autoComplete: 'address-level2' },
      { key: 'region', label: 'Provincia', autoComplete: 'address-level1' },
      { key: 'country', label: 'País (ISO)', autoComplete: 'country' },
    ],
  },
]

export function FiscalEditor({
  kind, configuration, busy, error, requiresReload, onReload, onSave, onClose,
}: {
  kind: 'issuer' | 'customer'
  configuration: Configuration
  busy: boolean
  error: unknown
  requiresReload: boolean
  onReload: () => void
  onSave: (profile: BillingProfileV1) => void
  onClose: () => void
}) {
  const id = useId()
  const [profile, setProfile] = useState<BillingProfileV1>(() =>
    (kind === 'issuer' ? configuration.issuer?.profile : configuration.customer?.profile)
      ?? { legal_name: '', tax_id: '', address: '', postal_code: '', city: '', region: '', country: 'ES' },
  )
  const uncertain = error instanceof ProductUiError && error.code === 'transport_uncertain'
  const conflict = error instanceof ProductUiError && error.code === 'conflict'
  return (
    <Drawer title={kind === 'issuer' ? 'Datos fiscales del emisor' : 'Datos fiscales del cliente'} onClose={onClose}>
      <form onSubmit={event => { event.preventDefault(); onSave(profile) }} className="space-y-5">
        <p className="text-sm leading-relaxed text-slate-500">Revisa la identidad y la dirección antes de guardar.</p>
        <fieldset disabled={busy || uncertain || conflict || requiresReload} className="space-y-5">
          {sections.map(section => (
            <fieldset key={section.legend} className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
              <legend className="px-2 text-sm font-semibold text-slate-900">{section.legend}</legend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {section.fields.map(({ key, label, autoComplete, fullWidth }) => (
                  <div key={key} className={fullWidth ? 'min-w-0 sm:col-span-2' : 'min-w-0'}>
                    <label htmlFor={`${id}-${key}`} className="block text-sm font-medium text-slate-700">{label}</label>
                    <input
                      id={`${id}-${key}`}
                      name={key}
                      className={`${control} mt-1.5 w-full`}
                      required
                      maxLength={key === 'address' ? 300 : key === 'legal_name' ? 200 : 80}
                      autoComplete={autoComplete}
                      value={profile[key]}
                      onChange={event => {
                        const value = event.target.value
                        setProfile(previous => ({ ...previous, [key]: value }))
                      }}
                    />
                  </div>
                ))}
              </div>
            </fieldset>
          ))}
        </fieldset>
        {error ? <p role="alert" className="text-sm text-red-700">{safeMessage(error)}</p> : null}
        <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <button className={primary} disabled={busy || conflict || requiresReload}>
            {busy ? 'Guardando…' : uncertain ? 'Reintentar la misma acción' : 'Guardar datos fiscales'}
          </button>
          {(conflict || requiresReload) ? (
            <button type="button" className={control} disabled={busy} onClick={onReload}>Cerrar y actualizar configuración</button>
          ) : null}
        </div>
      </form>
    </Drawer>
  )
}
