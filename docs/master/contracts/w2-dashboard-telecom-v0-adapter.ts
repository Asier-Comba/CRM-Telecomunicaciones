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
import {
  accept,
  hasExactKeys,
  isBoundedString,
  isRecord,
  isSafeOpaqueReference,
  isStrictIsoUtcDateTime,
  reject,
  safelyParseUnknown,
  type RuntimeParseResult,
} from './w2-runtime-validation.ts'

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
  /** Derived from the authenticated server session, never browser state. */
  serverWorkspaceId: string
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

const forbidden = (): SafeUiError => ({
  code: 'forbidden',
  message: 'No tienes acceso a esta información.',
  retryable: false,
})

const dashboardKeys = [
  'contract_version',
  'workspace_id',
  'generated_at',
  'tasks',
  'meetings',
  'renewals',
  'permanence_alerts',
  'opportunities',
] as const

const sectionKeys = ['state', 'items', 'source_updated_at', 'error'] as const
const itemKeys = ['id', 'customer_id', 'title', 'due_at', 'status'] as const
const sourceErrorKeys = ['code', 'message', 'retryable'] as const

const parseClosedRecord = (
  value: unknown,
  keys: readonly string[],
  path: string,
): RuntimeParseResult<Record<string, unknown>> => {
  if (!isRecord(value)) return reject('expected_object', path)
  const actual = Object.keys(value)
  const unknown = actual.find((key) => !keys.includes(key))
  if (unknown) return reject('unknown_field', `${path}.${unknown}`)
  const missing = keys.find(
    (key) => !Object.prototype.hasOwnProperty.call(value, key),
  )
  if (missing) return reject('missing_field', `${path}.${missing}`)
  if (!hasExactKeys(value, keys)) return reject('invalid_value', path)
  return accept(value)
}

const parseDashboardItem = (
  value: unknown,
  path: string,
): RuntimeParseResult<DashboardItemV0Input> => {
  const recordResult = parseClosedRecord(value, itemKeys, path)
  if (!recordResult.ok) return recordResult
  const item = recordResult.value

  if (!isSafeOpaqueReference(item.id)) {
    return reject('invalid_identifier', `${path}.id`)
  }
  if (
    item.customer_id !== null &&
    !isSafeOpaqueReference(item.customer_id)
  ) {
    return reject('invalid_identifier', `${path}.customer_id`)
  }
  if (!isBoundedString(item.title, 1, 500) || !item.title.trim()) {
    return reject('invalid_value', `${path}.title`)
  }
  if (item.due_at !== null && !isStrictIsoUtcDateTime(item.due_at)) {
    return reject('invalid_datetime', `${path}.due_at`)
  }
  if (
    !isBoundedString(item.status, 1, 64) ||
    !/^[a-z][a-z0-9_]{0,63}$/.test(item.status)
  ) {
    return reject('invalid_value', `${path}.status`)
  }

  return accept({
    id: item.id,
    customer_id: item.customer_id,
    title: item.title,
    due_at: item.due_at,
    status: item.status,
  })
}

const parseDashboardSection = (
  value: unknown,
  path: string,
): RuntimeParseResult<DashboardSectionV0Input> => {
  const recordResult = parseClosedRecord(value, sectionKeys, path)
  if (!recordResult.ok) return recordResult
  const section = recordResult.value

  if (
    section.state !== 'ready' &&
    section.state !== 'empty' &&
    section.state !== 'error'
  ) {
    return reject('unknown_enum', `${path}.state`)
  }
  if (!Array.isArray(section.items)) {
    return reject('wrong_type', `${path}.items`)
  }
  if (section.items.length > 200) {
    return reject('limit_exceeded', `${path}.items`)
  }
  if (
    section.source_updated_at !== null &&
    !isStrictIsoUtcDateTime(section.source_updated_at)
  ) {
    return reject('invalid_datetime', `${path}.source_updated_at`)
  }

  if (section.state === 'ready') {
    if (
      section.items.length === 0 ||
      section.source_updated_at === null ||
      section.error !== null
    ) {
      return reject('invalid_value', path)
    }
    const items: DashboardItemV0Input[] = []
    for (const [index, candidate] of section.items.entries()) {
      const parsed = parseDashboardItem(candidate, `${path}.items[${index}]`)
      if (!parsed.ok) return parsed
      items.push(parsed.value)
    }
    return accept({
      state: 'ready',
      items: items as [DashboardItemV0Input, ...DashboardItemV0Input[]],
      source_updated_at: section.source_updated_at,
      error: null,
    })
  }

  if (section.items.length !== 0) return reject('invalid_value', `${path}.items`)

  if (section.state === 'empty') {
    if (section.error !== null) return reject('invalid_value', `${path}.error`)
    return accept({
      state: 'empty',
      items: [],
      source_updated_at: section.source_updated_at,
      error: null,
    })
  }

  const errorResult = parseClosedRecord(
    section.error,
    sourceErrorKeys,
    `${path}.error`,
  )
  if (!errorResult.ok) return errorResult
  const error = errorResult.value
  if (
    !isBoundedString(error.code, 1, 64) ||
    !/^[a-z][a-z0-9_]{0,63}$/.test(error.code) ||
    !isBoundedString(error.message, 1, 500) ||
    typeof error.retryable !== 'boolean'
  ) {
    return reject('invalid_value', `${path}.error`)
  }
  return accept({
    state: 'error',
    items: [],
    source_updated_at: section.source_updated_at,
    error: {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
    },
  })
}

type ParsedDashboardV0 = {
  contract_version: 'telecom.v0'
  workspace_id: string
  generated_at: string
  sections: Record<DashboardQueue, RuntimeParseResult<DashboardSectionV0Input>>
}

export const parseDashboardTelecomV0 = (
  value: unknown,
): RuntimeParseResult<ParsedDashboardV0> =>
  safelyParseUnknown(value, (candidate) => {
    const recordResult = parseClosedRecord(candidate, dashboardKeys, '$')
    if (!recordResult.ok) return recordResult
    const record = recordResult.value

    if (record.contract_version !== 'telecom.v0') {
      return reject('unknown_enum', '$.contract_version')
    }
    if (!isSafeOpaqueReference(record.workspace_id)) {
      return reject('invalid_identifier', '$.workspace_id')
    }
    if (!isStrictIsoUtcDateTime(record.generated_at)) {
      return reject('invalid_datetime', '$.generated_at')
    }

    return accept({
      contract_version: 'telecom.v0',
      workspace_id: record.workspace_id,
      generated_at: record.generated_at,
      sections: {
        tasks: parseDashboardSection(record.tasks, '$.tasks'),
        meetings: parseDashboardSection(record.meetings, '$.meetings'),
        renewals: parseDashboardSection(record.renewals, '$.renewals'),
        permanence_alerts: parseDashboardSection(
          record.permanence_alerts,
          '$.permanence_alerts',
        ),
        opportunities: parseDashboardSection(
          record.opportunities,
          '$.opportunities',
        ),
      },
    })
  })

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
  const items: DashboardItemPresentation[] = []

  for (const item of section.items) {
    const statusLabel = catalog[queue][item.status]
    const destination = destinationFor(queue, item.id)

    if (
      !statusLabel ||
      !item.title.trim() ||
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
    completeness: { kind: 'unknown' },
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
      return { status: 'empty', updatedAt: section.source_updated_at }
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
  input: unknown,
  context: DashboardV0AdapterContext,
): DashboardV0AdapterResult {
  const parsed = parseDashboardTelecomV0(input)
  if (!parsed.ok) {
    return {
      ok: false,
      error:
        parsed.error.path === '$.contract_version'
          ? unsupportedContract()
          : invalidResponse(),
    }
  }
  const transport = parsed.value

  if (transport.workspace_id !== context.serverWorkspaceId) {
    return { ok: false, error: forbidden() }
  }

  const section = (
    queue: DashboardQueue,
  ): SectionState<readonly DashboardItemPresentation[]> => {
    const result = transport.sections[queue]
    return result.ok
      ? adaptSection(queue, result.value, context.statusCatalog)
      : { status: 'error', error: invalidResponse() }
  }

  const dashboard: DashboardPresentation = {
    contractVersion: W2_PRESENTATION_VERSION,
    generatedAt: transport.generated_at,
    scopeLabel: context.scopeLabel,
    windowLabel: context.windowLabel,
    tasks: section('tasks'),
    meetings: section('meetings'),
    renewals: section('renewals'),
    permanenceAlerts: section('permanence_alerts'),
    opportunities: section('opportunities'),
  }

  return {
    ok: true,
    page: {
      contractVersion: W2_PRESENTATION_VERSION,
      data: dashboard,
    },
  }
}
