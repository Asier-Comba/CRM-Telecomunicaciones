import { isRecord } from './w2-runtime-validation.ts'

export type FrontendErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'conflict'
  | 'rate_limited'
  | 'temporary_unavailable'
  | 'stale'
  | 'access_revoked'
  | 'internal_safe'

export type FrontendSafeError = Readonly<{
  code: FrontendErrorCode
  title: string
  detail: string
  retryable: boolean
  announcement: 'polite' | 'assertive'
  correlationId?: string
}>

const safeCorrelationId = /^[A-Za-z0-9_-]{16,96}$/

const copy: Readonly<
  Record<
    FrontendErrorCode,
    Omit<FrontendSafeError, 'code' | 'correlationId'>
  >
> = {
  unauthorized: {
    title: 'Sesión no válida',
    detail: 'Vuelve a identificarte para continuar.',
    retryable: false,
    announcement: 'assertive',
  },
  forbidden: {
    title: 'Acceso no disponible',
    detail: 'No tienes permiso para realizar esta acción.',
    retryable: false,
    announcement: 'assertive',
  },
  not_found: {
    title: 'Contenido no disponible',
    detail: 'El contenido no existe o ya no está disponible.',
    retryable: false,
    announcement: 'polite',
  },
  validation: {
    title: 'Revisa los datos',
    detail: 'Hay información que debe corregirse antes de continuar.',
    retryable: false,
    announcement: 'assertive',
  },
  conflict: {
    title: 'La información ha cambiado',
    detail: 'Actualiza los datos antes de volver a intentarlo.',
    retryable: true,
    announcement: 'assertive',
  },
  rate_limited: {
    title: 'Demasiadas solicitudes',
    detail: 'Espera un momento antes de volver a intentarlo.',
    retryable: true,
    announcement: 'polite',
  },
  temporary_unavailable: {
    title: 'Servicio temporalmente no disponible',
    detail: 'Puedes volver a intentarlo dentro de unos instantes.',
    retryable: true,
    announcement: 'polite',
  },
  stale: {
    title: 'Información pendiente de actualizar',
    detail: 'Los datos visibles pueden no reflejar el último cambio.',
    retryable: true,
    announcement: 'polite',
  },
  access_revoked: {
    title: 'Acceso retirado',
    detail: 'Tu acceso ha cambiado y se han retirado los datos protegidos.',
    retryable: false,
    announcement: 'assertive',
  },
  internal_safe: {
    title: 'No se ha podido completar la operación',
    detail: 'Inténtalo de nuevo o facilita la referencia al soporte.',
    retryable: true,
    announcement: 'assertive',
  },
}

const codes = new Set<FrontendErrorCode>(
  Object.keys(copy) as FrontendErrorCode[],
)

/** Maps an untrusted transport error to fixed user-safe copy. */
export function mapFrontendError(value: unknown): FrontendSafeError {
  let code: FrontendErrorCode = 'internal_safe'
  let correlationId: string | undefined

  try {
    if (isRecord(value)) {
      if (
        typeof value.code === 'string' &&
        codes.has(value.code as FrontendErrorCode)
      ) {
        code = value.code as FrontendErrorCode
      }
      if (
        typeof value.correlationId === 'string' &&
        safeCorrelationId.test(value.correlationId)
      ) {
        correlationId = value.correlationId
      }
    }
  } catch {
    code = 'internal_safe'
  }

  return Object.freeze({
    code,
    ...copy[code],
    ...(correlationId ? { correlationId } : {}),
  })
}

/** Entity routes intentionally collapse existence-sensitive denials. */
export function toExistencePrivateError(
  error: FrontendSafeError,
): FrontendSafeError {
  return error.code === 'unauthorized' ||
    error.code === 'forbidden' ||
    error.code === 'not_found'
    ? Object.freeze({ code: 'not_found' as const, ...copy.not_found })
    : error
}
