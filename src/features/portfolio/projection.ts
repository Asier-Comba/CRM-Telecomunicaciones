import {
  previewContracts,
  previewServices,
  previewLines,
  previewRenewals,
  previewPermanences,
} from '@/lib/telecom-preview/data'
import { previewDate } from '@/lib/telecom-preview/presentation'
import type { PortfolioData, PortfolioRow } from './Portfolio'
export function portfolioData(): PortfolioData {
  const contracts: PortfolioRow[] = previewContracts.map((c) => ({
    id: c.id,
    name: c.plan?.display_name ?? 'Contrato telecom',
    customer: c.customer.display_name,
    customerId: c.customer.id,
    operator: c.operator.display_name,
    plan: c.plan?.display_name ?? 'No disponible',
    status: c.status,
    date: previewDate(c.start_date),
    type: 'Referencia contractual oculta',
  }))
  const services: PortfolioRow[] = previewServices.map((s) => ({
    id: s.id,
    name: s.display_name,
    customer: s.customer.display_name,
    customerId: s.customer.id,
    operator: s.operator.display_name,
    plan: s.plan?.display_name ?? 'No disponible',
    status: s.status,
    date: previewDate(s.activated_on),
    type: s.service_kind === 'fiber' ? 'Fibra' : 'Móvil',
  }))
  const lines: PortfolioRow[] = previewLines.flatMap((l, i) => {
    const s = previewServices.find((s) => s.id === l.service.id)
    return s
      ? [
          {
            id: l.id,
            name: `Línea ${i + 1}`,
            customer: s.customer.display_name,
            customerId: s.customer.id,
            operator: s.operator.display_name,
            plan: s.plan?.display_name ?? 'No disponible',
            status: l.status,
            date: previewDate(l.activated_on),
            type: 'Identificador oculto',
          },
        ]
      : []
  })
  const deadlines = (
    items: typeof previewRenewals | typeof previewPermanences,
  ): PortfolioRow[] =>
    items.flatMap((r) => {
      const c = previewContracts.find((c) => c.id === r.contract.id)
      return c
        ? [
            {
              id: r.id,
              name: r.title,
              customer: c.customer.display_name,
              customerId: c.customer.id,
              operator: c.operator.display_name,
              plan: c.plan?.display_name ?? 'No disponible',
              status: r.status,
              date: previewDate(r.kind === 'renewal' ? r.target_on : r.ends_on),
              type: r.kind === 'renewal' ? 'Renovación' : 'Permanencia',
            },
          ]
        : []
    })
  return {
    Contratos: contracts,
    Servicios: services,
    Líneas: lines,
    Operadores: contracts
      .filter((c, i, a) => a.findIndex((x) => x.operator === c.operator) === i)
      .map((c) => ({
        ...c,
        name: c.operator,
        type: 'Operador presente en cartera',
      })),
    'Planes/Tarifas': contracts
      .filter((c) => c.plan !== 'No disponible')
      .map((c) => ({
        ...c,
        type: 'Plan del contrato · importe no disponible',
      })),
    Renovaciones: deadlines(previewRenewals),
    Permanencias: deadlines(previewPermanences),
  }
}
