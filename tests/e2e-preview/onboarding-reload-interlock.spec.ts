import { expect, test } from '@playwright/test'
import { startOnboardingVerificationFixture } from './fixtures/onboarding-verification-server.cjs'

for (const width of [390, 768, 1440]) {
  for (const fault of ['lost-reply', 'interrupted'] as const) test(`onboarding ${fault} survives reload without a second POST at ${width}`, async ({ page }, info) => {
    const fixture = await startOnboardingVerificationFixture(), posts: unknown[] = [], errors: string[] = []
    let active = false, denied = false, user = 'synthetic-user-a'
    page.on('pageerror', error => errors.push(error.message))
    await page.setViewportSize({ width, height: 960 })
    await page.route('**/fixture/**', route => route.fulfill({ json: route.request().url().endsWith('session')
      ? { data: { session: { user: { id: user } } }, error: null }
      : { data: denied ? null : active ? [{ id: 'synthetic-membership' }] : [], error: denied ? { message: 'PRIVATE_DIAGNOSTIC' } : null } }))
    await page.route('**/api/onboarding/workspace', async route => {
      posts.push(route.request().postDataJSON())
      if (fault === 'lost-reply') await route.abort('failed')
      // A transport response held past navigation models interruption before any receipt.
    })
    try {
      await page.goto(fixture.url)
      await page.getByRole('textbox', { name: 'Nombre de tu empresa' }).fill('Empresa sintética privada')
      await page.getByRole('button', { name: 'Crear y empezar', exact: true }).click()
      await expect.poll(() => posts.length).toBe(1)
      if (fault === 'lost-reply') await expect(page.getByRole('alert')).toContainText('No hemos podido confirmar el alta')
      await page.reload()
      await expect(page.getByRole('alert')).toContainText('No hemos podido confirmar el alta')
      await expect(page.getByRole('button', { name: 'Crear y empezar', exact: true })).toHaveCount(0)
      expect(posts).toEqual([{ name: 'Empresa sintética privada' }])
      const storage = await page.evaluate(() => JSON.stringify(localStorage))
      expect(storage).not.toContain('Empresa sintética privada')
      expect(storage).not.toContain('access_token')
      denied = true
      await page.getByRole('button', { name: 'Comprobar acceso', exact: true }).click()
      await expect(page.getByRole('alert')).toContainText('No hemos podido comprobar tu acceso')
      await expect(page.getByRole('button', { name: 'Crear y empezar', exact: true })).toHaveCount(0)
      await expect(page.locator('body')).not.toContainText('PRIVATE_DIAGNOSTIC')
      denied = false
      await page.getByRole('button', { name: 'Reintentar comprobación', exact: true }).click()
      await expect(page.getByRole('alert')).toContainText('No hemos podido confirmar el alta')
      user = 'synthetic-user-b'
      await page.reload()
      await expect(page.getByRole('textbox', { name: 'Nombre de tu empresa' })).toBeVisible()
      user = 'synthetic-user-a'
      await page.reload()
      await expect(page.getByRole('alert')).toContainText('No hemos podido confirmar el alta')
      await info.attach(`onboarding-reload-${fault}-${width}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
      active = true
      await page.getByRole('button', { name: 'Comprobar acceso', exact: true }).focus()
      await page.keyboard.press('Enter')
      await expect.poll(() => page.evaluate(() => (window as unknown as { onboardingFixture: { redirects: string[] } }).onboardingFixture.redirects)).toEqual(['/dashboard'])
      expect(posts).toHaveLength(1)
      // The marker is removed only after the existing authenticated membership read.
      active = false
      await page.reload()
      await expect(page.getByRole('textbox', { name: 'Nombre de tu empresa' })).toBeVisible()
      expect(errors).toEqual([])
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    } finally { await page.unrouteAll({ behavior: 'ignoreErrors' }); await fixture.close() }
  })

  test(`onboarding unavailable browser storage prevents POST and recovers explicitly at ${width}`, async ({ page }) => {
    const fixture = await startOnboardingVerificationFixture(), posts: string[] = []
    await page.setViewportSize({ width, height: 960 })
    await page.route('**/fixture/**', route => route.fulfill({ json: route.request().url().endsWith('session')
      ? { data: { session: { user: { id: 'synthetic-user' } } }, error: null } : { data: [], error: null } }))
    await page.route('**/api/onboarding/workspace', async route => { posts.push(route.request().method()); await route.abort() })
    try {
      await page.goto(fixture.url)
      await page.getByRole('textbox', { name: 'Nombre de tu empresa' }).fill('Empresa sintética')
      await page.evaluate(() => {
        const original = Storage.prototype.setItem
        Object.assign(window, { restoreStorage: () => { Storage.prototype.setItem = original } })
        Storage.prototype.setItem = () => { throw new DOMException('SYNTHETIC_STORAGE_DENIED', 'SecurityError') }
      })
      await page.getByRole('button', { name: 'Crear y empezar', exact: true }).click()
      await expect(page.getByRole('alert')).toContainText('No podemos proteger la recuperación')
      expect(posts).toEqual([])
      await page.evaluate(() => (window as unknown as { restoreStorage: () => void }).restoreStorage())
      await page.getByRole('button', { name: 'Reintentar comprobación', exact: true }).click()
      await expect(page.getByRole('textbox', { name: 'Nombre de tu empresa' })).toBeVisible()
      expect(posts).toEqual([])
    } finally { await page.unrouteAll({ behavior: 'wait' }); await fixture.close() }
  })

  test(`onboarding explicit refusal releases only its browser interlock at ${width}`, async ({ page }) => {
    const fixture = await startOnboardingVerificationFixture(), posts: unknown[] = []
    await page.setViewportSize({ width, height: 960 })
    await page.route('**/fixture/**', route => route.fulfill({ json: route.request().url().endsWith('session')
      ? { data: { session: { user: { id: 'synthetic-user' } } }, error: null } : { data: [], error: null } }))
    await page.route('**/api/onboarding/workspace', async route => { posts.push(route.request().postDataJSON()); await route.fulfill({ status: 409, json: { error: 'Ese identificador de workspace ya está en uso.', code: 'slug_taken' } }) })
    try {
      await page.goto(fixture.url)
      await page.getByRole('textbox', { name: 'Nombre de tu empresa' }).fill('Empresa sintética')
      await page.getByRole('button', { name: 'Crear y empezar', exact: true }).click()
      await expect(page.getByText('Ese identificador de workspace ya está en uso.', { exact: true })).toBeVisible()
      await page.reload()
      await expect(page.getByRole('textbox', { name: 'Nombre de tu empresa' })).toBeVisible()
      expect(posts).toEqual([{ name: 'Empresa sintética' }])
    } finally { await page.unrouteAll({ behavior: 'wait' }); await fixture.close() }
  })
}

for (const mode of ['valid-receipt', 'unknown-refusal', 'storage-read', 'storage-noop'] as const) test(`onboarding reload interlock handles ${mode} conservatively`, async ({ page }) => {
  const fixture = await startOnboardingVerificationFixture(), posts: unknown[] = []
  await page.route('**/fixture/**', route => route.fulfill({ json: route.request().url().endsWith('session')
    ? { data: { session: { user: { id: 'synthetic-user' } } }, error: null } : { data: [], error: null } }))
  await page.route('**/api/onboarding/workspace', async route => {
    posts.push(route.request().postDataJSON())
    await route.fulfill(mode === 'unknown-refusal' ? { status: 418, json: { error: 'PRIVATE_UNRECOGNIZED_REFUSAL' } }
      : { status: 201, json: { workspace: { id: '50000000-0000-4000-8000-000000000001', name: 'Empresa sintética', slug: 'empresa-sintetica', role: 'owner', created: true } } })
  })
  if (mode === 'storage-read') await page.addInitScript(() => { Storage.prototype.getItem = () => { throw new DOMException('SYNTHETIC_DENIED', 'SecurityError') } })
  try {
    await page.goto(fixture.url)
    if (mode === 'storage-read') {
      await expect(page.getByRole('alert')).toContainText('No podemos proteger la recuperación')
      await expect(page.getByRole('button', { name: 'Crear y empezar', exact: true })).toHaveCount(0)
    } else {
      await page.getByRole('textbox', { name: 'Nombre de tu empresa' }).fill('Empresa sintética')
      if (mode === 'storage-noop') await page.evaluate(() => { Storage.prototype.setItem = () => {} })
      await page.getByRole('button', { name: 'Crear y empezar', exact: true }).click()
      if (mode === 'storage-noop') await expect(page.getByRole('alert')).toContainText('No podemos proteger la recuperación')
      else {
        if (mode === 'valid-receipt') await expect.poll(() => page.evaluate(() => (window as unknown as { onboardingFixture: { redirects: string[] } }).onboardingFixture.redirects)).toEqual(['/dashboard'])
        else {
          await expect(page.getByRole('alert')).toContainText('No hemos podido confirmar el alta')
          await expect(page.locator('body')).not.toContainText('PRIVATE_UNRECOGNIZED_REFUSAL')
        }
        await page.reload()
        // Even a canonical receipt is not a reason to offer a second creation
        // before the existing active-membership read confirms access.
        await expect(page.getByRole('alert')).toContainText('No hemos podido confirmar el alta')
        expect(posts).toHaveLength(1)
      }
    }
    if (mode.startsWith('storage')) expect(posts).toEqual([])
  } finally { await page.unrouteAll({ behavior: 'wait' }); await fixture.close() }
})
