import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { nodeSupported, previewRoot, projectStatus } from './preview-common.mjs'
const options = new Set(process.argv.slice(2))
try {
  if ([...options].some(option => !['--install','--open'].includes(option))) throw new Error('Usage: npm run preview:setup -- [--install] [--open]')
  if (!nodeSupported()) throw new Error('Requires Node 24.x. Install Node24 from nodejs.org, reopen this terminal, then retry. No software was installed automatically.')
  const status = projectStatus()
  if (status.missing.length || !status.compatible) throw new Error('Wrong/incomplete project checkout. Run from the CRM preview repository with package-lock.json.')
  if (options.has('--install')) {
    // npm run supplies the absolute npm CLI; avoid npm.cmd shell interpolation.
    const npmCli = process.env.npm_execpath
    if (!npmCli) throw new Error('Run npm run preview:setup -- --install (npm CLI missing).')
    const installer = spawn(process.execPath, [npmCli, 'ci'], { cwd: previewRoot, stdio: 'inherit', shell: false })
    const code = await new Promise(resolveCode => { installer.once('error', () => resolveCode(1)); installer.once('exit', resolveCode) })
    if (code !== 0) throw new Error('npm ci failed; see npm output above. No server started.')
  }
  if (!projectStatus().dependencies) throw new Error('Dependencies missing. Run npm run preview:setup -- --install, or npm ci first.')
  // Keep launcher and signal handlers in one process, avoiding a wrapper orphan.
  process.argv = [process.argv[0], resolve(previewRoot,'scripts/preview-dev.mjs'), ...(options.has('--open') ? ['--open'] : [])]
  await import('./preview-dev.mjs')
} catch (error) { console.error(error.message); process.exitCode = 1 }
