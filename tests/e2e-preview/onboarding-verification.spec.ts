import { expect, test, type Page, type Route } from '@playwright/test'
import { startOnboardingVerificationFixture } from './fixtures/onboarding-verification-server.cjs'
type Probe = { redirects: string[]; queries: unknown[]; unmount: () => void }
const probe = (page: Page) => page.evaluate(() => (window as unknown as { onboardingFixture: Probe }).onboardingFixture)
const session = { data: { session: { user: { id: 'synthetic-user' } } }, error: null }
const query = { table: 'workspace_members', select: 'id, workspace:workspaces!inner(status)', filters: [['user_id', 'synthetic-user'], ['status', 'active'], ['workspace.status', 'active']], limit: 1 }
const failures = ['session-error', 'session-throw', 'membership-error', 'membership-throw'] as const
for (const width of [390, 768, 1440]) {
  for (const failure of failures) test(`onboarding verification failure ${failure} recovers explicitly at ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 960 })
    const fixture = await startOnboardingVerificationFixture(), errors: string[] = [], calls: string[] = [], writes: string[] = []
    let failed = true
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/fixture/**', async route => {
      const endpoint = route.request().url().split('/').pop()!
      calls.push(endpoint)
      const fails = failed && (failure.startsWith('session') ? endpoint === 'session' : endpoint === 'memberships')
      await route.fulfill({ json: fails ? failure.endsWith('throw') ? { throw: true } : { data: endpoint === 'session' ? session.data : null, error: { message: 'SYNTHETIC_SDK_DETAIL_DO_NOT_DISPLAY' } } : endpoint === 'session' ? session : { data: [], error: null } })
    })
    await page.route('**/api/**', async route => { writes.push(route.request().method()); await route.fulfill({ status: 403, json: { error: 'SYNTHETIC_DENIED' } }) })
    try {
      await page.goto(fixture.url)
      await expect(page.getByRole('alert')).toContainText('No hemos podido comprobar')
      await expect(page.getByRole('textbox', { name: 'Nombre de tu empresa' })).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Crear y empezar' })).toHaveCount(0)
      await expect(page.locator('body')).not.toContainText('SYNTHETIC_SDK_DETAIL')
      expect((await probe(page)).redirects).toEqual([])
      expect(calls).toEqual(failure.startsWith('session') ? ['session'] : ['session', 'memberships'])
      if (failure === 'membership-error') await info.attach(`onboarding-error-${width}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
      failed = false
      await page.getByRole('button', { name: 'Reintentar comprobación', exact: true }).focus()
      await page.keyboard.press('Enter')
      await expect(page.getByRole('textbox', { name: 'Nombre de tu empresa' })).toBeVisible()
      await expect(page.getByRole('alert')).toHaveCount(0)
      const state = await probe(page)
      expect(state.redirects).toEqual([])
      expect(state.queries).toEqual(Array(failure.startsWith('session') ? 1 : 2).fill(query))
      expect(calls).toEqual(failure.startsWith('session') ? ['session', 'session', 'memberships'] : ['session', 'memberships', 'session', 'memberships'])
      expect(writes).toEqual([]); expect(errors).toEqual([])
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      if (failure === 'membership-error') await info.attach(`onboarding-recovered-${width}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    } finally { await page.unrouteAll({ behavior: 'wait' }); await fixture.close() }
  })
  for (const mode of ['unconfigured', 'no-session', 'active', 'empty']) test(`onboarding verified ${mode} retains routing at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 })
    const fixture = await startOnboardingVerificationFixture(), errors: string[] = [], calls: string[] = [], writes: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/fixture/**', async route => {
      const endpoint = route.request().url().split('/').pop()!; calls.push(endpoint)
      await route.fulfill({ json: endpoint === 'session' ? mode === 'no-session' ? { data: { session: null }, error: null } : session : { data: mode === 'active' ? [{ id: 'synthetic-membership' }] : [], error: null } })
    })
    await page.route('**/api/**', async route => { writes.push(route.request().method()); await route.fulfill({ status: 403, json: {} }) })
    try {
      await page.goto(fixture.url + (mode === 'unconfigured' ? '/?unconfigured' : ''))
      if (mode === 'empty') await expect(page.getByRole('textbox', { name: 'Nombre de tu empresa' })).toBeVisible()
      else await expect.poll(async () => (await probe(page)).redirects).toEqual([mode === 'active' ? '/dashboard' : '/login'])
      expect(calls).toEqual(mode === 'unconfigured' ? [] : mode === 'no-session' ? ['session'] : ['session', 'memberships'])
      expect((await probe(page)).queries).toEqual(mode === 'active' || mode === 'empty' ? [query] : [])
      await expect(page.getByRole('alert')).toHaveCount(0)
      if (mode !== 'empty') await expect(page.getByRole('textbox')).toHaveCount(0)
      expect(writes).toEqual([]); expect(errors).toEqual([])
    } finally { await page.unrouteAll({ behavior: 'wait' }); await fixture.close() }
  })
}
for (const heldEndpoint of ['session', 'memberships']) test(`onboarding ignores ${heldEndpoint} completion after unmount`, async ({ page }) => {
  const fixture = await startOnboardingVerificationFixture(), held: Route[] = [], errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/fixture/**', async route => {
    if (route.request().url().endsWith(heldEndpoint)) { held.push(route); return }
    await route.fulfill({ json: session })
  })
  try {
    await page.goto(fixture.url); await expect.poll(() => held.length).toBe(1)
    await page.evaluate(() => (window as unknown as { onboardingFixture: Probe }).onboardingFixture.unmount())
    const route = held.pop()!, response = page.waitForResponse(r => r.request() === route.request())
    await route.fulfill({ json: heldEndpoint === 'session' ? session : { data: [{ id: 'synthetic-membership' }], error: null } })
    await (await response).finished()
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    expect((await probe(page)).redirects).toEqual([])
    expect((await probe(page)).queries).toEqual(heldEndpoint === 'session' ? [] : [query])
    await expect(page.locator('#app')).toBeEmpty(); expect(errors).toEqual([])
  } finally { for (const route of held) await route.abort().catch(() => {}); await page.unrouteAll({ behavior: 'wait' }); await fixture.close() }
})
