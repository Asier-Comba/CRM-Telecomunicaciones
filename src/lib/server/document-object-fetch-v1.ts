import 'server-only'
import {createClient} from '@supabase/supabase-js'

// Server-side byte fetch for private telecom documents (P0 storage revocation).
//
// User JWTs no longer read document objects directly: the Storage edge cached
// authorized responses per JWT and kept serving them after membership was
// suspended or demoted. Authorization is instead the user-JWT RPC
// document_content_v1_manifest, evaluated against current DB state on every
// request and rechecked after the fetch by DocumentContentServiceV1.
//
// This credential is used for exactly one operation: GET of one object in one
// bucket at a path built from that manifest. No list, upload, move or delete.
const BUCKET = 'telecom-documents'
const MAX_BYTES = 10485760
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const DOCUMENT_PATH = new RegExp(`^${UUID}/documents/${UUID}/${UUID}$`, 'i')

export type DocumentObjectFetchV1 = (path: string) => Promise<Uint8Array | null>

export function createDocumentObjectFetchV1(): DocumentObjectFetchV1 | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) return null
  const bucket = createClient(url, key, {auth: {persistSession: false, autoRefreshToken: false}}).storage.from(BUCKET)
  return async (path) => {
    if (!DOCUMENT_PATH.test(path)) return null
    const r = await bucket.download(path)
    if (r.error || !r.data || r.data.size > MAX_BYTES) return null
    return new Uint8Array(await r.data.arrayBuffer())
  }
}
