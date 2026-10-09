import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:net'
import { once } from 'node:events'
import { waitForAssistantPortRelease } from '../../scripts/security/supabase-local/assistant-port-release.mjs'

async function listener() {
  const server = createServer(socket => socket.destroy())
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  return server
}
const close = server => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))

test('retained loopback listener fails release evidence without killing its owner', async () => {
  const server = await listener()
  const port = server.address().port
  try {
    assert.equal(await waitForAssistantPortRelease(port, 150), false)
    assert.equal(server.listening, true)
  } finally { await close(server) }
  assert.equal(await waitForAssistantPortRelease(port, 500), true)
})

test('release waits for actual socket closure and rejects invalid probe bounds', async () => {
  const server = await listener()
  const port = server.address().port
  const closed = new Promise((resolve, reject) => setTimeout(() => close(server).then(resolve, reject), 50))
  assert.equal(await waitForAssistantPortRelease(port, 1000), true)
  await closed
  for (const [badPort, deadline] of [[0, 500], [65536, 500], [port, 0], [port, 5001], [port, NaN]]) {
    assert.equal(await waitForAssistantPortRelease(badPort, deadline), false)
  }
})
