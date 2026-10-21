import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Exact Docker Official postgres:16 index, verified against Docker Hub and ECR Public.
// Updating this immutable reference requires comparing both publishers again.
const NATIVE_POSTGRES_INDEX_DIGEST = 'sha256:ca0bd484cb98bf4b24eb1010e73fb3fcbd6714d240fbc1a10eea5b7dbecb641d'
export const NATIVE_POSTGRES_OFFICIAL_IMAGE = 'public.ecr.aws/docker/library/postgres@' + NATIVE_POSTGRES_INDEX_DIGEST
// Same index from the second official publisher (byte-identical index re-verified
// 2026-10-20, linux/amd64 present). Used only when the first publisher refuses an
// anonymous pull with a rate/data limit; both quotas are per runner IP and independent.
export const NATIVE_POSTGRES_OFFICIAL_FALLBACK_IMAGE = 'docker.io/library/postgres@' + NATIVE_POSTGRES_INDEX_DIGEST
export const NATIVE_POSTGRES_OFFICIAL_SOURCES = Object.freeze([NATIVE_POSTGRES_OFFICIAL_IMAGE, NATIVE_POSTGRES_OFFICIAL_FALLBACK_IMAGE])

export function isExpectedNativeImage(image) {
  return image === 'postgres:16' || NATIVE_POSTGRES_OFFICIAL_SOURCES.includes(image)
}

/** A created resource is pinned only when its configured reference is one of the
 * two official sources AND the local image records that exact index digest for
 * that publisher. The classic Docker store reports Docker Hub library images in
 * short form (`postgres@sha256:...`), the containerd store in full form; only
 * those two spellings of the same publisher are admitted. */
export function isPinnedNativeImageV1(reference, repoDigests) {
  if (!NATIVE_POSTGRES_OFFICIAL_SOURCES.includes(reference) || !Array.isArray(repoDigests)) return false
  const expected = reference === NATIVE_POSTGRES_OFFICIAL_FALLBACK_IMAGE ? [reference, 'postgres@' + NATIVE_POSTGRES_INDEX_DIGEST] : [reference]
  return repoDigests.some(digest => expected.includes(digest))
}

/** Pulls the pinned index from the first publisher that does not rate-limit.
 * Only NATIVE_RESOURCE_IMAGE_PULL_RATE_LIMITED moves to the next source; any other
 * failure (TLS, auth, missing reference, network, timeout) stops immediately. */
export function acquireNativeImageV1(pull) {
  for (const [index, image] of NATIVE_POSTGRES_OFFICIAL_SOURCES.entries()) {
    try {
      pull(image)
      return image
    } catch (error) {
      if (error?.message !== 'NATIVE_RESOURCE_IMAGE_PULL_RATE_LIMITED' || index === NATIVE_POSTGRES_OFFICIAL_SOURCES.length - 1) throw error
    }
  }
  throw new Error('NATIVE_RESOURCE_IMAGE_PULL_UNAVAILABLE')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3 || !isExpectedNativeImage(process.argv[2])) {
    // Do not echo caller-selected image names or registry credentials.
    console.error('Refusing an unexpected PostgreSQL container image')
    process.exitCode = 1
  }
}
