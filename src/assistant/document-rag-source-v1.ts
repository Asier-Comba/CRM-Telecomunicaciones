import { createHash } from 'node:crypto'
import { boundedAwaitV2 } from './bounded-await-v2.ts'
import { containsHighConfidenceSecret } from './schema.ts'
import type { ReadAuthorityV2 } from './product-read-executor-v2.ts'

/** Server-only opt-in admission. Backend metadata alone never approves indexing. */
export type DocumentRagSnapshotV1 = Readonly<{
  documentId: string; version: number; status: 'active'; sha256: string; sizeBytes: number
  mediaType: 'application/pdf'; documentKind: 'general' | 'contract' | 'service' | 'incident' | 'other'
  indexingApproved: true; contentClass: 'reviewed_knowledge'
}>
export type DocumentRagChunkV1 = Readonly<{ page: number; start: number; end: number; text: string; sha256: string }>
export type DocumentRagMaterialV1 = Readonly<{
  contract: 'assistant.document-source.v1'; trust: 'untrusted_document_data'
  source: DocumentRagSnapshotV1; chunks: readonly DocumentRagChunkV1[]
}>
declare const prepared: unique symbol
export type PreparedDocumentRagSourceV1 = Readonly<{ [prepared]: true }>
const admitted = new WeakMap<object, { authority: ReadAuthorityV2; material: DocumentRagMaterialV1 }>()
const sha = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex')
const same = (a: ReadAuthorityV2 | null, b: ReadAuthorityV2) => !!a && a.actorId === b.actorId
  && a.workspaceId === b.workspaceId && a.scopeEpoch === b.scopeEpoch && a.role === b.role
const closedRecord = (v: unknown, keys: string): Record<string, unknown> | null => {
  if (!v || typeof v !== 'object' || Array.isArray(v) || Object.getPrototypeOf(v) !== Object.prototype) return null
  const d = Object.getOwnPropertyDescriptors(v)
  if (Reflect.ownKeys(d).length !== keys.split(',').length || Object.keys(d).sort().join(',') !== keys
    || !Object.values(d).every(x => 'value' in x && x.enumerable)) return null
  // Read only admitted descriptor values; a Proxy get trap must not swap them.
  return Object.fromEntries(keys.split(',').map(key => [key, d[key].value]))
}
function snapshot(raw: unknown): DocumentRagSnapshotV1 | null {
  const value = closedRecord(raw, 'contentClass,documentId,documentKind,indexingApproved,mediaType,sha256,sizeBytes,status,version')
  if (!value) return null
  if (typeof value.documentId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.documentId)
    || !Number.isSafeInteger(value.version) || Number(value.version) < 1 || value.status !== 'active'
    || typeof value.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(value.sha256)
    || !Number.isSafeInteger(value.sizeBytes) || Number(value.sizeBytes) < 1 || Number(value.sizeBytes) > 10_485_760
    || value.mediaType !== 'application/pdf' || typeof value.documentKind !== 'string'
    || !['general', 'contract', 'service', 'incident', 'other'].includes(value.documentKind)
    || value.indexingApproved !== true || value.contentClass !== 'reviewed_knowledge') return null
  return Object.freeze({ documentId: value.documentId, version: value.version, status: value.status,
    sha256: value.sha256, sizeBytes: value.sizeBytes, mediaType: value.mediaType, documentKind: value.documentKind,
    indexingApproved: value.indexingApproved, contentClass: value.contentClass }) as DocumentRagSnapshotV1
}
function chunks(value: unknown): readonly DocumentRagChunkV1[] | null {
  if (!Array.isArray(value)) return null
  const arrayFields = Object.getOwnPropertyDescriptors<object>(value)
  const length: unknown = arrayFields.length?.value
  if (typeof length !== 'number' || !Number.isSafeInteger(length) || length < 1 || length > 100
    || Reflect.ownKeys(arrayFields).length !== length + 1
    || Array.from({ length }, (_, i) => i).some(i => !arrayFields[i]?.enumerable || !('value' in arrayFields[i]))) return null
  const result: DocumentRagChunkV1[] = []; let total = 0
  for (let i = 0; i < length; i++) {
    const page = closedRecord(arrayFields[i].value, 'page,text')
    if (!page || page.page !== i + 1 || typeof page.text !== 'string' || !page.text.trim()
      || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(page.text)
      || containsHighConfidenceSecret(page.text)) return null
    total += Buffer.byteLength(page.text)
    if (total > 200_000) return null
    let start = 0, text = '', size = 0
    const append = () => {
      if (text) result.push(Object.freeze({ page: i + 1, start, end: start + text.length, text, sha256: sha(text) }))
      start += text.length; text = ''; size = 0
    }
    for (const character of page.text) {
      // Preserve exact extraction offsets; never split a UTF16 surrogate pair.
      if (character.length === 1 && /[\ud800-\udfff]/u.test(character)) return null
      const length = Buffer.byteLength(character)
      if (size + length > 2048) append()
      if (result.length >= 200) return null
      text += character; size += length
    }
    append(); if (result.length > 200) return null
  }
  return Object.freeze(result)
}

export type DocumentRagSourceDependenciesV1 = {
  authority(): Promise<ReadAuthorityV2 | null>
  offeredHandles: readonly string[]
  /** Recheck document and target permission, active version and indexing opt-in. */
  resolveDocument(handle: string, authority: ReadAuthorityV2, signal?: AbortSignal): Promise<unknown>
  /** Existing authorized ticket/download service; never a raw Storage URL. */
  downloadAuthorized(source: DocumentRagSnapshotV1, authority: ReadAuthorityV2, signal?: AbortSignal): Promise<Uint8Array | null>
  /** Trusted extraction adapter, not implemented by this admission boundary. */
  extractPdf(bytes: Uint8Array, signal?: AbortSignal): Promise<unknown>
}
export type DocumentRagPreparationV1 = { status: 'prepared'; handle: PreparedDocumentRagSourceV1 }
  | { status: 'invalid_input' | 'not_admitted' | 'access_changed' | 'invalid_source' | 'unavailable'; handle: null }

/** No embeddings, index write, tool registration, model call or retrieval claim. */
export async function prepareDocumentRagSourceV1(handle: unknown, deps: DocumentRagSourceDependenciesV1,
  signal?: AbortSignal): Promise<DocumentRagPreparationV1> {
  const stop = (status: Exclude<DocumentRagPreparationV1['status'], 'prepared'>): DocumentRagPreparationV1 => ({ status, handle: null })
  if (typeof handle !== 'string' || !/^[A-Za-z0-9_-]{1,160}$/.test(handle)
    || !Array.isArray(deps.offeredHandles) || deps.offeredHandles.length > 50 || !deps.offeredHandles.includes(handle)) return stop('invalid_input')
  try {
    const authority = await boundedAwaitV2(() => deps.authority(), signal)
    // Preserve the current document-content service's owner/admin boundary.
    if (!authority || !['owner', 'admin'].includes(authority.role)) return stop('not_admitted')
    const scope = Object.freeze({ ...authority })
    const fresh = async () => same(await boundedAwaitV2(() => deps.authority(), signal), scope) && !signal?.aborted
    const resolve = async () => snapshot(await boundedAwaitV2(() => deps.resolveDocument(handle, scope, signal), signal))
    if (!await fresh()) return stop('access_changed')
    const source = await resolve()
    if (!await fresh()) return stop('access_changed')
    if (!source) return stop('not_admitted')
    const current = async () => {
      if (!await fresh()) return false
      const next = await resolve()
      return await fresh() && !!next && JSON.stringify(next) === JSON.stringify(source)
    }
    const downloaded = await boundedAwaitV2(() => deps.downloadAuthorized(source, scope, signal), signal)
    if (!await current()) return stop('access_changed')
    if (!(downloaded instanceof Uint8Array) || downloaded.byteLength !== source.sizeBytes) return stop('invalid_source')
    const bytes = new Uint8Array(downloaded)
    // ASCII decoding clears high bits: compare the signature's actual bytes.
    if (sha(bytes) !== source.sha256 || !Buffer.from(bytes.subarray(0, 5)).equals(Buffer.from('%PDF-', 'ascii'))) return stop('invalid_source')
    const extracted = await boundedAwaitV2(() => deps.extractPdf(bytes, signal), signal)
    if (!await current()) return stop('access_changed')
    const fragments = chunks(extracted)
    if (!fragments) return stop('invalid_source')
    const preparedHandle = Object.freeze({}) as PreparedDocumentRagSourceV1
    const material: DocumentRagMaterialV1 = Object.freeze({ contract: 'assistant.document-source.v1', trust: 'untrusted_document_data', source, chunks: fragments })
    admitted.set(preparedHandle, { authority: scope, material })
    return { status: 'prepared', handle: preparedHandle }
  } catch { return stop('unavailable') }
}

/** Internal server consumer must recheck permissions/version before persistence.
 * An old handle is never a reusable authorization ticket or model citation. */
export function admittedDocumentRagMaterialV1(handle: PreparedDocumentRagSourceV1, authority: ReadAuthorityV2,
  currentDocument: DocumentRagSnapshotV1): DocumentRagMaterialV1 | null {
  try {
    const record = admitted.get(handle), current = snapshot(currentDocument)
    return record && same(authority, record.authority) && current
      && JSON.stringify(current) === JSON.stringify(record.material.source) ? record.material : null
  } catch { return null }
}

/** Future configured provider/atomic index seams; no implementation or usage. */
export interface DocumentRagEmbeddingProviderV1 {
  readonly status: 'not_configured' | 'ready'
  embed(texts: readonly string[], signal?: AbortSignal): Promise<{
    model: string; dimensions: number; vectors: readonly (readonly number[])[]; inputTokens: number
  }>
}
