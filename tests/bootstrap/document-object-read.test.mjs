import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { readDocumentObjectV1, DOCUMENT_OBJECT_MAX_BYTES_V1 } from '../../src/lib/server/document-object-read-v1.ts'

const W = '63532577-7a61-4349-b88d-d3c9299895d3', D = '5d083fe3-7aa7-4887-be1d-5930c421f5c3', O = '43ff5a04-56f8-4c9d-8e09-ee97767bc0f4'
const ok = `${W}/documents/${D}/${O}`
const blob = (bytes, size = bytes.length) => ({ size, arrayBuffer: async () => Uint8Array.from(bytes).buffer })
// Records every property touched: the privileged handle may only ever be asked to download.
function bucket(result) {
  const touched = [], calls = []
  const target = { download: async path => { calls.push(path); if (result instanceof Error) throw result; return typeof result === 'function' ? result(path) : result } }
  return { touched, calls, handle: new Proxy(target, { get(t, k) { touched.push(String(k)); return t[k] } }) }
}

test('authorized layout returns the exact bytes through one download call only', async () => {
  const b = bucket({ data: blob([1, 2, 3]), error: null })
  assert.deepEqual(await readDocumentObjectV1(b.handle, ok), new Uint8Array([1, 2, 3]))
  assert.deepEqual(b.calls, [ok]); assert.deepEqual([...new Set(b.touched)], ['download'])
})

test('paths outside the exact private layout never reach Storage', async () => {
  const bad = [
    '', ok + '/', '/' + ok, ok + '/extra', `${W}/documents/${D}`, `${W}/documents/${D}/../${O}`, `${W}/documents/../${D}/${O}`,
    `${W}/documents/${D}/${O}%2f..`, `${W}%2fdocuments/${D}/${O}`, `${W}/Documents/${D}/${O}`, `${W}/invoices/${D}/${O}`,
    `telecom-documents/${ok}`, `public/${ok}`, `${W}/documents/${D}/${O}\u0000`, `${W}/documents/${D}/${O} `, `${W}\\documents\\${D}\\${O}`,
    `${W}/documents/${D}/not-a-uuid`, `${'0'.repeat(36)}/documents/${D}/${O}`, null, undefined, 42, { toString: () => ok }, ok.repeat(2),
  ]
  for (const path of bad) {
    const b = bucket({ data: blob([9]), error: null })
    assert.equal(await readDocumentObjectV1(b.handle, path), null, JSON.stringify(String(path)))
    assert.deepEqual(b.calls, [], 'no Storage call for ' + JSON.stringify(String(path)))
  }
})

test('size is bounded and must match the bytes actually returned', async () => {
  assert.equal(await readDocumentObjectV1(bucket({ data: blob([1], DOCUMENT_OBJECT_MAX_BYTES_V1 + 1), error: null }).handle, ok), null)
  assert.equal(await readDocumentObjectV1(bucket({ data: blob([1, 2], 5), error: null }).handle, ok), null, 'declared size differs from body')
  assert.equal(await readDocumentObjectV1(bucket({ data: blob([1], -1), error: null }).handle, ok), null)
  assert.equal(await readDocumentObjectV1(bucket({ data: blob([1], 1.5), error: null }).handle, ok), null)
  const max = bucket({ data: { size: DOCUMENT_OBJECT_MAX_BYTES_V1, arrayBuffer: async () => new ArrayBuffer(DOCUMENT_OBJECT_MAX_BYTES_V1) }, error: null })
  assert.equal((await readDocumentObjectV1(max.handle, ok)).byteLength, DOCUMENT_OBJECT_MAX_BYTES_V1)
})

test('Storage errors, missing objects and outages yield no bytes', async () => {
  assert.equal(await readDocumentObjectV1(bucket({ data: null, error: { message: 'Object not found' } }).handle, ok), null)
  assert.equal(await readDocumentObjectV1(bucket({ data: blob([1]), error: { statusCode: '403' } }).handle, ok), null)
  assert.equal(await readDocumentObjectV1(bucket({ data: null, error: null }).handle, ok), null)
  // A transport outage propagates to the service, whose try/catch maps it to internal_safe
  // (unavailable), not to a false "denied" or to stale bytes.
  await assert.rejects(readDocumentObjectV1(bucket(new Error('fetch failed')).handle, ok), /fetch failed/)
})

test('the privileged binding stays server-only, fails closed and exposes only download', () => {
  const src = readFileSync(new URL('../../src/lib/server/document-object-fetch-v1.ts', import.meta.url), 'utf8')
  assert.match(src, /^import 'server-only'/)
  assert.match(src, /if \(!url \|\| !key\) return null/, 'no key -> no fetcher (service reports unavailable)')
  assert.ok(!/NEXT_PUBLIC_[A-Z_]*(SERVICE|SECRET|ROLE)/.test(src), 'never a public binding for the privileged key')
  assert.ok(!/\.(list|upload|remove|move|copy|createSignedUrl|createSignedUrls|getPublicUrl|update)\s*\(/.test(src), 'no other Storage operation')
  assert.match(src, /readDocumentObjectV1\(\{download: p => bucket\.download\(p\)\}, path\)/, 'only the bound download is handed to the reader')
  for (const consumer of ['document-content-user-factory-v1.ts', 'document-maintenance-user-factory-v1.ts']) {
    const c = readFileSync(new URL('../../src/lib/server/' + consumer, import.meta.url), 'utf8')
    assert.match(c, /^import 'server-only'/m, consumer + ' is server-only')
    assert.match(c, /download:\s*fetchObject/, consumer + ' downloads only through the reader')
  }
})

test('the layout is case-sensitive: other prefixes and non-canonical UUIDs are rejected', async () => {
  for (const path of [`${W}/Documents/${D}/${O}`, `${W}/DOCUMENTS/${D}/${O}`, `${W.toUpperCase()}/documents/${D}/${O}`, `${W}/documents/${D.toUpperCase()}/${O}`, `${W}/documents/${D}/${O.toUpperCase()}`]) {
    const b = bucket({ data: blob([9]), error: null })
    assert.equal(await readDocumentObjectV1(b.handle, path), null, path); assert.deepEqual(b.calls, [])
  }
})
