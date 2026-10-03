import {
  customerPreview,
  previewCustomers,
  previewContracts,
  previewServices,
  previewLines,
  previewOpportunities,
  previewTasks,
  previewMeetings,
  previewRenewals,
  previewPermanences,
} from '@/lib/telecom-preview/data'
import type { CalendarEntry, CustomerRow, SearchItem } from './model'

/** Reserved synthetic DTOs only. Live readers must use W1 authorized service. */
export function customerRows(): CustomerRow[] {
  return previewCustomers.map((customer) => {
    const data = customerPreview(customer.id)!
    return {
      id: customer.id,
      name: customer.legal_name,
      tradeName: customer.trade_name,
      status: customer.status,
      lifecycle: customer.lifecycle,
      owner: customer.assigned_user?.display_name ?? 'Sin asignar',
      operators: [
        ...new Set(data.contracts.map((c) => c.operator.display_name)),
      ],
      services: data.portfolioAvailable ? data.services.length : null,
      lines: data.portfolioAvailable ? data.lines.length : null,
      renewal: data.renewals[0]?.target_on ?? null,
      permanence: data.permanences[0]?.ends_on ?? null,
      opportunity: data.opportunities[0]?.title ?? null,
      nextAction: data.tasks[0]?.title ?? null,
    }
  })
}
export function searchItems(): SearchItem[] {
  return [
    ...previewCustomers.map((c) => ({
      id: c.id,
      kind: 'customer' as const,
      label: c.legal_name,
      detail: c.trade_name ?? 'Empresa',
      customerId: c.id,
    })),
    ...previewContracts.map((c) => ({
      id: c.id,
      kind: 'contract' as const,
      label: c.plan?.display_name ?? `Contrato · ${c.operator.display_name}`,
      detail: c.customer.display_name,
      customerId: c.customer.id,
    })),
    ...previewServices.map((s) => ({
      id: s.id,
      kind: 'service' as const,
      label: s.display_name,
      detail: s.customer.display_name,
      customerId: s.customer.id,
    })),
    ...previewLines.flatMap((line, index) => {
      const s = previewServices.find((s) => s.id === line.service.id)
      return s
        ? [
            {
              id: line.id,
              kind: 'line' as const,
              label: `Línea ${index + 1} · identificador oculto`,
              detail: s.customer.display_name,
              customerId: s.customer.id,
            },
          ]
        : []
    }),
    ...previewOpportunities.flatMap((o) =>
      o.customer
        ? [
            {
              id: o.id,
              kind: 'opportunity' as const,
              label: o.title,
              detail: o.customer.display_name,
              customerId: o.customer.id,
            },
          ]
        : [],
    ),
  ]
}
export function calendarEntries(): CalendarEntry[] {
  return [
    ...previewMeetings.map((m) => ({
      id: m.id,
      title: m.title,
      customerId: m.customer?.id ?? null,
      customer: m.customer?.display_name ?? 'Sin cliente',
      owner: m.assignee?.display_name ?? 'Sin asignar',
      type: 'meeting' as const,
      date: m.starts_at,
      end: m.ends_at,
      allDay: m.all_day,
    })),
    ...previewTasks.flatMap((t) =>
      t.due_at
        ? [
            {
              id: t.id,
              title: t.title,
              customerId: t.customer?.id ?? null,
              customer: t.customer?.display_name ?? 'Sin cliente',
              owner: t.assignee?.display_name ?? 'Sin asignar',
              type: 'task' as const,
              date: t.due_at,
              end: null,
              allDay: false,
            },
          ]
        : [],
    ),
    ...previewRenewals.map((r) => ({
      id: r.id,
      title: r.title,
      customerId: r.customer?.id ?? null,
      customer: r.customer?.display_name ?? 'Sin cliente',
      owner: 'Sin asignar',
      type: 'renewal' as const,
      date: r.target_on,
      end: null,
      allDay: true,
    })),
    ...previewPermanences.map((p) => ({
      id: p.id,
      title: p.title,
      customerId: p.customer?.id ?? null,
      customer: p.customer?.display_name ?? 'Sin cliente',
      owner: 'Sin asignar',
      type: 'permanence' as const,
      date: p.ends_on,
      end: null,
      allDay: true,
    })),
  ]
}
