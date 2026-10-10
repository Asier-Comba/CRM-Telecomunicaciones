import { createServer } from 'node:http'
import { expect, test } from '@playwright/test'
import { synchronizeLocalShellRoute } from '../../scripts/security/supabase-local/local-shell-route-arrival.mjs'

// Actual single-click SPA/HTTP sequencing; not Reports/Auth/DB acceptance.
for (const mode of ['legacy_poll', 'delayed_arrival', 'wrong_path'] as const) {
  test(`local shell route ${mode} keeps one click and the existing navigation budget`, async ({ page }) => {
    let readyReads = 0
    const methods: string[] = [], timers = new Set<ReturnType<typeof setTimeout>>()
    const server = createServer((request, response) => {
      methods.push(request.method ?? '')
      if (request.url === '/ready') {
        readyReads++
        const timer = setTimeout(() => {
          timers.delete(timer)
          response.writeHead(200, { 'Content-Type': 'application/json' })
          response.end('{"ready":true}')
        }, mode === 'wrong_path' ? 0 : 6000)
        timers.add(timer)
        response.on('close', () => { clearTimeout(timer); timers.delete(timer) })
        return
      }
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      response.end(`<meta name="viewport" content="width=device-width,initial-scale=1"><main><h1>Documentos</h1></main><a id="open" href="/reports">Informes</a><script>window.clicks=0;document.querySelector('#open').onclick=event=>{event.preventDefault();window.clicks++;fetch('/ready').then(()=>{history.pushState({},'','${mode === 'wrong_path' ? '/documents' : '/reports'}');document.querySelector('h1').textContent='${mode === 'wrong_path' ? 'Documentos' : 'Informes'}'})}</script>`)
    })
    await new Promise<void>(resolve => { server.listen(0, '127.0.0.1', resolve) })
    try {
      const address = server.address()
      if (!address || typeof address === 'string') throw Error('LOOPBACK_FIXTURE_ADDRESS')
      const origin = `http://127.0.0.1:${address.port}`
      await page.goto(origin + '/documents')
      // Match the already existing real-local acceptance page policy.
      page.setDefaultTimeout(30000)
      const click = () => page.getByRole('link', { name: 'Informes', exact: true }).click()
      let rejected = false
      try {
        if (mode === 'legacy_poll') {
          await click()
          await expect.poll(() => new URL(page.url()).pathname).toBe('/reports')
        } else {
          await synchronizeLocalShellRoute({ page, origin, path: '/reports', click })
          await expect.poll(() => new URL(page.url()).pathname).toBe('/reports')
          await expect(page.getByRole('heading', { name: 'Informes', exact: true })).toBeVisible()
        }
      } catch { rejected = true }
      expect(rejected).toBe(mode !== 'delayed_arrival')
      if (mode === 'delayed_arrival') expect(new URL(page.url()).pathname).toBe('/reports')
      else expect(new URL(page.url()).pathname).toBe('/documents')
      expect(await page.evaluate(() => (window as typeof window & { clicks: number }).clicks)).toBe(1)
      expect(readyReads).toBe(1)
      expect(methods.every(method => method === 'GET')).toBe(true)
    } finally {
      for (const timer of timers) clearTimeout(timer)
      server.closeAllConnections()
      await new Promise<void>((resolve, reject) => { server.close(error => error ? reject(error) : resolve()) })
    }
  })
}
