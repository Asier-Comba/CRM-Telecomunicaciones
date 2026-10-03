import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'
import {
  filterCustomers,
  inPeriod,
  weekStart,
  addDays,
  calendarDate,
  customerHref,
} from '../../src/features/product/model.ts'
import {
  blankForm,
  validateDraft,
  validateExtraction,
} from '../../src/features/billing/model.ts'
import { parseInvoiceText } from '../../src/features/billing/parse.ts'
import { calculateInvoiceTotals } from '../../src/lib/invoicing/calc.ts'
import { buildInvoicePdfBytes } from '../../src/features/billing/pdf.ts'
const clients = [
  { id: 'cust_demo_bilbao_002', name: 'Bilbao Industrial Demo SL' },
  { id: 'cust_demo_norte_0001', name: 'Empresa Norte Telecom SL' },
  { id: 'cust_demo_norte_log_05', name: 'Norte Logística Demo SL' },
]
const rows = [
  {
    id: 'a',
    name: 'Órbita Servicios',
    tradeName: null,
    owner: 'A',
    status: 'active',
    lifecycle: 'customer',
    operators: ['V'],
    services: null,
    lines: null,
    renewal: null,
    permanence: '2026-10-03',
    opportunity: null,
    nextAction: null,
  },
  {
    id: 'b',
    name: 'Costa Servicios',
    tradeName: 'Costa',
    owner: 'B',
    status: 'inactive',
    lifecycle: 'former_customer',
    operators: ['X'],
    services: 0,
    lines: 0,
    renewal: '2026-10-15',
    permanence: null,
    opportunity: null,
    nextAction: 'Llamar',
  },
]
const filters = {
  query: '',
  status: '',
  owner: '',
  operator: '',
  attention: '',
}
test('customer filtering composes all dimensions, folds accents and retains unknown versus zero', () => {
  assert.deepEqual(
    filterCustomers(rows, {
      ...filters,
      query: 'orbita',
      status: 'active',
      owner: 'A',
      operator: 'V',
      attention: 'permanence',
    }).map((r) => r.id),
    ['a'],
  )
  assert.equal(
    filterCustomers(rows, { ...filters, query: 'orbita' })[0].services,
    null,
  )
  assert.equal(
    filterCustomers(rows, { ...filters, attention: 'renewal' })[0].services,
    0,
  )
  assert.equal(
    filterCustomers(rows, { ...filters, query: 'orbita', owner: 'B' }).length,
    0,
  )
  for (const id of ['../x', 'a/b', 'a?x', 'a#x', 'a%2f', 'a b', 'https://x'])
    assert.equal(customerHref(id), null)
  assert.equal(
    customerHref('cust_demo_norte_0001'),
    '/clients/cust_demo_norte_0001',
  )
})
test('periods and calendar preserve Madrid day, leap dates and Monday weeks', () => {
  assert.equal(inPeriod('2026-08-01', 'quarter', '2026-09-30'), true)
  assert.equal(inPeriod('2026-06-30', 'semester', '2026-09-30'), false)
  assert.equal(inPeriod('2026-07-01', 'semester', '2026-09-30'), true)
  for (const date of ['2026-02-30', '2026-13-01', 'malformed'])
    assert.equal(inPeriod(date, 'all', '2026-09-30'), false)
  assert.equal(weekStart('2026-09-30'), '2026-09-28')
  assert.equal(addDays('2024-02-28', 1), '2024-02-29')
  assert.equal(calendarDate('2026-09-30T23:30:00Z'), '2026-10-01')
})
test('invoice proposal retains amount, VAT, withholding, discount, due date and explicit ambiguity', () => {
  const r = parseInvoiceText(
    'Factura a Bilbao Industrial Demo SL por servicio telecom de 1.200 euros + IVA 21%, IRPF 15%, descuento 10%, vencimiento en 15 días, serie T',
    clients,
    '2026-09-30',
  )
  assert.equal(r.draft.clientId, 'cust_demo_bilbao_002')
  assert.equal(r.detected.amount, 1200)
  assert.equal(r.draft.items[0].taxRate, 21)
  assert.equal(r.draft.items[0].withholdingRate, 15)
  assert.equal(r.draft.items[0].discountRate, 10)
  assert.equal(r.draft.dueDate, '2026-10-15')
  assert.equal(r.draft.series, 'T')
  assert.deepEqual(calculateInvoiceTotals(r.draft.items), {
    subtotal: 1080,
    taxTotal: 226.8,
    withholdingTotal: 162,
    total: 1144.8,
  })
  const ambiguous = parseInvoiceText(
    'Factura a Norte por conectividad de 100 euros',
    clients,
  )
  assert.equal(ambiguous.draft.clientId, null)
  assert.ok(ambiguous.missingFields.includes('cliente'))
  assert.equal(ambiguous.detected.ambiguousClients.length, 2)
  const included = parseInvoiceText(
    'Factura a Bilbao Industrial Demo SL por conectividad de 121 euros IVA incluido',
    clients,
  )
  assert.equal(included.draft.items[0].unitPrice, 100)
  const foreign = parseInvoiceText(
    'Factura a Bilbao Industrial Demo SL por conectividad de 150 USD',
    clients,
  )
  assert.equal(foreign.draft.currency, 'USD')
  assert.equal(foreign.detected.amount, 150)
  assert.ok(
    validateDraft(
      foreign.draft,
      clients.map((c) => c.id),
    ).some((e) => e.includes('cambio')),
  )
})
test('invoice draft validation rejects fiscal, date, reference and numeric invalidity', () => {
  const form = blankForm()
  form.clientId = clients[0].id
  form.items[0].description = 'Conectividad'
  form.items[0].unitPrice = 100
  assert.deepEqual(
    validateDraft(
      form,
      clients.map((c) => c.id),
    ),
    [],
  )
  for (const patch of [
    { clientId: 'foreign' },
    { issueDate: '2026-02-30' },
    { dueDate: '2026-01-01' },
    { series: '../../' },
    { currency: 'fake' },
  ])
    assert.ok(
      validateDraft(
        { ...form, ...patch },
        clients.map((c) => c.id),
      ).length,
    )
  for (const value of [NaN, Infinity, -1, 10000001])
    assert.ok(
      validateDraft(
        { ...form, items: [{ ...form.items[0], unitPrice: value }] },
        clients.map((c) => c.id),
      ).length,
    )
  assert.ok(
    validateDraft(
      { ...form, items: [{ ...form.items[0], taxRate: 101 }] },
      clients.map((c) => c.id),
    ).length,
  )
})
test('local parser preserves calendar dates across DST and rejects invalid amounts', () => {
  const before = process.env.TZ
  try {
    for (const timezone of ['UTC', 'Europe/Madrid', 'America/New_York']) {
      process.env.TZ = timezone
      assert.equal(
        parseInvoiceText(
          'Factura por conectividad de 100 euros a fin de mes',
          clients,
          '2026-09-15',
        ).draft.dueDate,
        '2026-09-30',
      )
      assert.equal(
        parseInvoiceText(
          'Factura por conectividad de 100 euros a 2 días',
          clients,
          '2026-10-24',
        ).draft.dueDate,
        '2026-10-26',
      )
    }
  } finally {
    if (before === undefined) delete process.env.TZ
    else process.env.TZ = before
  }
  for (const amount of ['-100', '10000001', '1e9'])
    assert.equal(
      parseInvoiceText(`Factura por conectividad de ${amount} euros`, clients)
        .detected.amount,
      null,
    )
})
test('optional AI extraction is closed, bounded and cannot authorize emission', () => {
  const proposal = {
    customerId: clients[0].id,
    concept: 'Conectividad',
    amount: 100,
    vat: 21,
    withholding: 0,
    discount: 0,
    currency: 'EUR',
    dueDate: '2026-10-15',
  }
  assert.deepEqual(
    validateExtraction(
      proposal,
      clients.map((c) => c.id),
    ),
    proposal,
  )
  for (const attack of [
    null,
    [],
    { ...proposal, emit: true },
    { ...proposal, customerId: 'foreign' },
    { ...proposal, amount: Infinity },
    { ...proposal, dueDate: '2026-02-30' },
    { ...proposal, vat: 101 },
    Object.create(proposal),
    {
      ...proposal,
      currency: {
        toString() {
          throw Error('must not coerce')
        },
      },
    },
    { ...proposal, [Symbol('hidden')]: true },
    new Proxy(proposal, {
      getPrototypeOf() {
        throw Error('untrusted proxy')
      },
    }),
  ])
    assert.equal(
      validateExtraction(
        attack,
        clients.map((c) => c.id),
      ),
      null,
    )
  const accessor = { ...proposal }
  Object.defineProperty(accessor, 'concept', {
    get() {
      throw Error('must not read accessor')
    },
    enumerable: true,
  })
  assert.equal(
    validateExtraction(
      accessor,
      clients.map((c) => c.id),
    ),
    null,
  )
  const output = validateExtraction(
    proposal,
    clients.map((c) => c.id),
  )
  proposal.amount = 999
  assert.equal(output.amount, 100)
})
test('ported generic PDF creates a real local draft without property coupling', () => {
  const bytes = buildInvoicePdfBytes(
    {
      display: null,
      status: 'draft',
      issueDate: '2026-09-30',
      dueDate: null,
      currency: 'EUR',
      subtotal: 100,
      taxTotal: 21,
      withholdingTotal: 0,
      total: 121,
      notes: 'BORRADOR LOCAL NO EMITIDO',
      issuer: { legalName: 'Empresa Demo' },
      customer: { name: 'Cliente Demo' },
    },
    [],
  )
  const raw = new TextDecoder('latin1').decode(bytes)
  assert.ok(raw.startsWith('%PDF-'))
  assert.match(raw, /%%EOF/)
  assert.match(raw, /BORRADOR LOCAL NO EMITIDO/)
  assert.doesNotMatch(raw, /Inmueble|honorarios/)
})
async function sources(folder) {
  let all = []
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const p = `${folder}/${entry.name}`
    if (entry.isDirectory()) all.push(...(await sources(p)))
    else if (/\.tsx?$/.test(p)) all.push(p)
  }
  return all
}
test('all rebuilt modules omit legacy vocabulary and direct backend mutations', async () => {
  for (const path of await sources('src/features')) {
    const src = (await readFile(path, 'utf8'))
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
    assert.doesNotMatch(
      src,
      /inmueble|inmobiliari|gestor[ií]a|extranjer[ií]a|propietario|comprador|inquilino|vivienda|alquiler|honorarios/i,
      path,
    )
    assert.doesNotMatch(
      src,
      /invoice-repo|supabase-admin|triggerN8n|supabase\.(?:from|rpc)\(/,
      path,
    )
  }
  for (const path of [
    'portfolio',
    'facturacion',
    'settings',
    'inbox',
    'automations',
    'documents',
    'assistant',
  ])
    assert.match(
      await readFile(`src/app/(saas)/${path}/page.tsx`, 'utf8'),
      /if\s*\(!syntheticPreviewAllowed\(\)\)/,
      path,
    )
  const format = await readFile(
    'src/lib/telecom-preview/presentation.ts',
    'utf8',
  )
  assert.doesNotMatch(format, /from ['"]\.\/data/)
})
