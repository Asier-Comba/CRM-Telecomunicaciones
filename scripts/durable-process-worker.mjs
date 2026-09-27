import { pathToFileURL } from 'node:url'

// Local W2 driver only. Never print adapter errors, environment or credentials.
const driver = await import(pathToFileURL(process.argv[2]).href)
// Must query pg_backend_pid() on the same native connection used by execute.
const backendPid = await driver.connectWorker()
process.send({ type: 'ready', backendPid })
process.once('message', async (job) => {
  try {
    const checkpoint = async (name) => {
      if (name !== job.killAt) return
      process.send({ type: 'checkpoint', name })
      // An unresolved Promise alone does not keep a Node worker alive.
      // Parent owns termination and its 30s timeout; this handle prevents an
      // ordinary clean exit from racing the observed SIGKILL checkpoint.
      await new Promise(() => { setInterval(() => {}, 1000) })
    }
    const result = await driver.execute(job, checkpoint)
    process.send({ type: 'result', result }, () => process.exit(0))
  } catch {
    process.send({ type: 'error', code: 'adapter_execution_failed' }, () => process.exit(1))
  }
})
