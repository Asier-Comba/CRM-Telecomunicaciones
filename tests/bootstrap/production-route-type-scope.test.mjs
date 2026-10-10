import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, unlinkSync, rmdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import Module, { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const { PHASE_PRODUCTION_BUILD, PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_SERVER } = require('next/constants')
const root = resolve(import.meta.dirname, '../..')
const base = JSON.parse(readFileSync(join(root, 'tsconfig.json'), 'utf8'))
const build = JSON.parse(readFileSync(join(root, 'tsconfig.build.json'), 'utf8'))

function fixture(run) {
  const directory = mkdtempSync(join(tmpdir(), 'crm-route-types-'))
  const files = ['tsconfig.json', 'tsconfig.build.json', 'src/page.ts', 'tests/case.ts', '.next/types/validator.ts', '.next/dev/types/validator.ts']
  const directories = ['src', 'tests', '.next', '.next/types', '.next/dev', '.next/dev/types']
  try {
    for (const name of directories) mkdirSync(join(directory, name))
    // Keep every inherited strictness option. Limit ambient package discovery
    // only in this disposable compiler fixture; no project configuration changes.
    writeFileSync(join(directory, 'tsconfig.json'), JSON.stringify({ ...base, compilerOptions: { ...base.compilerOptions, types: [], incremental: false } }))
    writeFileSync(join(directory, 'tsconfig.build.json'), JSON.stringify(build))
    writeFileSync(join(directory, 'src/page.ts'), 'export const page: string = "ok"\n')
    writeFileSync(join(directory, 'tests/case.ts'), 'export const testCase: number = 1\n')
    writeFileSync(join(directory, '.next/types/validator.ts'), 'import { page } from "../../src/page"; const valid: string = page; export { valid }\n')
    writeFileSync(join(directory, '.next/dev/types/validator.ts'), 'export const generated = "unterminated\n')
    function check(config) {
      const name = join(directory, config)
      const parsed = ts.getParsedCommandLineOfConfigFile(name, {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: diagnostic => { throw new Error(String(diagnostic.code)) } })
      assert.ok(parsed)
      assert.equal(parsed.errors.length, 0)
      const program = ts.createProgram(parsed.fileNames, parsed.options)
      return { files: parsed.fileNames.map(name => name.replaceAll('\\', '/').slice(directory.replaceAll('\\', '/').length + 1)), diagnostics: ts.getPreEmitDiagnostics(program).map(diagnostic => ({ code: diagnostic.code, file: diagnostic.file?.fileName.replaceAll('\\', '/').slice(directory.replaceAll('\\', '/').length + 1) })) }
    }
    run({ directory, check })
  } finally {
    // Delete only enumerated files we created, followed by their empty dirs.
    // No recursive deletion, shared cache, generated project file or source edit.
    for (const name of files) unlinkSync(join(directory, name))
    for (const name of [...directories].reverse()) rmdirSync(join(directory, name))
    rmdirSync(directory)
  }
}

test('actual Next configuration separates production-build types while development retains its validator', () => {
  const name = join(root, 'next.config.ts')
  const compiled = ts.transpileModule(readFileSync(name, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 } }).outputText
  const configModule = new Module(name)
  configModule.filename = name
  configModule.paths = Module._nodeModulePaths(root)
  configModule._compile(compiled, name)
  const config = configModule.exports.default
  assert.equal(config(PHASE_PRODUCTION_BUILD).typescript.tsconfigPath, 'tsconfig.build.json')
  assert.equal(config(PHASE_DEVELOPMENT_SERVER).typescript, undefined)
  assert.equal(config(PHASE_PRODUCTION_SERVER).typescript, undefined)
  assert.equal(config(PHASE_PRODUCTION_BUILD).typescript.ignoreBuildErrors, undefined)
  assert.deepEqual(build, { extends: './tsconfig.json', exclude: ['node_modules', '.next/dev'] })
})

test('real compiler reproduces stale development syntax failure and checks fresh production validators without altering that file', () => fixture(({ directory, check }) => {
  const dev = join(directory, '.next/dev/types/validator.ts')
  const before = readFileSync(dev, 'utf8')
  assert.ok(check('tsconfig.json').diagnostics.some(d => d.code === 1002 && d.file === '.next/dev/types/validator.ts'))
  const production = check('tsconfig.build.json')
  assert.deepEqual(production.diagnostics, [])
  for (const path of ['src/page.ts', 'tests/case.ts', '.next/types/validator.ts']) assert.ok(production.files.includes(path), path)
  assert.ok(!production.files.some(path => path.startsWith('.next/dev/')))
  assert.equal(readFileSync(dev, 'utf8'), before)
}))

test('production generated-validator syntax errors still fail the real compiler', () => fixture(({ directory, check }) => {
  writeFileSync(join(directory, '.next/types/validator.ts'), 'export const generated = "unterminated\n')
  assert.ok(check('tsconfig.build.json').diagnostics.some(d => d.code === 1002 && d.file === '.next/types/validator.ts'))
}))

for (const path of ['src/page.ts', 'tests/case.ts']) {
  test(`production keeps inherited strict checks for ${path}`, () => fixture(({ directory, check }) => {
    writeFileSync(join(directory, path), 'export const invalid: string = 123\n')
    assert.ok(check('tsconfig.build.json').diagnostics.some(d => d.code === 2322 && d.file === path))
  }))
}
