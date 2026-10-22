import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { Script } from 'node:vm'
import { resolve } from 'node:path'
import ts from 'typescript'
import { startOnboardingVerificationFixture } from './fixtures/onboarding-verification-server.cjs'

// Actual UI -> actual route/NextResponse, controlled Auth/RPC/SDK only. Not DB evidence.
const routeRequire = createRequire(resolve('package.json'))
const compiled = ts.transpileModule(readFileSync('src/app/api/onboarding/workspace/route.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText
const workspace = { id: '50000000-0000-4000-8000-000000000001', name: 'Empresa sintética', slug: 'empresa-sintetica', role: 'owner', created: true }

function actualHandler(data: unknown, calls: string[]) {
  const client = {
    auth: { async getUser() { calls.push('auth.getUser'); return { data: { user: { id: 'synthetic-user' } }, error: null } } },
    async rpc(name: string) { calls.push(name); return { data, error: null } },
  }
  const compiledModule = { exports: {} as { POST: (request: Request) => Promise<Response> } }
  const injectedRequire = (name: string) => {
    if (name === 'next/server') return routeRequire('next/server')
    if (name === '@/lib/server/supabase-user') return { createUserServerClient: async () => client }
    throw Error('UNEXPECTED_HANDLER_DEPENDENCY')
  }
  new Script(`(function(require,module,exports){${compiled}\n})`).runInThisContext()(injectedRequire, compiledModule, compiledModule.exports)
  return compiledModule.exports.POST
}

for (const width of [390, 768, 1440]) for (const mode of ['null', 'empty', 'invalid-id', 'new', 'existing'] as const) {
  test(`onboarding actual route ${mode} receipt reaches its real UI safely at ${width}`, async ({ page }) => {
    const fixture = await startOnboardingVerificationFixture(), calls: string[] = [], posts: unknown[] = [], errors: string[] = []
    let active = false
    const valid = mode === 'new' || mode === 'existing'
    const data = mode === 'null' ? null : mode === 'empty' ? [] : mode === 'invalid-id' ? [{ ...workspace, id: 'not-an-id' }] : [{ ...workspace, created: mode === 'new' }]
    const post = actualHandler(data, calls)
    page.on('pageerror', error => errors.push(error.message))
    await page.setViewportSize({ width, height: 960 })
    await page.route('**/fixture/**', route => route.fulfill({ json: route.request().url().endsWith('session')
      ? { data: { session: { user: { id: 'synthetic-user' } } }, error: null }
      : { data: active ? [{ id: 'synthetic-membership' }] : [], error: null } }))
    await page.route('**/api/onboarding/workspace', async route => {
      posts.push(route.request().postDataJSON())
      const response = await post(new Request(route.request().url(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: route.request().postData() }))
      await route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() })
    })
    const redirects = () => page.evaluate(() => (window as unknown as { onboardingFixture: { redirects: string[] } }).onboardingFixture.redirects)
    try {
      await page.goto(fixture.url)
      await page.getByRole('textbox', { name: 'Nombre de tu empresa' }).fill('Empresa sintética')
      await page.getByRole('button', { name: 'Crear y empezar', exact: true }).click()
      if (valid) {
        await expect.poll(redirects).toEqual(['/dashboard'])
        await expect(page.getByText(mode === 'new' ? 'Espacio de trabajo listo' : 'Acceso a tu espacio confirmado', { exact: true })).toBeVisible()
      } else {
        const notice = page.getByRole('alert').filter({ hasText: 'No hemos podido confirmar el alta' })
        await expect(notice).toBeVisible()
        await expect(page.getByRole('button', { name: 'Crear y empezar', exact: true })).toHaveCount(0)
        expect(await redirects()).toEqual([])
        await page.getByRole('button', { name: 'Comprobar acceso', exact: true }).click()
        await expect(notice).toBeVisible()
        active = true
        await page.getByRole('button', { name: 'Comprobar acceso', exact: true }).click()
        await expect.poll(redirects).toEqual(['/dashboard'])
      }
      expect(posts).toEqual([{ name: 'Empresa sintética' }])
      expect(calls).toEqual(['auth.getUser', 'provision_workspace'])
      expect(errors).toEqual([])
    } finally { await page.unrouteAll({ behavior: 'wait' }); await fixture.close() }
  })
}
