import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { browserCommand, nodeSupported, portAvailable, previewEnvironment, previewPort, previewRoot, previewUrl, projectStatus } from './preview-common.mjs'
let child
let stopping = false
function stop(signal = 'SIGTERM') {
  if (!child || stopping) return
  stopping = true
  if (process.platform === 'win32') {
    // Only our numeric child PID; terminate Next's worker tree on Windows.
    spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { shell: false, stdio: 'ignore' }).on('error', () => child.kill())
  } else child.kill(signal)
}
try {
  if (process.argv.slice(2).some(arg => arg !== '--open')) throw new Error('Usage: npm run preview:dev -- [--open]')
  if (!nodeSupported()) throw new Error('Requires Node 24.x. Install Node24 from nodejs.org and reopen the terminal.')
  const project = projectStatus()
  if (project.missing.length || !project.compatible || !project.dependencies) throw new Error('Incomplete preview checkout. Run npm run preview:doctor, then npm ci.')
  const port = previewPort()
  if (!await portAvailable(port)) throw new Error(`Port ${port} occupied. Stop the other local server, or set PREVIEW_PORT explicitly. No remote binding attempted.`)
  const url = previewUrl(port)
  console.log(`Starting synthetic CRM preview (${project.branch}@${project.sha}). No credentials required.`)
  child = spawn(process.execPath, [resolve(previewRoot,'node_modules/next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: previewRoot, stdio: 'inherit', shell: false, env: previewEnvironment(port) })
  child.once('error', () => { stopping = true; console.error('Next could not start. Run npm run preview:doctor.'); process.exitCode = 1 })
  child.once('exit', code => { stopping = true; process.exitCode = code ?? 1; if (process.connected) process.disconnect() })
  for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => stop(signal))
  // Parent-only local test/control channel, never an HTTP endpoint.
  process.on('message', message => { if (message === 'preview:stop') stop() })
  const deadline = Date.now() + 90_000
  let ready = false
  while (!stopping && Date.now() < deadline) {
    try { if ((await fetch(url, { signal: AbortSignal.timeout(1500) })).ok) { ready = true; break } } catch {}
    await new Promise(resolveWait => setTimeout(resolveWait, 300))
  }
  if (!ready) { stop(); throw new Error('Preview did not become ready within90 seconds. Check Next output above; run npm run preview:doctor.') }
  console.log(`\nCRM Telecom synthetic preview ready\n${url}\nOpen this URL on the SAME computer running this command. Choose "Ver demo telecom". Ctrl+C stops the preview.\n`)
  if (process.argv.includes('--open')) {
    const [command,args] = browserCommand(port)
    const browser = spawn(command,args,{ shell:false,stdio:'ignore',detached:true })
    browser.on('error', () => console.log(`Browser auto-open unavailable; open ${url} manually.`))
    browser.on('exit', code => { if (code) console.log(`Browser auto-open unavailable; open ${url} manually.`) })
    browser.unref()
  }
} catch (error) { console.error(error.message); process.exitCode = 1 }
