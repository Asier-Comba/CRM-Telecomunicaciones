'use client'
import { useRef, useState } from 'react'
import { Plus, Receipt } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SectionCard } from '@/components/SectionCard'
import { Badge } from '@/components/Badge'
import {
  Kpis,
  PreviewNotice,
  Empty,
  PeriodSelect,
  Unavailable,
  Drawer,
  control,
  primary,
} from '@/features/product/ui'
import { fold, inPeriod, type Period } from '@/features/product/model'
import {
  calculateInvoiceTotals,
  formatInvoiceCurrency,
} from '@/lib/invoicing/calc'
import { InvoiceEditor } from './Editor'
import { PromptBuilder } from './PromptBuilder'
import { blankForm, type InvoiceFormData, type Draft } from './model'
import {
  useLocalCompany,
  type CompanyForm,
} from '@/features/settings/LocalCompany'
type LocalDraft = Draft & { issuer: CompanyForm }
export function Billing({
  customers,
}: {
  customers: { id: string; name: string }[]
}) {
  const { company } = useLocalCompany(),
    [drafts, setDrafts] = useState<LocalDraft[]>([]),
    [edit, setEdit] = useState<{
      id: string | null
      form: InvoiceFormData
      issuer: CompanyForm
      warnings: string[]
    } | null>(null),
    [query, setQuery] = useState(''),
    [scope, setScope] = useState('active'),
    [period, setPeriod] = useState<Period>('month'),
    [purge, setPurge] = useState<string | null>(null),
    [proof, setProof] = useState(''),
    counter = useRef(0)
  const rows = drafts.filter(
    (d) =>
      (scope === 'trash' ? d.trashed : !d.trashed) &&
      (!query ||
        fold(`${d.customerName} ${d.form.series}`).includes(fold(query))) &&
      inPeriod(d.form.issueDate, period, '2026-09-30'),
  )
  function save(form: InvoiceFormData) {
    if (!edit) return
    const id = edit.id ?? `local_draft_${++counter.current}`,
      customerName = customers.find((c) => c.id === form.clientId)!.name
    setDrafts((prev) => [
      ...prev.filter((d) => d.id !== id),
      {
        id,
        form,
        customerName,
        issuerName: edit.issuer.legalName,
        issuer: structuredClone(edit.issuer),
        trashed: false,
        accountingExcluded: false,
      },
    ])
    setEdit(null)
  }
  return (
    <div className="space-y-4">
      <PageHeader
        title="Facturación PRO"
        description="Facturas, conceptos y fiscalidad; propuestas revisadas por personas"
        action={
          <button
            className={primary}
            onClick={() =>
              setEdit({
                id: null,
                form: blankForm(),
                issuer: structuredClone(company),
                warnings: [],
              })
            }
          >
            <Plus className="h-4 w-4" />
            Nuevo borrador local
          </button>
        }
      />
      <PreviewNotice />
      <Kpis
        items={[
          {
            label: 'Facturado real',
            value: '—',
            note: 'Lectura financiera no conectada',
          },
          { label: 'Pendiente de cobro', value: '—', note: 'No disponible' },
          { label: 'Vencido', value: '—', note: 'No disponible' },
          {
            label: 'Borradores locales',
            value: drafts.filter((d) => !d.trashed).length,
            note: 'Esta sesión · sin persistencia',
          },
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <PromptBuilder
          customers={customers}
          onGenerate={(result) =>
            setEdit({
              id: null,
              form: result.draft,
              issuer: structuredClone(company),
              warnings: [
                ...result.warnings,
                ...result.missingFields.map((f) => `Revisar campo: ${f}`),
              ],
            })
          }
        />
        <SectionCard
          title="Resumen financiero"
          description="Mes, trimestre, semestre, año o todo"
          action={<PeriodSelect value={period} onChange={setPeriod} />}
        >
          <Unavailable title="Cobros y evolución mensual pendientes de lectura">
            Los borradores locales no cuentan como ingresos. Estados, gráficos
            mensuales, inclusión financiera y conversión de divisas reales
            requieren facturas autorizadas.
          </Unavailable>
        </SectionCard>
      </div>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-wrap gap-2 border-b p-3">
          <input
            aria-label="Buscar facturas"
            placeholder="Buscar cliente o serie de borrador"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`${control} min-w-0 flex-1`}
          />
          <select
            aria-label="Ámbito de facturas"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className={control}
          >
            <option value="active">Borradores locales</option>
            <option value="trash">Papelera local</option>
          </select>
          <select aria-label="Estado de factura" className={control} disabled>
            <option>Estado: borrador local</option>
          </select>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-xs">
            <caption className="sr-only">
              Borradores locales de prueba. No son facturas emitidas.
            </caption>
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {[
                  'Número / serie',
                  'Cliente / emisor',
                  'Fecha',
                  'Total',
                  'Estado',
                  'Acciones',
                ].map((h) => (
                  <th key={h} className="p-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((d) => (
                <tr key={d.id}>
                  <td className="p-3">
                    <p className="font-semibold text-slate-700">
                      Sin número · {d.form.series}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      No reserva numeración fiscal
                    </p>
                  </td>
                  <td className="p-3">
                    <p className="font-medium">{d.customerName}</p>
                    <p className="mt-1 text-slate-400">{d.issuerName}</p>
                  </td>
                  <td className="p-3">{d.form.issueDate}</td>
                  <td className="p-3 font-semibold">
                    {formatInvoiceCurrency(
                      calculateInvoiceTotals(d.form.items).total,
                      d.form.currency,
                    )}
                  </td>
                  <td className="p-3">
                    <Badge>Borrador local</Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {!d.trashed ? (
                        <>
                          <button
                            className="font-semibold text-indigo-600"
                            onClick={() =>
                              setEdit({
                                id: d.id,
                                form: structuredClone(d.form),
                                issuer: d.issuer,
                                warnings: [],
                              })
                            }
                          >
                            Editar / PDF
                          </button>
                          <button
                            className="text-slate-500"
                            onClick={() =>
                              setDrafts((prev) =>
                                prev.map((x) =>
                                  x.id === d.id ? { ...x, trashed: true } : x,
                                ),
                              )
                            }
                          >
                            Papelera
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="font-semibold text-indigo-600"
                            onClick={() =>
                              setDrafts((prev) =>
                                prev.map((x) =>
                                  x.id === d.id ? { ...x, trashed: false } : x,
                                ),
                              )
                            }
                          >
                            Restaurar
                          </button>
                          <button
                            className="text-red-600"
                            onClick={() => {
                              setPurge(d.id)
                              setProof('')
                            }}
                          >
                            Eliminar local
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <Empty
            text={
              drafts.length
                ? 'No hay borradores con estos filtros.'
                : 'Crea un borrador de prueba con texto, audio o el editor. No hay lectura de facturas reales.'
            }
          />
        )}
        <footer className="flex items-center gap-2 border-t p-3 text-xs text-slate-500">
          <Receipt className="h-4 w-4" />
          {rows.length} borradores en el periodo · emisión, pago, envío y
          borrado de facturas reales desactivados
        </footer>
      </section>
      {edit && (
        <InvoiceEditor
          initial={edit.form}
          issuer={edit.issuer}
          customers={customers}
          warnings={edit.warnings}
          onSave={save}
          onClose={() => setEdit(null)}
        />
      )}
      {purge && (
        <Drawer title="Eliminar borrador local" onClose={() => setPurge(null)}>
          <p className="text-sm text-slate-600">
            Esta acción elimina de esta sesión un borrador de prueba. No afecta
            a facturas ni registros del servidor.
          </p>
          <label className="block text-xs">
            Escribe BORRAR
            <input
              aria-label="Confirmación de borrado local"
              className={`${control} mt-2 w-full`}
              value={proof}
              onChange={(e) => setProof(e.target.value)}
            />
          </label>
          <button
            className={primary}
            disabled={proof !== 'BORRAR'}
            onClick={() => {
              setDrafts((prev) => prev.filter((d) => d.id !== purge))
              setPurge(null)
            }}
          >
            Eliminar borrador de prueba
          </button>
        </Drawer>
      )}
    </div>
  )
}
