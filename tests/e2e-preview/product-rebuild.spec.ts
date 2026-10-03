import { expect, test, type Page, type TestInfo } from '@playwright/test'
async function login(page: Page) {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Ver demo telecom' }).click()
  await expect(page).toHaveURL(/dashboard$/)
  await expect(
    page.getByRole('heading', { name: 'Dashboard telecom' }),
  ).toBeVisible()
  await page.waitForLoadState('networkidle')
}
async function capture(page: Page, info: TestInfo, name: string) {
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0)
  const main = page.locator('#main-content')
  await main.evaluate((node) => {
    node.scrollTop = 0
  })
  const path = info.outputPath(`${name}.png`)
  await page.screenshot({ path, fullPage: false })
  await info.attach(name, { path, contentType: 'image/png' })
  await main.evaluate((node) => {
    node.scrollTop = node.scrollHeight
  })
  const lower = info.outputPath(`${name}-lower.png`)
  await page.screenshot({ path: lower, fullPage: false })
  await info.attach(`${name}-lower`, { path: lower, contentType: 'image/png' })
  await main.evaluate((node) => {
    node.scrollTop = 0
  })
}
async function surface(page: Page) {
  await expect(page.locator('h1')).toHaveCount(1)
  await expect(page.locator('body')).not.toContainText(
    /inmueble|inmobiliari|propietario|honorarios|gestor[ií]a|extranjer[ií]a/i,
  )
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 2,
    ),
  ).toBe(true)
}
test('customer collection, partiality, keyboard tabs and global search', async ({
  page,
}, info) => {
  await login(page)
  await page.goto('/clients')
  const search = page.getByRole('textbox', { name: 'Buscar clientes' })
  await search.fill('Horizonte')
  await expect(
    page.getByRole('row').filter({ hasText: 'Horizonte Datos Parciales' }),
  ).toContainText('No disponible')
  await expect(
    page.getByRole('row').filter({ hasText: 'Horizonte Datos Parciales' }),
  ).not.toContainText('0 servicios')
  await search.fill('never-matches')
  await expect(
    page.getByText('No hay resultados con estos filtros.'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Limpiar filtros' }).click()
  await page
    .getByRole('combobox', { name: 'Atención', exact: true })
    .selectOption('renewal')
  await expect(
    page.getByRole('row').filter({ hasText: 'Empresa Norte Telecom SL' }),
  ).toBeVisible()
  await page.getByRole('checkbox', { name: 'Seleccionar página' }).check()
  await expect(page.getByText('1 seleccionados')).toBeVisible()
  await page
    .getByRole('combobox', { name: 'Atención', exact: true })
    .selectOption('')
  await expect(page.getByText('1 seleccionados')).toHaveCount(0)
  await page.getByRole('button', { name: 'Página siguiente' }).click()
  await expect(page.getByText(/página 2 de 2/)).toBeVisible()
  await page.getByRole('button', { name: 'Página anterior' }).click()
  await capture(page, info, 'clientes-rich')
  await page.goto('/clients/cust_demo_parcial_010')
  await expect(page.getByText('Cartera no disponible')).toBeVisible()
  await page.getByRole('tab', { name: 'Resumen', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(
    page.getByRole('tab', { name: 'Contactos', exact: true }),
  ).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('Contacto primario no disponible')).toBeVisible()
  await surface(page)
  await page.goto('/clients/cust_demo_norte_0001')
  await page.getByRole('link', { name: 'Consultar sobre este cliente' }).click()
  await expect(page.getByText('Cliente seleccionado')).toBeVisible()
  await expect(
    page.getByText('Empresa Norte Telecom SL', { exact: true }),
  ).toBeVisible()
  const global = page.getByRole('textbox', { name: 'Búsqueda global' })
  await global.fill('Fibra sede')
  await page.getByRole('link', { name: /Fibra sede principal/ }).click()
  await expect(page).toHaveURL(/clients\/cust_demo_norte_0001$/)
  await surface(page)
})
test('portfolio drill-down, pipeline and actual calendar navigation', async ({
  page,
}, info) => {
  await login(page)
  await page.goto('/portfolio')
  await page.getByRole('tab', { name: 'Líneas', exact: true }).click()
  await expect(page.getByText('Identificador oculto').first()).toBeVisible()
  await page.getByRole('textbox', { name: 'Buscar en cartera' }).fill('Bilbao')
  await page.getByRole('button', { name: 'Ver detalle' }).click()
  await expect(page.getByRole('dialog')).toContainText(
    'Bilbao Industrial Demo SL',
  )
  await page.getByRole('button', { name: 'Cerrar panel' }).click()
  await capture(page, info, 'cartera-telecom')
  await surface(page)
  await page.goto('/opportunities')
  expect((await page.getByRole('textbox', { name: 'Buscar oportunidades' }).boundingBox())!.width).toBeGreaterThan(180)
  await page
    .getByRole('button', { name: /Migración de conectividad y móvil/ })
    .click()
  await expect(
    page.getByRole('button', { name: 'Cambiar etapa' }),
  ).toBeDisabled()
  await expect(page.getByRole('dialog')).toContainText('Cierre previsto')
  await page.getByRole('button', { name: 'Cerrar panel' }).click()
  await page.getByRole('button', { name: 'Vista lista' }).click()
  await expect(
    page.getByRole('button', { name: /Ampliación de líneas/ }),
  ).toBeVisible()
  await capture(page, info, 'oportunidades')
  await surface(page)
  await page.goto('/calendar')
  await page.getByRole('button', { name: 'Mes', exact: true }).click()
  await page.getByRole('button', { name: 'Mes siguiente', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'octubre de 2026' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Hoy', exact: true }).click()
  await page.getByRole('button', { name: 'Semana', exact: true }).click()
  await page
    .getByRole('button', { name: /16:00.*Reunión de propuesta telecom/ })
    .first()
    .click()
  await expect(page.getByRole('dialog')).toContainText('Comercial Demo B')
  await expect(
    page.getByRole('button', { name: 'Cancelar cita', exact: true }),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Cerrar panel' }).click()
  await page.getByRole('button', { name: 'Agenda', exact: true }).click()
  await expect(
    page.getByRole('button', { name: /Revisar renovación/ }).first(),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Semana', exact: true }).click()
  await capture(page, info, 'calendario')
  await surface(page)
})
test('fiscal identity, deterministic proposal, reviewed draft, PDF and controlled local trash', async ({
  page,
}, info) => {
  await login(page)
  await page.goto('/settings')
  await page
    .getByRole('textbox', { name: 'Razón social', exact: true })
    .fill('Emisor Sintético de Prueba')
  await page.getByRole('button', { name: 'Guardar en esta sesión' }).click()
  await expect(page.getByRole('status')).toContainText(
    'Cambios locales guardados',
  )
  await page.getByRole('tab', { name: 'Datos fiscales' }).click()
  await expect(page.getByRole('textbox', { name: 'NIF / CIF' })).toHaveValue('')
  await capture(page, info, 'settings')
  await surface(page)
  // Client-side navigation retains only this session's CompanyForm.
  const menu = page.getByRole('button', { name: /Abrir menú de navegación/ })
  if (await menu.isVisible()) await menu.click()
  await page
    .getByRole('link', { name: 'Facturación PRO', exact: true })
    .filter({ visible: true })
    .click()
  await page
    .getByRole('textbox', { name: 'Descripción de la factura' })
    .fill(
      'Factura a Bilbao Industrial Demo SL por conectividad de 1.200 euros + IVA 21%, IRPF 15%, descuento 10%, vencimiento en 15 días',
    )
  await page.getByRole('button', { name: 'Generar propuesta' }).click()
  await expect(page.getByRole('dialog')).toContainText(
    'Emisor Sintético de Prueba',
  )
  await expect(
    page.getByRole('combobox', { name: 'Cliente de factura' }),
  ).toHaveValue('cust_demo_bilbao_002')
  await expect(page.getByRole('spinbutton', { name: 'Precio 1' })).toHaveValue(
    '1200',
  )
  await expect(page.getByRole('dialog')).toContainText(/1\.?144,80/)
  await expect(
    page.getByRole('button', { name: 'Emitir factura', exact: true }),
  ).toBeDisabled()
  await expect(
    page.getByRole('button', { name: 'Guardar borrador local' }),
  ).toBeDisabled()
  await page.getByRole('checkbox', { name: /He revisado cliente/ }).check()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'PDF de borrador' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('Borrador_local_no_emitido.pdf')
  await download.saveAs(info.outputPath(download.suggestedFilename()))
  await page.getByRole('button', { name: 'Guardar borrador local' }).click()
  await expect(
    page.getByRole('row').filter({ hasText: 'Bilbao Industrial Demo SL' }),
  ).toContainText(/1\.?144,80/)
  await capture(page, info, 'facturacion')
  await surface(page)
  await page.getByRole('button', { name: 'Papelera', exact: true }).click()
  await page
    .getByRole('combobox', { name: 'Ámbito de facturas' })
    .selectOption('trash')
  await page.getByRole('button', { name: 'Restaurar', exact: true }).click()
  await page
    .getByRole('combobox', { name: 'Ámbito de facturas' })
    .selectOption('active')
  await expect(
    page.getByRole('row').filter({ hasText: 'Bilbao Industrial Demo SL' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Papelera', exact: true }).click()
  await page
    .getByRole('combobox', { name: 'Ámbito de facturas' })
    .selectOption('trash')
  await page
    .getByRole('button', { name: 'Eliminar local', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Eliminar borrador de prueba' }),
  ).toBeDisabled()
  await page
    .getByRole('textbox', { name: 'Confirmación de borrado local' })
    .fill('BORRAR')
  await page
    .getByRole('button', { name: 'Eliminar borrador de prueba' })
    .click()
  await expect(
    page.getByRole('row').filter({ hasText: 'Bilbao Industrial Demo SL' }),
  ).toHaveCount(0)
})
test('disconnected modules stay honest and assistant error/cancel cannot resurrect output', async ({
  page,
}) => {
  const external: string[] = []
  page.on('request', (r) => {
    if (!['localhost', '127.0.0.1'].includes(new URL(r.url()).hostname))
      external.push(r.url())
  })
  await login(page)
  await page.goto('/inbox')
  await expect(
    page.getByRole('button', { name: 'Enviar mensaje' }),
  ).toBeDisabled()
  await page
    .getByRole('textbox', { name: 'Borrador de respuesta' })
    .fill('Respuesta de prueba')
  await surface(page)
  await page.goto('/automations')
  await page.getByRole('button', { name: 'Ver condiciones' }).first().click()
  await expect(
    page.getByRole('button', { name: 'Ejecutar flujo' }),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Cerrar panel' }).click()
  await surface(page)
  await page.goto('/documents')
  await expect(
    page.getByRole('button', { name: 'Subir documento' }),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Portabilidad', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Portabilidad', exact: true }),
  ).toBeVisible()
  await surface(page)
  await page.goto('/assistant')
  await page.route('**/api/assistant/read-preview', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ forged: true }),
    })
  })
  await page
    .getByRole('button', { name: 'Dame el resumen del día', exact: true })
    .click()
  const assistantError = page
    .getByRole('alert')
    .filter({ hasText: 'No puedo consultar los datos ahora.' })
  await expect(assistantError).toContainText(
    'No puedo consultar los datos ahora.',
  )
  await page
    .getByRole('textbox', { name: 'Consulta al asistente' })
    .fill('Resume Norte Telecom')
  await page
    .getByRole('textbox', { name: 'Consulta al asistente' })
    .press('Enter')
  await page.getByRole('button', { name: 'Cancelar consulta' }).click()
  await expect(page.getByText('Consulta cancelada.')).toBeVisible()
  await expect(assistantError).toHaveCount(1)
  expect(external).toEqual([])
})
