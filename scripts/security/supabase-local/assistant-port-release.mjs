import { createConnection } from 'node:net'
import { performance } from 'node:perf_hooks'

function probe(port, timeout) {
  return new Promise(resolve => {
    const socket = createConnection({ host: '127.0.0.1', port })
    let settled = false
    const finish = result => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(result)
    }
    socket.once('connect', () => finish(false))
    socket.once('error', error => finish(error.code === 'ECONNREFUSED'))
    socket.setTimeout(timeout, () => finish(false))
  })
}

// CI-only transport ownership evidence. Never kill an unrelated listener;
// timeout/unknown socket errors cannot establish that a port was released.
export async function waitForAssistantPortRelease(port = 3109, maxWaitMs = 5000) {
  if (!Number.isInteger(port) || port < 1 || port > 65535 ||
      !Number.isInteger(maxWaitMs) || maxWaitMs < 1 || maxWaitMs > 5000) return false
  const deadline = performance.now() + maxWaitMs
  while (performance.now() < deadline) {
    const remaining = Math.max(1, Math.ceil(deadline - performance.now()))
    if (await probe(port, Math.min(250, remaining))) return true
    const delay = Math.min(100, deadline - performance.now())
    if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay))
  }
  return false
}
