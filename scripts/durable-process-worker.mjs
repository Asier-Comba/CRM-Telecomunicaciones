import { pathToFileURL } from 'node:url'

// Local W2 driver only. Never print adapter errors, environment or credentials.
const driver = await import(pathToFileURL(process.argv[2]).href)
process.send({ type: 'ready' })
process.once('message', async (job) => {
  try {
    const checkpoint = async (name) => {
      if (name !== job.killAt) return
      process.send({ type: 'checkpoint', name })
      await new Promise(() => {}) // parent SIGKILL at the actual adapter barrier
    }
    const result = await driver.execute(job, checkpoint)
    process.send({ type: 'result', result }, () => process.exit(0))
  } catch {
    process.send({ type: 'error', code: 'adapter_execution_failed' }, () => process.exit(1))
  }
})
