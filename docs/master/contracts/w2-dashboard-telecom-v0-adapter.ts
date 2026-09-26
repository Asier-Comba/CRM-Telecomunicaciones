import {
  W2_PRESENTATION_VERSION,
  isAppRouteDescriptor,
  type AppRouteDescriptor,
  type DashboardItemPresentation,
  type DashboardPresentation,
  type DashboardQueue,
  type OpaqueId,
  type SafeUiError,
  type SectionState,
  type ServerPreparedPage,
} from './w2-presentation-v0.ts'

/**
 * Structural input matching W1 `telecom.v0` without importing a branch that is
 * not yet an accepted integration base. Replace these aliases with the
 * canonical W1 import when W4 names the integration SHA.
 */
export type DashboardItemV0Input = {
  id: string
  customer_id: string | null
  title: string
  due_at: string | null
  status: string
}

export type DashboardSectionV0Input =
  | {
      state: 'ready'
      items: readonly [DashboardItemV0Input, ...DashboardItemV0Input[]]
      source_updated_at: string
      error: null
    }
  | {
      state: 'empty'
      items: readonly []
      source_updated_at: string | null
      error: null
    }
  | {
      state: 'error'
      items: readonly []
      source_updated_at: string | null
      error: { code: string; message: string; retryable: boolean }
    }

export type DashboardReadModelV0Input = {
  contract_version: 'telecom.v0'
  workspace_id: string
  generated_at: string
  tasks: DashboardSectionV0Input
  meetings: DashboardSectionV0Input
  renewals: DashboardSectionV0Input
  permanence_alerts: DashboardSectionV0Input
  opportunities: DashboardSectionV0Input
}

export type DashboardStatusCatalog = Readonly<
  Record<DashboardQueue, Readonly<Record<string, string>>>
>

export type DashboardV0AdapterContext = {
  /** Server-prepared copy; neither value grants tenant access. */
  scopeLabel: string
  windowLabel: string
  statusCatalog: DashboardStatusCatalog
}

export type DashboardV0AdapterResult =
  | { ok: true; page: ServerPreparedPage<DashboardPresentation> }
  | { ok: false; error: SafeUiError }

const invalidResponse = (): SafeUiError => ({
  code: 'invalid_response',
  message: 'No se ha podido interpretar esta información.',
  retryable: false,
})

const unsupportedContract = (): SafeUiError => ({
  code: 'unsupported_contract',
  message: 'Esta versión de la información aún no es compatible.',
  retryable: false,
})

const sourceUnavailable = (retryable: boolean): SafeUiError => ({
  code: 'temporarily_unavailable',
  message: 'Esta sección no está disponible ahora mismo.',
  retryable,
})

const isUtcDateTime = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) &&
  !Number.isNaN(Date.parse(value))

const destinationFor = (
  queue: DashboardQueue,
  id: string,
): AppRouteDescriptor | undefined => {
  const candidate: AppRouteDescriptor | undefined =
    queue === 'tasks'
      ? { kind: 'task', taskId: id as OpaqueId }
      : queue === 'meetings'
        ? { kind: 'meeting', meetingId: id as OpaqueId }
        : queue === 'opportunities'
          ? { kind: 'opportunity', opportunityId: id as OpaqueId }
          : undefined

  return candidate && isAppRouteDescriptor(candidate) ? candidate : undefined
}

const adaptReadyItems = (
  queue: DashboardQueue,
  section: Extract<DashboardSectionV0Input, { state: 'ready' }>,
  catalog: DashboardStatusCatalog,
): SectionState<readonly DashboardItemPresentation[]> => {
  if (!isUtcDateTime(section.source_updated_at)) {
    return { status: 'error', error: invalidResponse() }
  }

  const items: DashboardItemPresentation[] = []

  for (const item of section.items) {
    const statusLabel = catalog[queue][item.status]
    const destination = destinationFor(queue, item.id)

    if (
      !statusLabel ||
      !item.title.trim() ||
      (item.due_at !== null && !isUtcDateTime(item.due_at)) ||
      ((queue === 'tasks' ||
        queue === 'meetings' ||
        queue === 'opportunities') &&
        !destination)
    ) {
      return { status: 'error', error: invalidResponse() }
    }

    items.push({
      id: item.id as OpaqueId,
      title: item.title,
      relevantAt: item.due_at,
      statusLabel,
      destination,
      actions: [],
      // W1 v0 exposes customer_id but not a safe display label. Never render
      // the opaque identifier as customer copy or guess it client-side.
      customer: null,
    })
  }

  return {
    status: 'ready',
    data: items,
    updatedAt: section.source_updated_at,
    completeness: { kind: 'bounded', hasMore: true },
  }
}

const adaptSection = (
  queue: DashboardQueue,
  section: DashboardSectionV0Input,
  catalog: DashboardStatusCatalog,
): SectionState<readonly DashboardItemPresentation[]> => {
  switch (section.state) {
    case 'ready':
      return adaptReadyItems(queue, section, catalog)
    case 'empty':
      return section.source_updated_at === null ||
        isUtcDateTime(section.source_updated_at)
        ? { status: 'empty', updatedAt: section.source_updated_at }
        : { status: 'error', error: invalidResponse() }
    case 'error':
      return {
        status: 'error',
        // W1's arbitrary source message/code are intentionally not copied to
        // UI or telemetry. Only the typed retry signal crosses the seam.
        error: sourceUnavailable(section.error.retryable),
      }
  }
}

/**
 * Candidate transport seam for the stable W1 dashboard contract.
 *
 * The adapter deliberately marks v0 collections as bounded/unknown because
 * W1 has not yet published pagination/completeness semantics. It also leaves
 * renewal/permanence rows non-interactive because v0 does not say that their
 * item ID is a contract ID. Both constraints prevent false claims in the UI.
 */
export function adaptDashboardTelecomV0(
  input: DashboardReadModelV0Input,
  context: DashboardV0AdapterContext,
): DashboardV0AdapterResult {
  if (input.contract_version !== 'telecom.v0') {
    return { ok: false, error: unsupportedContract() }
  }

  if (!input.workspace_id || !isUtcDateTime(input.generated_at)) {
    return { ok: false, error: invalidResponse() }
  }

  const dashboard: DashboardPresentation = {
    contractVersion: W2_PRESENTATION_VERSION,
    generatedAt: input.generated_at,
    scopeLabel: context.scopeLabel,
    windowLabel: context.windowLabel,
    tasks: adaptSection('tasks', input.tasks, context.statusCatalog),
    meetings: adaptSection('meetings', input.meetings, context.statusCatalog),
    renewals: adaptSection('renewals', input.renewals, context.statusCatalog),
    permanenceAlerts: adaptSection(
      'permanence_alerts',
      input.permanence_alerts,
      context.statusCatalog,
    ),
    opportunities: adaptSection(
      'opportunities',
      input.opportunities,
      context.statusCatalog,
    ),
  }

  return {
    ok: true,
    page: {
      contractVersion: W2_PRESENTATION_VERSION,
      data: dashboard,
    },
  }
}
