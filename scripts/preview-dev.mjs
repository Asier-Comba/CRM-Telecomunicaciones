import { spawn } from 'node:child_process'

// Cross-platform, local-only synthetic preview. No credentials or provider effects.
const child = spawn(process.execPath, [
  'node_modules/next/dist/bin/next', 'dev', '--webpack', '--hostname', '127.0.0.1',
  '--port', process.env.PREVIEW_PORT || '3107',
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_PUBLIC_ENABLE_DEMO_DATA: 'true',
    NEXT_PUBLIC_ENABLE_INVOICING: 'false',
    NEXT_PUBLIC_ENABLE_INBOX: 'false',
    NEXT_PUBLIC_ENABLE_AUTOMATIONS: 'false',
    NEXT_TELEMETRY_DISABLED: '1',
  },
})
child.on('exit', code => { process.exitCode = code ?? 1 })
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
