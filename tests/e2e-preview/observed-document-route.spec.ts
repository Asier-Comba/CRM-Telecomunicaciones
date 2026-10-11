import { createServer } from 'node:http'
import { expect, test } from '@playwright/test'
import { observeDocumentMaintenanceRoute } from '../../scripts/security/supabase-local/observed-document-route.mjs'

// Exercise actual Playwright route.fetch, with a disposable loopback server.
// These are transport regressions, not Auth/DB/document authorization evidence.
for (const mode of ['reset', 'conflict', 'commit'] as const) {
  test(`document interception observes ${mode} without an uncertain retry`, async ({ page }) => {
    const received: string[] = [], committed = new Set<string>()
    const server = createServer((request, response) => {
      if (request.url !== '/api/document/v1/maintenance') {
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': 'test=synthetic-private-cookie; HttpOnly; SameSite=Lax' })
        response.end(`<button id="send">Send</button><p id="state">ready</p><script>
          document.querySelector('#send').onclick = async () => {
            try {
              const response = await fetch('/api/document/v1/maintenance', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({operation: 'document.verify_content', input: {request_id: 'synthetic-exact-request'}})})
              document.querySelector('#state').textContent = response.ok ? 'done' : 'retry'
            } catch { document.querySelector('#state').textContent = 'retry' }
          }
        </script>`)
        return
      }
      let body = ''
      request.setEncoding('utf8')
      request.on('data', chunk => { body += chunk })
      request.on('end', () => {
        received.push(body)
        if (mode === 'reset') { request.socket.destroy(); return }
        if (mode === 'commit') committed.add(body)
        response.writeHead(mode === 'conflict' ? 409 : 200, { 'Content-Type': 'application/json' })
        response.end('{}')
      })
    })
    await new Promise<void>(resolve => { server.listen(0, '127.0.0.1', resolve) })
    try {
      const address = server.address()
      if (!address || typeof address === 'string') throw Error('LOOPBACK_FIXTURE_ADDRESS')
      await page.goto(`http://127.0.0.1:${address.port}`)
      let first = true, interceptions = 0, retries = 0
      const observer = await observeDocumentMaintenanceRoute(page, async route => {
        interceptions++
        if (first) {
          first = false
          const response = await route.fetch()
          if (response.status() !== 200) throw Error('INTEGRITY_UI_NOT_COMMITTED')
          await route.abort('failed')
        } else await route.continue()
      })
      try {
        await page.getByRole('button', { name: 'Send', exact: true }).click()
        await expect(page.locator('#state')).toHaveText('retry')
        if (mode === 'commit') {
          await observer.assertHealthy()
          retries++
          await page.getByRole('button', { name: 'Send', exact: true }).click()
          await expect(page.locator('#state')).toHaveText('done')
          await observer.assertHealthy()
          expect(received).toHaveLength(2)
          expect(received[0]).toBe(received[1])
          expect(committed.size).toBe(1)
          expect(interceptions).toBe(2)
          expect(retries).toBe(1)
        } else {
          await expect(observer.assertHealthy()).rejects.toThrow('DOCUMENT_ROUTE_INTERCEPTION_FAILED')
          expect(received).toHaveLength(1)
          expect(committed.size).toBe(0)
          expect(interceptions).toBe(1)
          expect(retries).toBe(0)
        }
      } finally {
        if (mode === 'commit') await observer.dispose()
        else await expect(observer.dispose()).rejects.toThrow('DOCUMENT_ROUTE_INTERCEPTION_FAILED')
      }
      // The page and runner remain usable after a failed interception and disposal.
      await page.reload()
      await expect(page.locator('#state')).toHaveText('ready')
    } finally {
      server.closeAllConnections()
      await new Promise<void>((resolve, reject) => { server.close(error => error ? reject(error) : resolve()) })
    }
  })
}
