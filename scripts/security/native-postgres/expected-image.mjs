import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Exact Docker Official postgres:16 index, verified against Docker Hub and ECR Public.
// Updating this immutable reference requires comparing both publishers again.
export const NATIVE_POSTGRES_OFFICIAL_IMAGE = 'public.ecr.aws/docker/library/postgres@sha256:ca0bd484cb98bf4b24eb1010e73fb3fcbd6714d240fbc1a10eea5b7dbecb641d'

export function isExpectedNativeImage(image) {
  return image === 'postgres:16' || image === NATIVE_POSTGRES_OFFICIAL_IMAGE
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3 || !isExpectedNativeImage(process.argv[2])) {
    // Do not echo caller-selected image names or registry credentials.
    console.error('Refusing an unexpected PostgreSQL container image')
    process.exitCode = 1
  }
}
