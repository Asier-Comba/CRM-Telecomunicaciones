/** Application admission only. This neither grants database permissions nor accepts a release. */
export const stagingAppOriginV1 = 'https://crm-telecom-staging-preview.netlify.app'
export const stagingEasyPanelOriginV1 = 'https://crm-telecom-staging.hvdnby.easypanel.host'
export const stagingSupabaseUrlV1 = 'https://zgwotxnyqzfuzcnmgvtn.supabase.co'
type Environment = Readonly<Record<string, string | undefined>>
export type StagingAdmissionV1 = Readonly<{ status: 'disabled' | 'invalid' }> |
  Readonly<{ status: 'enabled'; origin: string; userIds: readonly string[] }>
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

export function parseStagingUserIdsV1(value: unknown): readonly string[] | null {
  if (typeof value !== 'string' || !value.length || value.length > 64 * 37 - 1) return null
  const ids = value.split(',')
  if (ids.length > 64 || ids.some(id => !uuid.test(id)) || new Set(ids).size !== ids.length) return null
  return Object.freeze(ids)
}

// Next.js inlines direct `process.env.NODE_ENV` references at build time. On Netlify
// the proxy runs as a Deno edge function whose process.env object holds only site
// variables, never NODE_ENV (the platform rejects it), so read the inlined value
// when the caller passes the runtime environment itself.
function nodeEnvOf(env: Environment): string | undefined {
  return typeof process !== 'undefined' && env === process.env ? process.env.NODE_ENV : env.NODE_ENV
}

export function readStagingAdmissionV1(env: Environment): StagingAdmissionV1 {
  const flag = env.PRODUCT_STAGING_INTEGRATION
  if (flag === undefined || flag === 'false') return Object.freeze({ status: 'disabled' })
  const userIds = parseStagingUserIdsV1(env.PRODUCT_STAGING_USER_IDS)
  const origin = env.PRODUCT_V1_ORIGIN
  const privateEgress = env.PRODUCT_STAGING_PRIVATE_EGRESS_ENABLED
  if (flag !== 'true' || env.APP_ENV !== 'staging' || nodeEnvOf(env) !== 'production' ||
      env.PRODUCT_V1_ENABLED !== 'true' || ![stagingAppOriginV1, stagingEasyPanelOriginV1].includes(origin ?? '') ||
      (origin === stagingEasyPanelOriginV1 ? privateEgress !== 'true' : privateEgress !== undefined && privateEgress !== 'false') ||
      env.NEXT_PUBLIC_SUPABASE_URL !== stagingSupabaseUrlV1 || !userIds ||
      [env.PRODUCT_LOCAL_INTEGRATION, env.PRODUCT_LOCAL_SYNTHETIC].some(v => v !== undefined && v !== 'false'))
    return Object.freeze({ status: 'invalid' })
  return Object.freeze({ status: 'enabled', origin: origin as string, userIds })
}

export function isCanonicalLocalSupabaseUrlV1(value: unknown): boolean {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) &&
      !url.username && !url.password && url.origin === value
  } catch { return false }
}

export function userClientBindingV1(env: Environment): 'local' | 'staging' | 'denied' {
  const policy = readStagingAdmissionV1(env)
  if (policy.status === 'invalid') return 'denied'
  if (policy.status === 'enabled') return 'staging'
  // next start uses production build mode even in the existing disposable loopback API drill.
  // This SDK binding does not enable product UI; declared hosted environments stay closed.
  return env.APP_ENV !== 'production' && env.APP_ENV !== 'staging' &&
    isCanonicalLocalSupabaseUrlV1(env.NEXT_PUBLIC_SUPABASE_URL) ? 'local' : 'denied'
}

/** Only the root identity returned by server getUser, never a profile or JWT user_metadata. */
export function stagingIdentityAllowedV1(policy: StagingAdmissionV1, user: unknown): boolean {
  try {
    if (policy.status !== 'enabled' || !user || typeof user !== 'object' || Array.isArray(user)) return false
    const own = (name: string): unknown => Object.getOwnPropertyDescriptor(user, name)?.value
    const id = own('id'), email = own('email'), confirmed = own('email_confirmed_at')
    // Cohort authority is the exact configured Auth UUID, never an email domain.
    // Confirmed getUser identities may belong to the real pilot or disposable fixtures.
    return typeof id === 'string' && uuid.test(id) && policy.userIds.includes(id) && own('is_anonymous') === false &&
      typeof email === 'string' && email.length <= 320 && email.trim() === email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
      typeof confirmed === 'string' && Number.isFinite(Date.parse(confirmed))
  } catch { return false }
}

type AuthClient = { auth: { getUser(): Promise<{ data: { user: unknown } | null; error: unknown }> } }
export async function stagingClientAdmittedV1(policy: StagingAdmissionV1, client: AuthClient): Promise<boolean> {
  if (policy.status !== 'enabled') return false
  try {
    const result = await client.auth.getUser()
    return result.error === null && stagingIdentityAllowedV1(policy, result.data?.user)
  } catch { return false }
}
