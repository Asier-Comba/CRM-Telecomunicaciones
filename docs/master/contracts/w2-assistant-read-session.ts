declare const assistantRequestBrand: unique symbol
declare const continuationBrand: unique symbol

export type AssistantRequestRef = string & {
  readonly [assistantRequestBrand]: true
}
export type AssistantContinuationRef = string & {
  readonly [continuationBrand]: true
}

/** Produced only after W3 AssistantResponse v1 validation succeeds. */
export type ValidatedAssistantFinal<T> = {
  response: T
  grounded: boolean
  result: 'complete' | 'partial'
  hasStructuredControls: boolean
  continuationRef?: AssistantContinuationRef
}

export type AssistantReadState<T> =
  | { status: 'idle' }
  | {
      status: 'requesting'
      requestRef: AssistantRequestRef
      structuredControlsEnabled: false
    }
  | {
      status: 'streaming'
      requestRef: AssistantRequestRef
      lastSequence: number
      text: string
      structuredControlsEnabled: false
    }
  | {
      status: 'complete' | 'partial'
      requestRef: AssistantRequestRef
      lastSequence: number
      final: ValidatedAssistantFinal<T>
      structuredControlsEnabled: boolean
    }
  | {
      status: 'stream_interrupted'
      requestRef: AssistantRequestRef
      text: string
      structuredControlsEnabled: false
    }
  | { status: 'malformed_final'; structuredControlsEnabled: false }
  | { status: 'entity_disappeared'; structuredControlsEnabled: false }
  | { status: 'permission_changed'; structuredControlsEnabled: false }
  | { status: 'access_revoked'; structuredControlsEnabled: false }
  | { status: 'continuation_expired'; structuredControlsEnabled: false }
  | { status: 'stale'; structuredControlsEnabled: false }

export type AssistantReadEvent<T> =
  | { type: 'request_requested'; requestRef: AssistantRequestRef }
  | {
      type: 'stream_started'
      requestRef: AssistantRequestRef
      sequence: number
    }
  | {
      type: 'answer_delta'
      requestRef: AssistantRequestRef
      sequence: number
      text: string
    }
  | {
      type: 'validated_final'
      requestRef: AssistantRequestRef
      sequence: number
      final: ValidatedAssistantFinal<T>
    }
  | {
      type: 'malformed_final'
      requestRef: AssistantRequestRef
      sequence: number
    }
  | { type: 'stream_interrupted'; requestRef: AssistantRequestRef }
  | { type: 'entity_disappeared' }
  | { type: 'permission_changed' }
  | { type: 'access_revoked' }
  | {
      type: 'continuation_expired'
      requestRef: AssistantRequestRef
      continuationRef: AssistantContinuationRef
    }
  | { type: 'result_became_stale'; requestRef: AssistantRequestRef }

export const initialAssistantReadState = <T>(): AssistantReadState<T> => ({
  status: 'idle',
})

const activeRequest = <T>(
  state: AssistantReadState<T>,
): AssistantRequestRef | null =>
  'requestRef' in state ? state.requestRef : null

/**
 * Streaming deltas are text-only. Entities, tables, links and follow-ups become
 * interactive only after a matching, monotonic, validated final envelope.
 */
export function transitionAssistantRead<T>(
  current: AssistantReadState<T>,
  event: AssistantReadEvent<T>,
): AssistantReadState<T> {
  if (event.type === 'access_revoked') {
    return { status: 'access_revoked', structuredControlsEnabled: false }
  }
  if (
    current.status === 'access_revoked' ||
    current.status === 'permission_changed' ||
    current.status === 'entity_disappeared'
  ) {
    return current
  }
  if (event.type === 'permission_changed') {
    return { status: 'permission_changed', structuredControlsEnabled: false }
  }
  if (event.type === 'entity_disappeared') {
    return { status: 'entity_disappeared', structuredControlsEnabled: false }
  }
  if (event.type === 'request_requested') {
    return {
      status: 'requesting',
      requestRef: event.requestRef,
      structuredControlsEnabled: false,
    }
  }
  if (event.type === 'stream_started') {
    if (
      current.status !== 'requesting' ||
      current.requestRef !== event.requestRef ||
      !Number.isSafeInteger(event.sequence) ||
      event.sequence < 0
    ) {
      return current
    }
    return {
      status: 'streaming',
      requestRef: event.requestRef,
      lastSequence: event.sequence,
      text: '',
      structuredControlsEnabled: false,
    }
  }

  const requestRef = activeRequest(current)
  if (requestRef === null || !('requestRef' in event)) return current
  if (event.requestRef !== requestRef) return current

  if (event.type === 'answer_delta') {
    if (
      current.status !== 'streaming' ||
      !Number.isSafeInteger(event.sequence) ||
      event.sequence <= current.lastSequence ||
      typeof event.text !== 'string' ||
      event.text.length === 0 ||
      current.text.length + event.text.length > 32_000
    ) {
      return current
    }
    return {
      ...current,
      lastSequence: event.sequence,
      text: current.text + event.text,
    }
  }

  if (event.type === 'validated_final') {
    if (
      current.status !== 'streaming' ||
      !Number.isSafeInteger(event.sequence) ||
      event.sequence <= current.lastSequence ||
      (!event.final.grounded && event.final.hasStructuredControls)
    ) {
      return current
    }
    return {
      status: event.final.result,
      requestRef,
      lastSequence: event.sequence,
      final: event.final,
      structuredControlsEnabled:
        event.final.grounded && event.final.hasStructuredControls,
    }
  }

  if (event.type === 'malformed_final') {
    if (
      current.status !== 'streaming' ||
      !Number.isSafeInteger(event.sequence) ||
      event.sequence <= current.lastSequence
    ) {
      return current
    }
    return { status: 'malformed_final', structuredControlsEnabled: false }
  }

  if (event.type === 'stream_interrupted') {
    return current.status === 'streaming'
      ? {
          status: 'stream_interrupted',
          requestRef,
          text: current.text,
          structuredControlsEnabled: false,
        }
      : current
  }

  if (event.type === 'continuation_expired') {
    if (
      (current.status !== 'complete' && current.status !== 'partial') ||
      current.final.continuationRef !== event.continuationRef
    ) {
      return current
    }
    return { status: 'continuation_expired', structuredControlsEnabled: false }
  }

  if (event.type === 'result_became_stale') {
    return current.status === 'complete' || current.status === 'partial'
      ? { status: 'stale', structuredControlsEnabled: false }
      : current
  }

  return current
}
