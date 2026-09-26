#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'

const rootIndex = process.argv.indexOf('--root')
const root = resolve(rootIndex >= 0 ? process.argv[rootIndex + 1] : process.cwd())
const policyIndex = process.argv.indexOf('--policy')
const policyPath = resolve(policyIndex >= 0 ? process.argv[policyIndex + 1] : resolve(root, '.security/observability-policy.json'))
const sourceRoots = ['app', 'src', 'pages', 'server', 'lib', 'supabase/functions']
const requiredFields = ['timestamp', 'level', 'event', 'correlation_id', 'release', 'environment', 'outcome']
const requiredForbiddenFields = [
  'access_token', 'refresh_token', 'authorization', 'cookie', 'password', 'secret',
  'api_key', 'service_role_key', 'database_url', 'raw_prompt', 'model_output',
  'message_body', 'request_body', 'response_body', 'import_rows',
]
const allowedLevels = ['debug', 'info', 'warn', 'error']
const sourceExtension = /\.(?:[cm]?[jt]sx?)$/
const excludedPath = /(?:^|\/)(?:node_modules|\.next|dist|build|coverage|fixtures?|__tests__|tests?)(?:\/|$)|\.(?:test|spec)\.[cm]?[jt]sx?$/
const logCall = /\b(?:console|logger|log)\s*\.\s*(?:debug|info|warn|error|log)\s*\(/g
const forbiddenInLog = [
  { label: 'environment object', pattern: /\bprocess\s*\.\s*env\b/ },
  { label: 'authorization, cookie or complete header object', pattern: /\.get\s*\(\s*['"](?:authorization|cookie)['"]|(?:^|[{,(])\s*headers\s*[,}:)]/i },
  { label: 'request or response body', pattern: /\b(?:req(?:uest)?|res(?:ponse)?)\s*\.\s*body\b/i },
  { label: 'unbounded body, request or response object', pattern: /[,({]\s*(?:body|req(?:uest)?|res(?:ponse)?)\s*[,)}]/i },
  { label: 'sensitive object field', pattern: /(?:[,{(]\s*|\.)(?:access_?token|refresh_?token|authorization|cookie|password|secret|api_?key|service_?role_?key|database_?url|raw_?prompt|model_?output|message_?body|request_?body|response_?body|import_?rows)\b\s*(?=[:,)}.]|$)/i },
  { label: 'unbounded request/payload serialization', pattern: /JSON\s*\.\s*stringify\s*\(\s*(?:req(?:uest)?|res(?:ponse)?|body|payload|headers?)\b/i },
]

function posix(path) {
  return path.split(sep).join('/')
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    const path = resolve(dir, name)
    const relativePath = posix(relative(root, path))
    if (excludedPath.test(relativePath)) continue
    const stat = statSync(path)
    if (stat.isDirectory()) walk(path, out)
    else if (sourceExtension.test(name)) out.push(path)
  }
  return out
}

function readCall(source, start) {
  let depth = 0
  let quote = null
  let escaped = false
  for (let index = start; index < source.length && index < start + 4000; index += 1) {
    const char = source[index]
    if (quote) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === quote) quote = null
      continue
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char
      continue
    }
    if (char === '(') depth += 1
    if (char === ')') {
      depth -= 1
      if (depth === 0) return source.slice(start, index + 1)
    }
  }
  return source.slice(start, Math.min(source.length, start + 4000))
}

function lineNumber(source, offset) {
  return source.slice(0, offset).split('\n').length
}

const errors = []
let policy
try {
  policy = JSON.parse(readFileSync(policyPath, 'utf8'))
} catch {
  errors.push('.security/observability-policy.json must exist and contain valid JSON')
}

if (policy) {
  const exactArray = (actual, expected, field) => {
    if (!Array.isArray(actual) || actual.length !== expected.length || expected.some((item) => !actual.includes(item))) {
      errors.push(`${field}: policy cannot omit or add values without W4 review`)
    }
  }
  if (policy.version !== 1) errors.push('version: must equal 1')
  exactArray(policy.requiredEventFields, requiredFields, 'requiredEventFields')
  exactArray(policy.allowedLevels, allowedLevels, 'allowedLevels')
  exactArray(policy.forbiddenFields, requiredForbiddenFields, 'forbiddenFields')
  if (policy.maxEventBytes !== 16384) errors.push('maxEventBytes: must equal 16384')
  if (policy.identifierPolicy !== 'pseudonymous-only') errors.push('identifierPolicy: must be pseudonymous-only')
  const known = new Set(['version', 'requiredEventFields', 'allowedLevels', 'forbiddenFields', 'maxEventBytes', 'identifierPolicy'])
  for (const key of Object.keys(policy)) {
    if (!known.has(key)) errors.push(`${key}: unknown policy field`)
  }
}

const files = sourceRoots.flatMap((dir) => walk(resolve(root, dir)))
let calls = 0
for (const file of files) {
  const source = readFileSync(file, 'utf8')
  for (const match of source.matchAll(logCall)) {
    calls += 1
    const call = readCall(source, match.index)
    for (const finding of forbiddenInLog) {
      if (finding.pattern.test(call)) {
        errors.push(`${posix(relative(root, file))}:${lineNumber(source, match.index)}: log call exposes ${finding.label}`)
      }
    }
  }
}

if (errors.length) {
  console.error('Observability safety policy failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`Observability safety policy passed (${files.length} source file(s), ${calls} log call(s) inspected)`)
