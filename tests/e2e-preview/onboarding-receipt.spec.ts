import { expect, test, type Page } from '@playwright/test'
import { startOnboardingVerificationFixture } from './fixtures/onboarding-verification-server.cjs'
const session = { data: { session: { user: { id: 'synthetic-user' } } }, error: null }
const workspace = { id: '50000000-0000-4000-8000-000000000001', name: 'Empresa sintética', slug: 'empresa-sintetica', role: 'owner', created: true }
const redirects = (page: Page) => page.evaluate(() => (window as unknown as { onboardingFixture: { redirects: string[] } }).onboardingFixture.redirects)
type Fault = 'malformed' | 'missing' | 'invalid-id' | 'lost-reply' | 'upstream' | 'created-string' | 'status-mismatch'
for (const width of [390, 768, 1440]) {
  const faults: Fault[] = ['malformed', 'missing', 'invalid-id', 'lost-reply', 'upstream', ...(width === 390 ? ['created-string', 'status-mismatch'] as Fault[] : [])]
  for (const fault of faults) test(`onboarding receipt uncertainty ${fault} never resubmits while checking at ${width}`, async ({ page }, info) => {
    const fixture = await startOnboardingVerificationFixture(), posts: unknown[] = [], reads: string[] = [], errors: string[] = []
    let active = false
    page.on('pageerror', error => errors.push(error.message))
    await page.setViewportSize({ width, height: 960 })
    await page.route('**/fixture/**', async route => {
      const endpoint = route.request().url().split('/').pop()!; reads.push(endpoint)
      await route.fulfill({ json: endpoint === 'session' ? session : { data: active ? [{ id: 'synthetic-membership' }] : [], error: null } })
    })
    await page.route('**/api/onboarding/workspace', async route => {
      expect(route.request().method()).toBe('POST'); posts.push(route.request().postDataJSON())
      if (fault === 'lost-reply') return route.abort('failed')
      if (fault === 'malformed') return route.fulfill({ status: 200, contentType: 'application/json', body: '{broken' })
      if (fault === 'upstream') return route.fulfill({ status: 502, json: { error: 'SYNTHETIC_INTERNAL_DETAIL' } })
      const payload = fault === 'missing' ? {} : { workspace: { ...workspace, ...(fault === 'invalid-id' ? { id: 'not-an-id' } : fault === 'created-string' ? { created: 'true' } : fault === 'status-mismatch' ? { created: false } : {}) } }
      await route.fulfill({ status: 201, json: payload })
    })
    try {
      await page.goto(fixture.url)
      await page.getByRole('textbox', { name: 'Nombre de tu empresa' }).fill('  Empresa sintética  ')
      await page.getByRole('button', { name: 'Crear y empezar', exact: true }).click()
      const notice = page.getByRole('alert').filter({ hasText: 'No hemos podido confirmar el alta' })
      await expect(notice).toBeVisible()
      await expect(page.getByRole('textbox')).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Crear y empezar', exact: true })).toHaveCount(0)
      await expect(page.locator('body')).not.toContainText('SYNTHETIC_INTERNAL_DETAIL')
      await expect(page.getByText('Espacio de trabajo listo', { exact: true })).toHaveCount(0)
      expect(await redirects(page)).toEqual([]); expect(posts).toEqual([{ name: 'Empresa sintética' }])
      const check = page.getByRole('button', { name: 'Comprobar acceso', exact: true })
      await check.focus(); await page.keyboard.press('Enter')
      await expect.poll(() => reads.length).toBe(4); await expect(notice).toBeVisible()
      expect(posts).toHaveLength(1); expect(await redirects(page)).toEqual([])
      if (fault === 'lost-reply') await info.attach(`onboarding-unconfirmed-${width}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
      active = true; await check.click()
      await expect.poll(() => redirects(page)).toEqual(['/dashboard'])
      expect(reads).toEqual(['session', 'memberships', 'session', 'memberships', 'session', 'memberships'])
      expect(posts).toHaveLength(1); expect(errors).toEqual([])
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    } finally { await page.unrouteAll({ behavior: 'wait' }); await fixture.close() }
  })
  for (const created of [true, false]) test(`onboarding valid ${created ? 'new' : 'existing'} receipt routes once at ${width}`, async ({ page }) => {
    const fixture = await startOnboardingVerificationFixture(), posts: unknown[] = [], errors: string[] = []
    page.on('pageerror', error => errors.push(error.message)); await page.setViewportSize({ width, height: 960 })
    await page.route('**/fixture/**', route => route.fulfill({ json: route.request().url().endsWith('session') ? session : { data: [], error: null } }))
    await page.route('**/api/onboarding/workspace', async route => {
      posts.push(route.request().postDataJSON())
      await route.fulfill({ status: created ? 201 : 200, json: { workspace: { ...workspace, created, ...(created ? {} : { name: 'Empresa anterior', slug: 'empresa-anterior', role: 'viewer' }) } } })
    })
    try {
      await page.goto(fixture.url); await page.getByRole('textbox', { name: 'Nombre de tu empresa' }).fill('Empresa sintética')
      await page.getByRole('button', { name: 'Crear y empezar', exact: true }).click()
      await expect.poll(() => redirects(page)).toEqual(['/dashboard'])
      await expect(page.getByText(created ? 'Espacio de trabajo listo' : 'Acceso a tu espacio confirmado', { exact: true })).toBeVisible()
      if (!created) await expect(page.getByText('Tu CRM está vacío y listo para empezar.', { exact: true })).toHaveCount(0)
      expect(posts).toEqual([{ name: 'Empresa sintética' }]); expect(errors).toEqual([])
    } finally { await page.unrouteAll({ behavior: 'wait' }); await fixture.close() }
  })
  test(`onboarding explicit suspended refusal keeps the name without success at ${width}`, async ({ page }) => {
    const fixture = await startOnboardingVerificationFixture(), posts: unknown[] = []
    await page.setViewportSize({ width, height: 960 })
    await page.route('**/fixture/**', route => route.fulfill({ json: route.request().url().endsWith('session') ? session : { data: [], error: null } }))
    await page.route('**/api/onboarding/workspace', async route => { posts.push(route.request().postDataJSON()); await route.fulfill({ status: 403, json: { error: 'El workspace asociado está suspendido.', code: 'workspace_suspended' } }) })
    try {
      await page.goto(fixture.url); const name = page.getByRole('textbox', { name: 'Nombre de tu empresa' }); await name.fill('Empresa sintética')
      await page.getByRole('button', { name: 'Crear y empezar', exact: true }).click()
      await expect(page.getByText('El workspace asociado está suspendido.', { exact: true })).toBeVisible()
      await expect(name).toHaveValue('Empresa sintética'); await expect(page.getByRole('button', { name: 'Crear y empezar', exact: true })).toBeEnabled()
      expect(await redirects(page)).toEqual([]); expect(posts).toEqual([{ name: 'Empresa sintética' }])
    } finally { await page.unrouteAll({ behavior: 'wait' }); await fixture.close() }
  })
}
