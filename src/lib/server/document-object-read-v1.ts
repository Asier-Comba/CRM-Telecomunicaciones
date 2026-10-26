// Pure part of the server-only document byte fetch (P0 storage revocation, proposal 88).
// It receives a bucket handle created with a privileged server credential, so it must
// stay minimal: one GET of one object whose path has the exact private layout
// `<workspace uuid>/documents/<document uuid>/<object uuid>`, bounded in size. It never
// lists, uploads, moves, deletes or signs URLs, and it never derives a path itself:
// callers build it from the authorized context and the user-JWT manifest RPC.
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
// Case-sensitive on purpose: Storage keys are case-sensitive, and a case-insensitive
// pattern also accepted other prefixes such as `Documents/`. UUIDs are the canonical
// lowercase form returned by PostgreSQL.
export const DOCUMENT_OBJECT_PATH_V1 = new RegExp(`^${UUID}/documents/${UUID}/${UUID}$`)
export const DOCUMENT_OBJECT_MAX_BYTES_V1 = 10485760

export type DocumentObjectBucketV1 = {
  download(path: string): Promise<{ data: { size: number; arrayBuffer(): Promise<ArrayBuffer> } | null; error: unknown }>
}

export async function readDocumentObjectV1(bucket: DocumentObjectBucketV1, path: unknown): Promise<Uint8Array | null> {
  if (typeof path !== 'string' || path.length > 120 || !DOCUMENT_OBJECT_PATH_V1.test(path)) return null
  const r = await bucket.download(path)
  if (r.error || !r.data || !Number.isSafeInteger(r.data.size) || r.data.size < 0 || r.data.size > DOCUMENT_OBJECT_MAX_BYTES_V1) return null
  const bytes = new Uint8Array(await r.data.arrayBuffer())
  return bytes.byteLength === r.data.size ? bytes : null
}
