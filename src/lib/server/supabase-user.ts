import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { readStagingAdmissionV1, stagingClientAdmittedV1, userClientBindingV1 } from './product-staging-admission-v1'

export async function createUserServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim()
  if (!url || !key) return null
  const binding = userClientBindingV1(process.env)
  if (binding === 'denied') return null

  const cookieStore = await cookies()
  const client = createServerClient(url, key, {
    cookieOptions: binding === 'staging' ? { secure: true } : undefined,
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server components cannot always mutate cookies. Route handlers can.
        }
      },
    },
  })
  if (binding === 'staging' && !await stagingClientAdmittedV1(readStagingAdmissionV1(process.env), client)) return null
  return client
}
