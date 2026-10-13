import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import Module, { createRequire } from 'node:module'
import { resolve, dirname, extname } from 'node:path'
import test from 'node:test'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const root = resolve(import.meta.dirname, '../..')
const modules = new Map()

// Compile the actual components and their actual imports for real React SSR.
// Resolution is scoped to each module; no global loader or component mocks.
function load(filename) {
  filename = resolve(filename)
  if (!extname(filename)) filename = ['.ts', '.tsx', '.js'].map(extension => filename + extension).find(existsSync) ?? filename
  if (modules.has(filename)) return modules.get(filename).exports
  const componentModule = new Module(filename)
  componentModule.filename = filename
  componentModule.paths = [...Module._nodeModulePaths(dirname(filename)), ...Module.globalPaths]
  modules.set(filename, componentModule)
  const externalRequire = componentModule.require.bind(componentModule)
  componentModule.require = name => name.startsWith('@/') ? load(resolve(root, 'src', name.slice(2))) : name.startsWith('.') ? load(resolve(dirname(filename), name)) : externalRequire(name)
  const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } })
  componentModule._compile(compiled.outputText, filename)
  return componentModule.exports
}

const { Calendar } = load(resolve(root, 'src/features/calendar/Calendar.tsx'))
const { IntegratedCalendar } = load(resolve(root, 'src/features/calendar/IntegratedCalendar.tsx'))
const { ProductProvider } = load(resolve(root, 'src/features/product/integration/Provider.tsx'))
function render(child) {
  return renderToStaticMarkup(React.createElement(ProductProvider, { integrated: false, role: 'owner' }, child))
}
function selectedDay(html, expected, previous) {
  assert.match(html, new RegExp('aria-label="Ir al ' + expected + '" aria-pressed="true"'))
  assert.equal((html.match(/aria-label="Ir al [^"]+" aria-pressed="true"/g) ?? []).length, 1)
  if (previous) assert.doesNotMatch(html, new RegExp('aria-label="Ir al ' + previous + '" aria-pressed="true"'))
}

for (const [name, asOf, expected, previous] of [
  ['Madrid Monday after summer midnight', '2026-10-04T22:30:00Z', '2026-10-05', '2026-10-04'],
  ['Sunday before Madrid midnight', '2026-10-04T21:30:00Z', '2026-10-04', '2026-10-05'],
  ['summer month boundary', '2026-06-30T22:30:00Z', '2026-07-01', '2026-06-30'],
  ['winter year boundary', '2026-12-31T23:30:00Z', '2027-01-01', '2026-12-31'],
  ['winter leap-day boundary', '2028-02-28T23:30:00Z', '2028-02-29', '2028-02-28'],
  ['civil date remains its literal day', '2026-10-04', '2026-10-04', '2026-10-05'],
]) {
  test('actual calendar initial selection: ' + name, () => {
    selectedDay(render(React.createElement(Calendar, { entries: [], asOf })), expected, previous)
  })
}

test('actual integrated calendar renders Madrid Monday with its real provider and controlled clock', () => {
  const OriginalDate = globalThis.Date
  const instant = '2026-10-04T22:30:00Z'
  class CalendarDate extends OriginalDate {
    constructor(...args) { super(...(args.length ? args : [instant])) }
    static now() { return new OriginalDate(instant).getTime() }
  }
  try {
    globalThis.Date = CalendarDate
    selectedDay(render(React.createElement(IntegratedCalendar)), '2026-10-05', '2026-10-04')
  } finally {
    globalThis.Date = OriginalDate
  }
  assert.equal(globalThis.Date, OriginalDate)
})
