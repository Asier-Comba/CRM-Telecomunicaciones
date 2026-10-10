import { createServer } from 'node:http'
import { expect, test } from '@playwright/test'
import { observeDocumentMaintenanceRoute } from '../../scripts/security/supabase-local/observed-document-route.mjs'
import { observeDocumentMaintenanceStep } from '../../scripts/security/supabase-local/document-maintenance-step.mjs'

// Actual Playwright transport only; no real Auth, Storage or document DB commit.
for (const operation of ['document.verify_content', 'document.cleanup_finish'] as const) {
  for (const mode of ['reset', 'conflict', 'commit'] as const) {
    test(`document step observation ${operation} ${mode} preserves exact retry gating without private errors`, async ({ page }) => {
      const received: string[] = [], committed = new Set<string>()
      const report: { w2_document_maintenance_step_failures?: Array<{ operation: string; step: string; kind: string }> } = {}
      const server = createServer((request, response) => {
        if (request.url !== '/api/document/v1/maintenance') {
          response.writeHead(200, { 'Content-Type': 'text/html', 'Set-Cookie': 'test=synthetic-private-cookie; HttpOnly; SameSite=Lax' })
          response.end(`<button id="send">Send</button><p id="state">ready</p><script>document.querySelector('#send').onclick=async()=>{try{const r=await fetch('/api/document/v1/maintenance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'${operation}',input:{request_id:'synthetic-exact-request'}})});document.querySelector('#state').textContent=r.ok?'done':'retry'}catch{document.querySelector('#state').textContent='retry'}}</script>`)
          return
        }
        let body = ''; request.setEncoding('utf8'); request.on('data', chunk => { body += chunk })
        request.on('end', () => {
          received.push(body)
          if (mode === 'reset') { request.socket.destroy(); return }
          if (mode === 'commit') committed.add(body)
          response.writeHead(mode === 'conflict' ? 409 : 200, { 'Content-Type': 'application/json' }); response.end('{}')
        })
      })
      await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
      try {
        const address = server.address(); if (!address || typeof address === 'string') throw Error('LOOPBACK_ADDRESS_REQUIRED')
        await page.goto(`http://127.0.0.1:${address.port}`)
        let first = true, interceptions = 0, retries = 0
        const observed = (step: string, action: () => unknown) => observeDocumentMaintenanceStep(report, operation, step, action)
        const observer = await observeDocumentMaintenanceRoute(page, async route => {
          interceptions++
          if (first) {
            first = false
            const response = await observed('lost_response_fetch', () => route.fetch())
            await observed('commit_status', () => { if (response.status() !== 200) throw Error(operation === 'document.cleanup_finish' ? 'CLEANUP_UI_NOT_COMMITTED' : 'INTEGRITY_UI_NOT_COMMITTED') })
            await observed('intentional_abort', () => route.abort('failed'))
          } else await observed('exact_retry_continue', () => route.continue())
        })
        try {
          await page.getByRole('button', { name: 'Send', exact: true }).click(); await expect(page.locator('#state')).toHaveText('retry')
          if (mode === 'commit') {
            await observer.assertHealthy(); retries++
            await page.getByRole('button', { name: 'Send', exact: true }).click(); await expect(page.locator('#state')).toHaveText('done'); await observer.assertHealthy()
            expect(received).toHaveLength(2); expect(received[0]).toBe(received[1]); expect(committed.size).toBe(1)
            expect(interceptions).toBe(2); expect(retries).toBe(1); expect(report).toEqual({})
          } else {
            await expect(observer.assertHealthy()).rejects.toThrow('DOCUMENT_ROUTE_INTERCEPTION_FAILED')
            expect(received).toHaveLength(1); expect(committed.size).toBe(0); expect(interceptions).toBe(1); expect(retries).toBe(0)
            expect(report.w2_document_maintenance_step_failures).toEqual([{ operation, step: mode === 'reset' ? 'lost_response_fetch' : 'commit_status', kind: mode === 'reset' ? 'ACTION_FAILED' : 'HTTP_REFUSED' }])
          }
        } finally {
          if (mode === 'commit') await observer.dispose(); else await expect(observer.dispose()).rejects.toThrow('DOCUMENT_ROUTE_INTERCEPTION_FAILED')
        }
        expect(JSON.stringify(report)).not.toContain('synthetic-private-cookie'); expect(JSON.stringify(report)).not.toContain('stack')
        await page.reload(); await expect(page.locator('#state')).toHaveText('ready')
      } finally {
        server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
      }
    })
  }
}
