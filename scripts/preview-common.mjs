import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createServer } from 'node:net'

export const previewRoot = fileURLToPath(new URL('../', import.meta.url))
export const requiredFiles = ['package.json', 'package-lock.json', 'scripts/preview-dev.mjs', 'src/app/login/page.tsx', 'src/app/api/assistant/read-preview/route.ts']
export function nodeSupported(version = process.versions.node) { return version.split('.')[0] === '24' }
export function previewPort(value = process.env.PREVIEW_PORT ?? '3107') {
  if (!/^\d{4,5}$/.test(value) || Number(value) < 1024 || Number(value) > 65535) throw new Error('PREVIEW_PORT must be a local numeric port between 1024 and 65535 (default3107).')
  return Number(value)
}
export const previewUrl = port => `http://127.0.0.1:${previewPort(String(port))}/login`
export async function portAvailable(port) {
  return new Promise(resolveAvailable => {
    const server = createServer()
    server.once('error', () => resolveAvailable(false))
    server.listen({ port, host: '127.0.0.1', exclusive: true }, () => server.close(() => resolveAvailable(true)))
  })
}
export function projectStatus(root = previewRoot) {
  const missing = requiredFiles.filter(file => !existsSync(resolve(root, file)))
  let compatible = false
  try { compatible = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).scripts['preview:dev'] === 'node scripts/preview-dev.mjs' } catch {}
  const git = args => spawnSync('git', args, { cwd: root, encoding: 'utf8', shell: false }).stdout?.trim() || 'unavailable'
  return { root, missing, compatible, dependencies: existsSync(resolve(root, 'node_modules/next/dist/bin/next')), branch: git(['branch','--show-current']), sha: git(['rev-parse','--short=12','HEAD']) }
}
/** Child-only bindings. Empty credentials also prevent Next dotenv fallback. */
export function previewEnvironment(port, inherited = process.env) {
  const env = { ...inherited, NODE_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1',
    NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${port}`, NEXT_PUBLIC_ENABLE_DEMO_DATA: 'true',
    NEXT_PUBLIC_ENABLE_ASSISTANT: 'true', NEXT_PUBLIC_ENABLE_OPPORTUNITIES: 'true', NEXT_PUBLIC_ENABLE_CALENDAR: 'true',
    NEXT_PUBLIC_FORCE_OFFLINE_DEV: 'false', NEXT_PUBLIC_SHOW_DEBUG_PANEL: 'false' }
  for (const name of ['BILLING','INVOICING','INBOX','AUTOMATIONS','INSTAGRAM','WHATSAPP']) env[`NEXT_PUBLIC_ENABLE_${name}`] = 'false'
  env.NEXT_PUBLIC_NOWLABS_INTERNAL = 'false'
  for (const name of ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','OPENAI_API_KEY','META_WHATSAPP_ACCESS_TOKEN','META_APP_SECRET','META_WEBHOOK_VERIFY_TOKEN','NOWCRM_WEBHOOK_SECRET','N8N_BASE_URL','N8N_API_KEY','N8N_WEBHOOK_SECRET','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','GOOGLE_REDIRECT_URI','GOOGLE_PLACES_API_KEY','GEOAPIFY_API_KEY','MAPBOX_ACCESS_TOKEN','AGENT_TOOL_SECRET']) env[name] = ''
  env.LOCATION_PROVIDER = 'local'
  env.LOCATION_AUTOCOMPLETE_ENABLED = 'false'
  return env
}
export function browserCommand(port, platform = process.platform) {
  const url = previewUrl(port)
  return platform === 'win32' ? ['rundll32.exe', ['url.dll,FileProtocolHandler', url]]
    : platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]]
}
