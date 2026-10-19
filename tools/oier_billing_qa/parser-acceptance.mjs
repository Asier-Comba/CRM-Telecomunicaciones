// Owner acceptance bank. Imports the actual product parser; never substitutes a fixed parser.
// Node 24; no packages, server, database, credentials or model calls required.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

const root = fileURLToPath(new URL('../../', import.meta.url));
const args = process.argv.slice(2);
const options = new Map();
for (let i = 0; i < args.length; i += 2) {
  if (!['--source', '--output'].includes(args[i]) || !args[i + 1] || options.has(args[i]))
    throw new Error('Usage: parser-acceptance.mjs [--source <40-hex-commit>] [--output <new-json-path>]');
  options.set(args[i], args[i + 1]);
}
const source = options.get('--source') ?? '888ecaae57e9021ca0cb25d4da0657c1f6ac9b40';
if (!/^[a-f0-9]{40}$/.test(source)) throw new Error('Exact source commit required');
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim();
if (git('rev-parse', `${source}^{commit}`) !== source) throw new Error('Source commit unavailable');
const hash = (s) => createHash('sha256').update(s).digest('hex');
const pins = {};
for (const path of ['src/features/billing/parse.ts', 'src/features/billing/model.ts', 'src/lib/invoicing/calc.ts']) {
  const blob = execFileSync('git', ['show', `${source}:${path}`], { cwd: root });
  const working = readFileSync(resolve(root, path), 'utf8').replace(/\r\n/g, '\n');
  if (hash(working) !== hash(blob)) throw new Error(`SOURCE_MISMATCH: ${path}`);
  pins[path] = { gitBlob: git('rev-parse', `${source}:${path}`), sha256LF: hash(blob) };
}
const { parseInvoiceText } = await import(pathToFileURL(resolve(root, 'src/features/billing/parse.ts')));
const { calculateInvoiceTotals } = await import(pathToFileURL(resolve(root, 'src/lib/invoicing/calc.ts')));
const clients = [
  { id: '10000000-0000-4000-8000-000000000001', name: 'Bilbao Telecom Demo SL' },
  { id: '10000000-0000-4000-8000-000000000002', name: 'Bilbao Redes Demo SL' },
];
const asOf = '2026-10-19';
const cases = [];
function run(id, text, customerList, assertions) {
  const result = parseInvoiceText(text, customerList, asOf);
  const totals = calculateInvoiceTotals(result.draft.items);
  const checks = assertions.map(([name, expected, actual]) => {
    const value = actual(result, totals);
    return { name, expected, actual: value, status: isDeepStrictEqual(value, expected) ? 'PASS' : 'FAIL' };
  });
  cases.push({ id, text, asOf, inputClients: customerList, result, totals, checks });
}
run('mandatory-owner-phrase', 'Hazme una factura para Bilbao Telecom Demo SL de 300 euros más el 21% de IVA por instalación de fibra, con vencimiento en quince días', clients, [
  ['authorized-input-client', clients[0].id, r => r.draft.clientId],
  ['explicit-issue-date', asOf, r => r.draft.issueDate],
  ['base', 300, (_, t) => t.subtotal],
  ['IVA', 63, (_, t) => t.taxTotal],
  ['total', 363, (_, t) => t.total],
  ['complete-concept', 'instalación de fibra', r => r.draft.items[0].description],
  ['spoken-fifteen-days', '2026-11-03', r => r.draft.dueDate],
]);
run('numeric-due-control', 'Factura para Bilbao Telecom Demo SL de 300 euros por soporte, vencimiento en 15 días', clients, [
  ['numeric-fifteen-days', '2026-11-03', r => r.draft.dueDate],
  ['simple-concept', 'soporte', r => r.draft.items[0].description],
]);
run('month-end-control', 'Factura para Bilbao Telecom Demo SL de 300 euros por soporte, a fin de mes', clients, [
  ['end-of-month', '2026-10-31', r => r.draft.dueDate],
]);
run('unknown-client', 'Factura para Cliente Inexistente XYZ de 300 euros por soporte', clients, [
  ['no-invented-client-id', null, r => r.draft.clientId],
  ['client-review-required', true, r => r.missingFields.includes('cliente')],
]);
run('ambiguous-client', 'Factura para Bilbao de 300 euros por soporte', clients, [
  ['no-silent-client-choice', null, r => r.draft.clientId],
  ['both-candidates', clients.map(c => c.name), r => r.detected.ambiguousClients],
  ['client-review-required', true, r => r.missingFields.includes('cliente')],
]);
run('missing-amount', 'Factura para Bilbao Telecom Demo SL por soporte', clients, [
  ['amount-not-invented', null, r => r.detected.amount],
  ['amount-review-required', true, r => r.missingFields.includes('importe')],
]);
run('IVA-included', 'Factura para Bilbao Telecom Demo SL de 363 euros IVA incluido al 21% por soporte', clients, [
  ['net-base', 300, (_, t) => t.subtotal],
  ['gross-total', 363, (_, t) => t.total],
  ['review-warning', true, r => r.warnings.some(w => w.includes('IVA incluido'))],
]);
run('negative-amount', 'Factura para Bilbao Telecom Demo SL de -300 euros por soporte', clients, [
  ['reject-negative', true, r => r.detected.amount === null && r.missingFields.includes('importe')],
]);
run('spanish-number', 'Factura para Bilbao Telecom Demo SL de 1.234,56 euros por soporte', clients, [
  ['Spanish-decimals', 1234.56, r => r.detected.amount],
]);
run('foreign-currency', 'Factura para Bilbao Telecom Demo SL de 300 USD por soporte', clients, [
  ['currency', 'USD', r => r.draft.currency],
  ['no-fabricated-FX', null, r => r.draft.exchangeRateToEur],
]);
const checks = cases.flatMap(c => c.checks);
const report = {
  schema: 'oier.billing-parser-acceptance.v1',
  scope: 'REAL_PRODUCT_PARSER_SYNTHETIC_INPUT_ONLY',
  sourceCommit: source,
  sourceTree: git('rev-parse', `${source}^{tree}`),
  runnerHead: git('rev-parse', 'HEAD'),
  node: process.version,
  pins,
  evaluatedAt: new Date().toISOString(),
  acceptance: checks.every(c => c.status === 'PASS') ? 'PASS_PARSER_ONLY' : 'FAIL_PARSER_ACCEPTANCE',
  summary: { scenarios: cases.length, checks: checks.length, passed: checks.filter(c => c.status === 'PASS').length, failed: checks.filter(c => c.status === 'FAIL').length },
  unmeasured: { browser: 'NOT_RUN', realVoice: 'NOT_RUN', serverProposal: 'NOT_RUN', realCustomerLookup: 'NOT_RUN', cloudPersistence: 'NOT_RUN', release: 'NOT_ACCEPTED' },
  cases,
};
if (options.has('--output')) writeFileSync(resolve(options.get('--output')), `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ acceptance: report.acceptance, sourceCommit: source, ...report.summary, failures: cases.flatMap(c => c.checks.filter(x => x.status === 'FAIL').map(x => ({ scenario: c.id, ...x }))) }, null, 2));
process.exitCode = report.summary.failed ? 1 : 0;
