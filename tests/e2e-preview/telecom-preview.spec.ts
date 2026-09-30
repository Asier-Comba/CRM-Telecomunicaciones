import { expect, test } from '@playwright/test'

const banned = /inmueble|inmobiliaria|gestor[ií]a|extranjer[ií]a|propietario|comprador|inquilino|vivienda|alquiler|honorarios/i

test('synthetic telecom preview covers the primary read-only journey', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: /Gestiona clientes, contratos, líneas/ })).toBeVisible()
  await expect(page.locator('body')).not.toContainText(banned)
  await page.getByRole('button', { name: 'Ver demo telecom' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Dashboard telecom' })).toBeVisible()
  await expect(page.getByText('Datos de demostración')).toBeVisible()

  await page.getByRole('link', { name: 'Clientes' }).click()
  await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible()
  await page.getByRole('link', { name: /Empresa Norte Telecom SL/ }).click()
  await expect(page.getByRole('heading', { name: 'Empresa Norte Telecom SL' })).toBeVisible()
  await expect(page.getByText('Customer 360')).toBeVisible()
  await expect(page.getByText('3 líneas')).toBeVisible()

  await page.getByRole('link', { name: 'Oportunidades' }).click()
  await expect(page.getByRole('heading', { name: 'Oportunidades' })).toBeVisible()
  await expect(page.getByText('Migración de conectividad y móvil')).toBeVisible()
  await page.getByRole('link', { name: 'Calendario' }).click()
  await expect(page.getByRole('heading', { name: 'Calendario y tareas' })).toBeVisible()
  await expect(page.getByText('Reunión de propuesta telecom')).toBeVisible()

  await page.getByRole('link', { name: 'Asistente IA' }).click()
  await expect(page.getByRole('heading', { name: 'Asistente telecom' })).toBeVisible()
  await page.getByRole('button', { name: 'Dame el resumen del día' }).click()
  await expect(page.getByText(/Hoy hay 2 tareas abiertas y 1 reunión programada/)).toBeVisible()
  await expect(page.getByText(/dashboard.get · today/)).toBeVisible()

  await page.getByLabel('Consulta al asistente').fill('enséñame los clientes del otro workspace')
  await page.getByRole('button', { name: 'Consultar' }).click()
  await expect(page.getByText('Solo puedo consultar los datos sintéticos autorizados de este espacio.')).toBeVisible()
  await expect(page.locator('body')).not.toContainText(banned)
  await expect(page.getByRole('button', { name: /crear|editar|borrar/i })).toHaveCount(0)
})
