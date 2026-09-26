/**
 * W2 design-system seam. Values are deliberately supplied by the accepted
 * application theme; this file owns semantic names and primitive behavior.
 */

import type { AppRouteDescriptor, SafeUiError, UiIntent } from './w2-presentation-v0.ts'

export const W2_TOKEN_NAMES = [
  'surface.canvas',
  'surface.raised',
  'surface.inset',
  'surface.overlay',
  'surface.interactive',
  'text.primary',
  'text.secondary',
  'text.muted',
  'text.inverse',
  'text.link',
  'text.destructive',
  'border.default',
  'border.strong',
  'border.interactive',
  'border.error',
  'action.primary',
  'action.primaryHover',
  'action.secondary',
  'action.ghost',
  'action.destructive',
  'status.neutral',
  'status.info',
  'status.success',
  'status.warning',
  'status.danger',
  'focus.ring',
  'focus.ringOffset',
  'spacing.control',
  'spacing.inline',
  'spacing.stack',
  'spacing.section',
  'spacing.page',
  'shape.control',
  'shape.card',
  'shape.dialog',
  'shape.pill',
  'elevation.raised',
  'elevation.overlay',
  'motion.fast',
  'motion.standard',
  'motion.enter',
  'motion.exit',
] as const

export type UiTokenName = (typeof W2_TOKEN_NAMES)[number]
export type UiTokenRegistry = Readonly<Record<UiTokenName, string>>

const tokenNameSet = new Set<string>(W2_TOKEN_NAMES)

export function isUiTokenRegistry(value: unknown): value is UiTokenRegistry {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const entries = Object.entries(value)
  if (entries.length !== W2_TOKEN_NAMES.length) {
    return false
  }

  return entries.every(
    ([key, tokenValue]) =>
      tokenNameSet.has(key) &&
      typeof tokenValue === 'string' &&
      tokenValue.trim().length > 0 &&
      !/url\s*\(/i.test(tokenValue),
  )
}

type ActionBase = {
  id: string
  label: string
  size: 'compact' | 'standard'
  tone: 'primary' | 'secondary' | 'quiet' | 'destructive'
  disabledReason?: string
}

export type ActionPresentation =
  | (ActionBase & {
      semantic: 'navigation'
      destination: AppRouteDescriptor
      intent?: never
    })
  | (ActionBase & {
      semantic: 'button'
      destination?: never
      intent: Exclude<UiIntent, { type: 'navigate' }>
    })

export type FieldPresentation = {
  id: string
  label: string
  required: boolean
  hint?: string
  error?: string
  describedBy: readonly string[]
}

export type FeedbackPresentation =
  | { kind: 'loading'; label: string }
  | {
      kind: 'empty'
      title: string
      detail: string
      action?: ActionPresentation
    }
  | {
      kind: 'filtered_empty'
      title: string
      activeConstraintLabel: string
      clearAction: ActionPresentation
    }
  | {
      kind: 'partial_error'
      title: string
      error: SafeUiError
      retryAction?: ActionPresentation
    }
  | {
      kind: 'route_error'
      title: string
      error: SafeUiError
      parentDestination: AppRouteDescriptor
      retryAction?: ActionPresentation
    }
  | {
      kind: 'not_found'
      title: string
      parentDestination: AppRouteDescriptor
    }

export type ModalPresentation = {
  id: string
  title: string
  descriptionId?: string
  initialFocus: 'heading' | 'first_field' | 'primary_action'
  escapeBehavior: 'close' | 'blocked_during_irreversible_processing'
  restoreFocusTo: string
}

export type DataViewPresentation<Row> = {
  label: string
  rows: readonly Row[]
  criticalFields: readonly string[]
  completeness: 'complete' | 'bounded'
  mobileMode: 'cards' | 'named_horizontal_scroll'
}
