#!/usr/bin/env node

import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const migrationsDir = path.join(root, 'supabase', 'migrations')
const legacyMigrationsDir = path.join(root, 'supabase', 'legacy-migrations')
const sourceDir = path.join(root, 'src')
const docsDir = path.join(root, 'docs')
const strict = process.argv.includes('--strict')
const json = process.argv.includes('--json')

const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx'])
const MIGRATION_EXTENSION = '.sql'

async function walk(directory, include) {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') return []
    throw error
  }
  const files = []

  for (const entry of entries) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walk(absolute, include))
    else if (entry.isFile() && include(absolute)) files.push(absolute)
  }

  return files.sort()
}

function collectMatches(text, regex, group = 1) {
  const values = new Set()
  for (const match of text.matchAll(regex)) values.add(match[group].toLowerCase())
  return values
}

function addEvidence(target, object, file) {
  const existing = target.get(object) ?? new Set()
  existing.add(path.relative(root, file))
  target.set(object, existing)
}

const migrationFiles = await walk(
  migrationsDir,
  (file) => path.extname(file) === MIGRATION_EXTENSION,
)
const sourceFiles = await walk(
  sourceDir,
  (file) => SOURCE_EXTENSIONS.has(path.extname(file)),
)
const historicalSqlFiles = (await Promise.all(
  [docsDir, legacyMigrationsDir].map((directory) => walk(
    directory,
    (file) => path.extname(file) === MIGRATION_EXTENSION,
  )),
)).flat().sort()

const createdRelations = new Set()
const createdFunctions = new Set()
const historicalRelations = new Map()
const historicalFunctions = new Map()
const migrationReferences = new Map()
const sourceRelations = new Map()
const sourceFunctions = new Map()

for (const file of migrationFiles) {
  const sql = await readFile(file, 'utf8')

  for (const relation of collectMatches(
    sql,
    /create\s+(?:or\s+replace\s+)?(?:table|view|materialized\s+view)\s+(?:if\s+not\s+exists\s+)?(?:public\.)?["']?([a-z_][a-z0-9_]*)["']?/gi,
  )) createdRelations.add(relation)

  for (const fn of collectMatches(
    sql,
    /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?["']?([a-z_][a-z0-9_]*)["']?/gi,
  )) createdFunctions.add(fn)

  const referenced = new Set([
    ...collectMatches(sql, /alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:public\.)?["']?([a-z_][a-z0-9_]*)["']?/gi),
    ...collectMatches(sql, /grant[\s\S]{0,180}?\bon\s+table\s+(?:public\.)?["']?([a-z_][a-z0-9_]*)["']?/gi),
  ])

  for (const relation of referenced) addEvidence(migrationReferences, relation, file)
}

for (const file of historicalSqlFiles) {
  const sql = await readFile(file, 'utf8')

  for (const relation of collectMatches(
    sql,
    /create\s+(?:or\s+replace\s+)?(?:table|view|materialized\s+view)\s+(?:if\s+not\s+exists\s+)?(?:public\.)?["']?([a-z_][a-z0-9_]*)["']?/gi,
  )) addEvidence(historicalRelations, relation, file)

  for (const fn of collectMatches(
    sql,
    /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?["']?([a-z_][a-z0-9_]*)["']?/gi,
  )) addEvidence(historicalFunctions, fn, file)
}

for (const file of sourceFiles) {
  const source = await readFile(file, 'utf8')
  for (const relation of collectMatches(source, /\.from\(\s*['"]([a-z_][a-z0-9_]*)['"]\s*\)/gi)) {
    addEvidence(sourceRelations, relation, file)
  }
  for (const fn of collectMatches(source, /\.rpc\(\s*['"]([a-z_][a-z0-9_]*)['"]/gi)) {
    addEvidence(sourceFunctions, fn, file)
  }
}

const referencedRelations = new Set([
  ...migrationReferences.keys(),
  ...sourceRelations.keys(),
])
const missingRelations = [...referencedRelations]
  .filter((relation) => !createdRelations.has(relation))
  .sort()
const missingFunctions = [...sourceFunctions.keys()]
  .filter((fn) => !createdFunctions.has(fn))
  .sort()

const classifyMissing = (names, historicalDefinitions) => ({
  historicalOnly: names
    .filter((name) => historicalDefinitions.has(name))
    .map((name) => ({
      name,
      evidence: evidenceFor(name),
      historicalDefinitions: [...historicalDefinitions.get(name)].sort(),
    })),
  unresolved: names
    .filter((name) => !historicalDefinitions.has(name))
    .map((name) => ({ name, evidence: evidenceFor(name) })),
})

const evidenceFor = (name) => [...new Set([
  ...(migrationReferences.get(name) ?? []),
  ...(sourceRelations.get(name) ?? []),
  ...(sourceFunctions.get(name) ?? []),
])].sort()

const relationClassification = classifyMissing(missingRelations, historicalRelations)
const functionClassification = classifyMissing(missingFunctions, historicalFunctions)

const report = {
  migrationFiles: migrationFiles.length,
  sourceFiles: sourceFiles.length,
  historicalSqlFiles: historicalSqlFiles.length,
  createdRelations: [...createdRelations].sort(),
  createdFunctions: [...createdFunctions].sort(),
  missingRelations: missingRelations.map((name) => ({ name, evidence: evidenceFor(name) })),
  missingFunctions: missingFunctions.map((name) => ({ name, evidence: evidenceFor(name) })),
  historicalOnlyRelations: relationClassification.historicalOnly,
  unresolvedRelations: relationClassification.unresolved,
  historicalOnlyFunctions: functionClassification.historicalOnly,
  unresolvedFunctions: functionClassification.unresolved,
  reproducible: missingRelations.length === 0 && missingFunctions.length === 0,
}

if (json) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
} else {
  console.log('Supabase reproducibility audit')
  console.log(`- migrations scanned: ${report.migrationFiles}`)
  console.log(`- source files scanned: ${report.sourceFiles}`)
  console.log(`- historical SQL files scanned (non-canonical): ${report.historicalSqlFiles}`)
  console.log(`- relations created by migrations: ${report.createdRelations.length}`)
  console.log(`- functions created by migrations: ${report.createdFunctions.length}`)
  console.log(`- missing relations/views: ${report.missingRelations.length}`)
  console.log(`- missing RPC functions: ${report.missingFunctions.length}`)
  console.log(`- missing relations with historical DDL: ${report.historicalOnlyRelations.length}`)
  console.log(`- missing relations without tracked DDL found: ${report.unresolvedRelations.length}`)
  console.log(`- missing RPCs with historical DDL: ${report.historicalOnlyFunctions.length}`)
  console.log(`- missing RPCs without tracked DDL found: ${report.unresolvedFunctions.length}`)

  for (const item of [...report.historicalOnlyRelations, ...report.historicalOnlyFunctions]) {
    console.log(`  - ${item.name} [historical DDL only]`)
    for (const file of item.historicalDefinitions) console.log(`      definition: ${file}`)
    for (const file of item.evidence.slice(0, 5)) console.log(`      usage: ${file}`)
    if (item.evidence.length > 5) console.log(`      ... ${item.evidence.length - 5} more usages`)
  }

  for (const item of [...report.unresolvedRelations, ...report.unresolvedFunctions]) {
    console.log(`  - ${item.name} [no tracked DDL found]`)
    for (const file of item.evidence.slice(0, 5)) console.log(`      ${file}`)
    if (item.evidence.length > 5) console.log(`      ... ${item.evidence.length - 5} more`)
  }

  console.log(report.reproducible
    ? 'RESULT: reproducible from versioned migrations'
    : 'RESULT: drift detected; a clean database is not reproducible from versioned migrations')
}

if (strict && !report.reproducible) process.exitCode = 1
