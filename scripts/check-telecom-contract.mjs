import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import ts from 'typescript'

const baseline = 'e65f1e802fbcb63f9a1636689b85eb2aa135c592'
const candidate = process.argv[2]
if (!/^[a-f0-9]{40}$/.test(candidate ?? '')) {
  console.error('Provide exact fetched 40-character commit SHA.'); process.exit(2)
}
const path = 'src/lib/contracts/telecom-v1.ts'
const read = sha => { try { return execFileSync('git', ['show', `${sha}:${path}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }) } catch { return null } }
const source = read(baseline)
if (!source) { console.error('Fetch baseline contract first.'); process.exit(2) }
const current = read(candidate)
function methods(text) {
  const file = ts.createSourceFile('telecom-v1.ts', text, ts.ScriptTarget.Latest, true)
  const service = file.statements.find(node => ts.isInterfaceDeclaration(node) && node.name.text === 'TelecomReadServiceV1')
  return new Map(service?.members.map(member => [member.name.getText(file), member.getText(file).replace(/\s+/g, '')]) ?? [])
}
const expected = methods(source); const actual = current ? methods(current) : new Map()
const hash = text => createHash('sha256').update(text).digest('hex')
const report = {
  baseline, candidate, path, baselineHash: hash(source), candidateHash: current ? hash(current) : null,
  status: current === null ? 'contract_missing' : current === source ? 'source_identical' : 'source_changed_review_required',
  operations: [...expected].map(([method, signature]) => ({ method, status: !actual.has(method) ? 'missing' : actual.get(method) === signature ? 'signature_identical' : 'signature_changed' })),
  extraOperations: [...actual.keys()].filter(method => !expected.has(method)),
  liveReaderAccepted: false,
}
console.log(JSON.stringify(report, null, 2))
process.exitCode = current === source && expected.size === 14 ? 0 : 1
