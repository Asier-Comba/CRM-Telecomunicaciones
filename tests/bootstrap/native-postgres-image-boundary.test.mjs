import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { isExpectedNativeImage, NATIVE_POSTGRES_OFFICIAL_IMAGE } from '../../scripts/security/native-postgres/expected-image.mjs'

const cli = fileURLToPath(new URL('../../scripts/security/native-postgres/expected-image.mjs', import.meta.url))

test('native container boundary accepts the exact official reference and existing local tag', () => {
  for (const image of ['postgres:16', NATIVE_POSTGRES_OFFICIAL_IMAGE]) {
    assert.equal(isExpectedNativeImage(image), true)
    assert.equal(spawnSync(process.execPath, [cli, image], { encoding: 'utf8' }).status, 0)
  }
})

test('native container boundary rejects registry, publisher, version, digest and tag suffix substitutions', () => {
  for (const image of [
    'postgres:16-unreviewed', 'postgres:160', 'postgres:17', 'postgres:latest',
    NATIVE_POSTGRES_OFFICIAL_IMAGE.replace('public.ecr.aws', 'untrusted.invalid'),
    NATIVE_POSTGRES_OFFICIAL_IMAGE.replace('docker/library', 'untrusted/library'),
    NATIVE_POSTGRES_OFFICIAL_IMAGE.slice(0, -1) + '0',
    'public.ecr.aws/docker/library/postgres:16',
    ' ' + NATIVE_POSTGRES_OFFICIAL_IMAGE, NATIVE_POSTGRES_OFFICIAL_IMAGE + ':extra',
    '', null, undefined, { toString: () => NATIVE_POSTGRES_OFFICIAL_IMAGE },
  ]) assert.equal(isExpectedNativeImage(image), false)
})

test('shell entry point fails closed without printing untrusted input', () => {
  const untrusted = 'private.invalid/credential-like-value/postgres:16'
  for (const args of [[], [untrusted], [NATIVE_POSTGRES_OFFICIAL_IMAGE, 'extra']]) {
    const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' })
    assert.equal(result.status, 1)
    assert.equal(result.stdout, '')
    assert.equal(result.stderr.trim(), 'Refusing an unexpected PostgreSQL container image')
    assert.equal(result.stderr.includes(untrusted), false)
  }
})
