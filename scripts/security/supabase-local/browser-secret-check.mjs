import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

// Build-only random canaries; never real/local platform credentials.
const privateNames = ['SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_API_KEY', 'SMTP_PASSWORD', 'PRODUCT_DOCUMENT_VERIFY_KEY_HEX', 'IMPORT_STAGING_TEST_KEY', 'JWT_SECRET', 'DATABASE_URL']
const bindings = Object.fromEntries(privateNames.map(name => [name, `w4_bundle_${randomBytes(32).toString('hex')}`]))
async function files(root) {
  const out = []
  for (const item of await readdir(root, { withFileTypes: true })) {
    const path = join(root, item.name)
    if (item.isDirectory()) out.push(...await files(path))
    else if (/\.(?:js|map)$/.test(item.name)) out.push(path)
  }
  return out
}
try {
  if (process.env.GITHUB_ACTIONS !== 'true' || process.env.CI !== 'true') throw new Error('CI_ONLY')
  for (const args of [['ci'], ['run', 'build']]) {
    const r = spawnSync('npm', args, {
      encoding: 'utf8', timeout: 360_000, maxBuffer: 20 * 1024 * 1024, shell: false,
      env: { ...process.env, ...(args[0] === 'run' ? bindings : {}), NEXT_TELEMETRY_DISABLED: '1' },
    })
    // Suppress subprocess output; build failures never dump env or server payloads.
    if (r.status !== 0) throw new Error(args[0] === 'ci' ? 'INSTALL_FAILED' : 'BUILD_FAILED')
  }
  const bundles = await files('.next/static')
  if (!bundles.length) throw new Error('CLIENT_BUNDLES_MISSING')
  for (const file of bundles) {
    const bytes = await readFile(file)
    if (Object.values(bindings).some(value => bytes.includes(value))) throw new Error('PRIVATE_VALUE_IN_BROWSER')
  }
  console.log(JSON.stringify({ browser_bundle_secret_values: 'PASS', build: 'PASS', private_classes: privateNames, bundle_count: bundles.length, real_credentials: false }))
} catch (error) {
  console.error(/^[A-Z_]+$/.test(error.message) ? error.message : 'BROWSER_BOUNDARY_CHECK_FAILED')
  process.exitCode = 1
}
