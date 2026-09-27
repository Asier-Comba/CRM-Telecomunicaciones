import { isStrictInstantV1 } from './telecom-runtime-v1.ts'

export type TelecomCursorBindingV1 = Readonly<{
  actorId: string
  workspaceId: string
  scopeEpoch: string
  operation: string
  filter: string
}>

export type TelecomCustomerCursorV1 = Readonly<{
  createdAt: string
  id: string
}>

export interface TelecomCursorCodecV1 {
  issue(binding: TelecomCursorBindingV1, cursor: TelecomCustomerCursorV1): Promise<string>
  consume(binding: TelecomCursorBindingV1, token: string): Promise<TelecomCustomerCursorV1 | null>
}

const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function bytesToBase64Url(value: Uint8Array): string {
  return Buffer.from(value).toString('base64url')
}

function base64UrlToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('invalid cursor encoding')
  return new Uint8Array(Buffer.from(value, 'base64url'))
}

function toArrayBuffer(value: Uint8Array): ArrayBuffer {
  const result = new ArrayBuffer(value.byteLength)
  new Uint8Array(result).set(value)
  return result
}

function associatedData(binding: TelecomCursorBindingV1): Uint8Array {
  return encoder.encode(JSON.stringify([
    'telecom.customer.search.v1',
    binding.actorId,
    binding.workspaceId,
    binding.scopeEpoch,
    binding.operation,
    binding.filter,
  ]))
}

/**
 * Stateless, encrypted and context-bound continuation tokens. The key is
 * injected by trusted server configuration and is never serialized or logged.
 */
export class AesGcmTelecomCursorCodecV1 implements TelecomCursorCodecV1 {
  readonly #key: Promise<CryptoKey>
  readonly #now: () => number
  readonly #ttlMs: number

  constructor(key: Uint8Array, options: { now?: () => number; ttlMs?: number } = {}) {
    if (key.byteLength !== 32) throw new Error('telecom cursor key must contain 32 bytes')
    const detachedKey = new Uint8Array(key)
    this.#key = globalThis.crypto.subtle.importKey('raw', toArrayBuffer(detachedKey), 'AES-GCM', false, ['encrypt', 'decrypt'])
    this.#now = options.now ?? (() => Date.now())
    this.#ttlMs = options.ttlMs ?? 15 * 60 * 1_000
    if (!Number.isSafeInteger(this.#ttlMs) || this.#ttlMs < 1_000 || this.#ttlMs > 60 * 60 * 1_000) {
      throw new Error('telecom cursor ttl is outside the supported range')
    }
  }

  async issue(binding: TelecomCursorBindingV1, cursor: TelecomCustomerCursorV1): Promise<string> {
    if (!isStrictInstantV1(cursor.createdAt) || !UUID.test(cursor.id)) throw new Error('invalid customer cursor')
    const issuedAt = this.#now()
    if (!Number.isFinite(issuedAt)) throw new Error('invalid cursor clock')
    const expiresAt = new Date(issuedAt + this.#ttlMs).toISOString()
    const plaintext = encoder.encode(JSON.stringify({ v: 1, c: cursor.createdAt, i: cursor.id, e: expiresAt }))
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
    const encrypted = await globalThis.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(iv), additionalData: toArrayBuffer(associatedData(binding)), tagLength: 128 },
      await this.#key,
      toArrayBuffer(plaintext),
    )
    const token = `v1.${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(encrypted))}`
    if (token.length > 256) throw new Error('customer cursor exceeds transport limit')
    return token
  }

  async consume(binding: TelecomCursorBindingV1, token: string): Promise<TelecomCustomerCursorV1 | null> {
    try {
      if (token.length < 16 || token.length > 256) return null
      const parts = token.split('.')
      if (parts.length !== 3 || parts[0] !== 'v1') return null
      const iv = base64UrlToBytes(parts[1]!)
      const ciphertext = base64UrlToBytes(parts[2]!)
      if (iv.byteLength !== 12 || ciphertext.byteLength < 17) return null
      const plaintext = await globalThis.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: toArrayBuffer(iv), additionalData: toArrayBuffer(associatedData(binding)), tagLength: 128 },
        await this.#key,
        toArrayBuffer(ciphertext),
      )
      const value: unknown = JSON.parse(decoder.decode(plaintext))
      if (value === null || typeof value !== 'object' || Array.isArray(value)) return null
      if (Object.getPrototypeOf(value) !== Object.prototype) return null
      if (Object.keys(value).sort().join(',') !== 'c,e,i,v') return null
      const record = value as Record<string, unknown>
      if (record.v !== 1 || !isStrictInstantV1(record.c) || !isStrictInstantV1(record.e) || typeof record.i !== 'string' || !UUID.test(record.i)) return null
      if (Date.parse(record.e) <= this.#now()) return null
      return Object.freeze({ createdAt: record.c, id: record.i })
    } catch {
      return null
    }
  }
}
