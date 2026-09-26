import { isStrictIsoUtcDateTime } from './w2-runtime-validation.ts'

declare const revealCapabilityBrand: unique symbol
declare const copyCapabilityBrand: unique symbol
declare const sensitiveRequestBrand: unique symbol

export type RevealCapability = string & {
  readonly [revealCapabilityBrand]: true
}
export type CopyCapability = string & {
  readonly [copyCapabilityBrand]: true
}
export type SensitiveRequestRef = string & {
  readonly [sensitiveRequestBrand]: true
}

type MaskedFieldBase = Readonly<{
  maskedText: string
  revealCapability: RevealCapability
}>

type MaskedField = MaskedFieldBase & Readonly<{ visibility: 'masked' }>

export type SensitiveFieldV1 =
  | { visibility: 'not_available' }
  | { visibility: 'hidden' }
  | MaskedField
  | (MaskedFieldBase & {
      visibility: 'revealing'
      requestRef: SensitiveRequestRef
    })
  | Readonly<{
      visibility: 'revealed'
      maskedText: string
      revealCapability: RevealCapability
      revealedValue: string
      copyCapability: CopyCapability | null
      expiresAt: string
    }>

export type SensitiveFieldEvent =
  | {
      type: 'reveal_requested'
      requestRef: SensitiveRequestRef
      capability: RevealCapability
    }
  | {
      type: 'server_reveal_received'
      requestRef: SensitiveRequestRef
      revealedValue: string
      copyCapability: CopyCapability | null
      expiresAt: string
      receivedAt: string
    }
  | { type: 'server_reveal_denied'; requestRef: SensitiveRequestRef }
  | { type: 'blurred' | 'expired' | 'access_revoked' | 'role_downgraded' }

const masked = (state: Extract<SensitiveFieldV1, { maskedText: string }>): MaskedField => ({
  visibility: 'masked',
  maskedText: state.maskedText,
  revealCapability: state.revealCapability,
})

export const createMaskedSensitiveField = (
  maskedText: string,
  revealCapability: RevealCapability,
): SensitiveFieldV1 =>
  maskedText.length > 0 &&
  maskedText.length <= 64 &&
  /[*•…]/.test(maskedText)
    ? { visibility: 'masked', maskedText, revealCapability }
    : { visibility: 'hidden' }

export function transitionSensitiveField(
  current: SensitiveFieldV1,
  event: SensitiveFieldEvent,
): SensitiveFieldV1 {
  if (
    event.type === 'blurred' ||
    event.type === 'expired' ||
    event.type === 'access_revoked' ||
    event.type === 'role_downgraded'
  ) {
    return 'maskedText' in current ? masked(current) : current
  }

  if (event.type === 'reveal_requested') {
    return current.visibility === 'masked' &&
      event.capability === current.revealCapability
      ? {
          ...current,
          visibility: 'revealing',
          requestRef: event.requestRef,
        }
      : current
  }

  if (current.visibility !== 'revealing' || event.requestRef !== current.requestRef) {
    return current
  }

  if (event.type === 'server_reveal_denied') return masked(current)

  if (
    !isStrictIsoUtcDateTime(event.expiresAt) ||
    !isStrictIsoUtcDateTime(event.receivedAt) ||
    event.expiresAt <= event.receivedAt ||
    event.revealedValue.length === 0 ||
    event.revealedValue.length > 2_000
  ) {
    return masked(current)
  }

  return {
    visibility: 'revealed',
    maskedText: current.maskedText,
    revealCapability: current.revealCapability,
    revealedValue: event.revealedValue,
    copyCapability: event.copyCapability,
    expiresAt: event.expiresAt,
  }
}

export type SensitiveCopyIntent = Readonly<{
  value: string
  auditCapability: CopyCapability
  browserTelemetry: 'forbidden'
}>

export function toSensitiveCopyIntent(
  state: SensitiveFieldV1,
  capability: CopyCapability,
  now: string,
): SensitiveCopyIntent | null {
  if (
    state.visibility !== 'revealed' ||
    state.copyCapability === null ||
    capability !== state.copyCapability ||
    !isStrictIsoUtcDateTime(now) ||
    now >= state.expiresAt
  ) {
    return null
  }
  return {
    value: state.revealedValue,
    auditCapability: state.copyCapability,
    browserTelemetry: 'forbidden',
  }
}

export const sensitiveFieldTelemetryProjection = (
  state: SensitiveFieldV1,
): Readonly<{ visibility: SensitiveFieldV1['visibility'] }> => ({
  visibility: state.visibility,
})

export const sensitiveCopyAnnouncement = (): Readonly<{
  message: 'Copiado'
  politeness: 'polite'
  atomic: true
}> => ({ message: 'Copiado', politeness: 'polite', atomic: true })
