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
import {readDocumentObjectV1} from './document-object-read-v1'

const BUCKET = 'telecom-documents'

export type DocumentObjectFetchV1 = (path: string) => Promise<Uint8Array | null>

export function createDocumentObjectFetchV1(): DocumentObjectFetchV1 | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) return null
  const bucket = createClient(url, key, {auth: {persistSession: false, autoRefreshToken: false}}).storage.from(BUCKET)
  // Only the bound `download` method is handed over; see document-object-read-v1.
  return path => readDocumentObjectV1({download: p => bucket.download(p)}, path)
}
