import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url), ts = require('typescript')
const source = readFileSync(new URL('../../src/features/billing/PrivateInvoicePdf.tsx', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
const flush = () => new Promise(resolve => setImmediate(resolve))
class ProductUiError extends Error { constructor(code) { super('closed-safe-error'); this.code = code } }
function mount(repository) {
  const values = [], effects = [], jobs = []
  let index, tree, currentRepository = repository
  const element = (type, props) => ({ type, props })
  const dependencies = {
    react: {
      useState: initial => { const slot = index++; if (!(slot in values)) values[slot] = initial; return [values[slot], next => { values[slot] = typeof next === 'function' ? next(values[slot]) : next }] },
      useRef: initial => { const slot = index++; return values[slot] ??= { current: initial } },
      useEffect: (effect, deps) => { const slot = index++, previous = effects[slot]; if (!previous || deps.some((d, i) => d !== previous.deps[i])) { previous?.cleanup?.(); effects[slot] = { deps }; jobs.push(() => { effects[slot].cleanup = effect() }) } },
    },
    'react/jsx-runtime': { jsx: element, jsxs: element },
    '@/features/product/integration/Provider': { useProduct: () => ({ repository: currentRepository }) },
    '@/features/product/integration/repository': { ProductUiError, safeMessage: () => 'closed-safe-error' },
    '@/features/product/ui': { control: 'synthetic-control' },
  }
  const fixtureModule = { exports: {} }
  new Function('require', 'module', 'exports', compiled)(name => { assert.ok(Object.hasOwn(dependencies, name)); return dependencies[name] }, fixtureModule, fixtureModule.exports)
  const invoice = { id: 'synthetic-invoice', version: 1, status: 'issued' }
  function render(change = {}) { Object.assign(invoice, change); index = 0; tree = fixtureModule.exports.PrivateInvoicePdf({ invoice, onReload: async () => {} }); while (jobs.length) jobs.shift()(); return tree }
  function nodes(node = tree) { if (!node || typeof node !== 'object') return []; if (Array.isArray(node)) return node.flatMap(nodes); return [node, ...nodes(node.props?.children)] }
  return { render, nodes, repository: value => { currentRepository = value }, button: text => nodes().find(n => n.type === 'button' && n.props.children === text), dispose: () => effects.forEach(e => e?.cleanup?.()) }
}
const reference = { invoice_id: 'synthetic-invoice', version: 1, document_status: 'active' }

test('a changed invoice version hides the old PDF reference until the new read completes', async () => {
  let release, reads = 0
  const repository = { privateInvoiceReference: async () => { if (++reads === 1) return reference; return new Promise(resolve => { release = resolve }) } }
  const f = mount(repository)
  try {
    f.render(); await flush(); f.render(); assert.ok(f.button('Descargar PDF fiscal privado'))
    f.render({ version: 2 }); assert.equal(f.button('Descargar PDF fiscal privado'), undefined)
    assert.equal(f.button('Conservar PDF fiscal privado'), undefined)
    release(null); await flush(); f.render(); assert.ok(f.button('Conservar PDF fiscal privado')); assert.equal(reads, 2)
  } finally { f.dispose(); release?.(null) }
})

test('a changed repository cannot render a previous principal PDF reference', async () => {
  let release
  const f = mount({ privateInvoiceReference: async () => reference })
  try {
    f.render(); await flush(); f.render(); assert.ok(f.button('Descargar PDF fiscal privado'))
    f.repository({ privateInvoiceReference: () => new Promise(resolve => { release = resolve }) })
    f.render(); assert.equal(f.button('Descargar PDF fiscal privado'), undefined)
    release(null); await flush(); f.render(); assert.ok(f.button('Conservar PDF fiscal privado'))
  } finally { f.dispose(); release?.(null) }
})

test('a denied fresh read retains only a safe alert and no stale PDF download or persist control', async () => {
  let reads = 0
  const f = mount({ privateInvoiceReference: async () => { if (++reads === 1) return reference; throw new ProductUiError('access_denied') } })
  try {
    f.render(); await flush(); f.render(); assert.ok(f.button('Descargar PDF fiscal privado'))
    f.render({ version: 2 }); await flush(); f.render()
    assert.ok(f.nodes().some(n => n.props?.role === 'alert'))
    assert.equal(f.button('Descargar PDF fiscal privado'), undefined)
    assert.equal(f.button('Conservar PDF fiscal privado'), undefined)
    assert.equal(reads, 2)
  } finally { f.dispose() }
})

test('an earlier disposed read cannot replace the current version reference', async () => {
  let release, reads = 0
  const f = mount({ privateInvoiceReference: () => ++reads === 1 ? new Promise(resolve => { release = resolve }) : Promise.resolve(null) })
  try {
    f.render(); f.render({ version: 2 }); await flush(); f.render(); assert.ok(f.button('Conservar PDF fiscal privado'))
    release(reference); await flush(); f.render()
    assert.equal(f.button('Descargar PDF fiscal privado'), undefined); assert.ok(f.button('Conservar PDF fiscal privado')); assert.equal(reads, 2)
  } finally { f.dispose(); release?.(null) }
})

test('an uncertain conservation still retries the exact original command and version', async () => {
  const commands = []; let reads = 0
  const f = mount({
    privateInvoiceReference: async () => { reads++; return null },
    persistPrivateInvoice: async command => { commands.push(command); if (commands.length === 1) throw new ProductUiError('transport_uncertain') },
  })
  try {
    f.render(); await flush(); f.render(); f.button('Conservar PDF fiscal privado').props.onClick()
    await flush(); f.render(); assert.ok(f.button('Reintentar conservación'))
    f.button('Reintentar conservación').props.onClick(); await flush(); f.render(); await flush(); f.render()
    assert.equal(commands.length, 2); assert.equal(commands[0], commands[1])
    assert.equal(commands[0].id, 'synthetic-invoice'); assert.equal(commands[0].expected_version, 1)
    assert.equal(commands[0].expected_artifact_version, 0); assert.match(commands[0].command_id, /^[0-9a-f-]{36}$/)
    assert.equal(reads, 2)
  } finally { f.dispose() }
})

test('a current not-found reference permits conservation without inventing a stored PDF', async () => {
  const f = mount({ privateInvoiceReference: async () => { throw new ProductUiError('not_found') } })
  try {
    f.render(); assert.equal(f.button('Conservar PDF fiscal privado'), undefined)
    await flush(); f.render(); assert.ok(f.button('Conservar PDF fiscal privado'))
    assert.equal(f.button('Descargar PDF fiscal privado'), undefined)
    assert.equal(f.nodes().some(n => n.props?.role === 'alert'), false)
  } finally { f.dispose() }
})
