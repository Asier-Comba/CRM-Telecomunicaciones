import { readStagingAdmissionV1, stagingEasyPanelOriginV1, stagingSupabaseUrlV1 } from './product-staging-admission-v1.ts'

// Pure transport policy: also imported by the gateway and the legacy edge proxy.
// Admission is not network isolation or release acceptance.
export const privateSupabaseGatewayV1 = 'http://crm-telecom-egress:8080'
type Environment = Readonly<Record<string, string | undefined>>

export function allowedSupabasePathV1(path: unknown): boolean {
  if (typeof path !== 'string' || path.length > 8192 || !path.startsWith('/') || path.startsWith('//') || /[\\\r\n\0]/.test(path)) return false
  try {
    const url = new URL(path, stagingSupabaseUrlV1)
    return url.origin === stagingSupabaseUrlV1 && !/%(?:2e|2f|5c|00)/i.test(url.pathname) &&
      ['/auth/v1/', '/rest/v1/'].some(prefix => url.pathname.startsWith(prefix))
  } catch { return false }
}

export function rewriteSupabaseRequestV1(input: Request | string | URL): string {
  const url = new URL(input instanceof Request ? input.url : input)
  if (url.origin !== stagingSupabaseUrlV1 || url.username || url.password || url.hash ||
      !allowedSupabasePathV1(url.pathname + url.search)) throw Error('EGRESS_DESTINATION_DENIED')
  return privateSupabaseGatewayV1 + url.pathname + url.search
}

export function createPrivateSupabaseFetchV1(fetchImpl: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    const request = new Request(input, init)
    const destination = rewriteSupabaseRequestV1(request)
    // No retry or direct fallback: failure of the fixed internal gateway fails the SDK call.
    return fetchImpl(new Request(destination, request), { redirect: 'error' })
  }
}

export function privateSupabaseTransportV1(env: Environment): 'direct' | 'gateway' | 'denied' {
  const flag = env.PRODUCT_STAGING_PRIVATE_EGRESS_ENABLED
  if (env.PRODUCT_V1_ORIGIN === stagingEasyPanelOriginV1 || flag !== undefined && flag !== 'false') {
    const admission = readStagingAdmissionV1(env)
    return flag === 'true' && admission.status === 'enabled' && admission.origin === stagingEasyPanelOriginV1 ? 'gateway' : 'denied'
  }
  return 'direct'
}
