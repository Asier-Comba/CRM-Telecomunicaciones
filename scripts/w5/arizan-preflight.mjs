// READ-ONLY preflight of the Arizan demo data through the exact readers the hosted UI
// (a9e977ad) uses: telecom_collection_v1_query / case_v1_query / billing_v1_* /
// product_v1_* with owner A's JWT. No writes. Prints check names and PASS/FAIL only.
const U = 'https://zgwotxnyqzfuzcnmgvtn.supabase.co', K = process.env.ARIZAN_PREFLIGHT_PUBLISHABLE_KEY, WA = '63532577-7a61-4349-b88d-d3c9299895d3'
const NAME = 'Empresa Ejemplo Norte SL'
// Credentials of the synthetic owner A come only from the environment (private
// channel); they are never stored in Git or printed.
const email = process.env.ARIZAN_PREFLIGHT_EMAIL, password = process.env.ARIZAN_PREFLIGHT_PASSWORD
// The publishable key is not service_role, but project policy keeps key values out of Git and evidence.
if (!/@example\.invalid$/.test(email ?? '') || !password || !/^sb_publishable_[A-Za-z0-9_-]{8,}$/.test(K ?? '')) { console.error('ARIZAN_PREFLIGHT_EMAIL (synthetic @example.invalid), ARIZAN_PREFLIGHT_PASSWORD and ARIZAN_PREFLIGHT_PUBLISHABLE_KEY are required'); process.exit(2) }
const t = await (await fetch(U + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: K, 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) })).json()
const rpc = async (fn, args) => { const r = await fetch(U + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: K, authorization: 'Bearer ' + t.access_token, 'content-type': 'application/json' }, body: JSON.stringify(args) }); const x = await r.text(); let j = null; try { j = JSON.parse(x) } catch {}; return { status: r.status, code: j?.code, msg: (j?.message || '').slice(0, 80), j, x } }
const items = j => j?.items ?? j?.data?.items ?? j?.rows ?? j?.records ?? (Array.isArray(j) ? j : [])
const res = []
const check = (name, reader, ok, r, note = '') => res.push(`${ok ? 'PASS' : 'FAIL'} | ${name} | ${reader} | ${r?.status}${r?.code ? ' ' + r.code + ' ' + r.msg : ''}${note ? ' | ' + note : ''}`)
const coll = (op, input) => rpc('telecom_collection_v1_query', { p_workspace_id: WA, p_operation: op, p_input: { limit: 50, ...input } })
try {
  // Customers
  let r = await coll('customer.list', {}); const cl = items(r.j)
  const norte = cl.find(c => (c.legal_name ?? c.display_name ?? c.name) === NAME)
  const activeNames = cl.filter(c => (c.status ?? 'active') === 'active').map(c => c.legal_name ?? c.display_name ?? c.name)
  check('Clientes: listado incluye Empresa Ejemplo Norte', 'customer.list', r.status === 200 && !!norte, r, `${cl.length} filas`)
  check('Clientes: sin clientes de prueba archivados en el listado activo', 'customer.list', r.status === 200 && !activeNames.some(n => /^W5 (PROBE|P0 synthetic)/.test(n || '')), r, 'activos: ' + activeNames.length)
  const CUST = norte?.id
  r = await rpc('product_v1_customer_editor', { p_workspace_id: WA, p_customer_id: CUST }); check('Customer360 (editor)', 'customer.editor', r.status === 200 && r.x.includes(NAME), r)
  r = await coll('contact.list', { customer_id: CUST }); check('Contacto vinculado (1)', 'contact.list', r.status === 200 && items(r.j).length === 1, r, items(r.j).length + ' filas')
  // Portfolio
  r = await coll('contract.list', { customer_id: CUST }); const contracts = items(r.j); check('Contratos (2)', 'contract.list', r.status === 200 && contracts.length === 2, r, contracts.length + ' filas')
  r = await coll('service.list', { customer_id: CUST }); const services = items(r.j); check('Servicios fibra + móvil (2)', 'service.list', r.status === 200 && services.length === 2 && services.some(s => s.service_kind === 'fiber') && services.some(s => s.service_kind === 'mobile'), r, services.length + ' filas')
  r = await coll('line.list', { customer_id: CUST }); const lines = items(r.j); check('Líneas (3)', 'line.list', r.status === 200 && lines.length === 3, r, lines.length + ' filas')
  r = await coll('permanence.list', { customer_id: CUST }); check('Permanencia (1)', 'permanence.list', r.status === 200 && items(r.j).length === 1, r, items(r.j).length + ' filas')
  r = await coll('renewal.list', { customer_id: CUST }); const ren = items(r.j); check('Renovación fibra (1, ventana 2026-11-01..12-31)', 'renewal.list', r.status === 200 && ren.length === 1 && JSON.stringify(ren).includes('2026-11-01'), r, ren.length + ' filas')
  r = await coll('plan_version.list', {}); const pv = items(r.j); check('Versiones de tarifa 2026 (≥2, 45 € y 25 €)', 'plan_version.list', r.status === 200 && JSON.stringify(pv).includes('4500') && JSON.stringify(pv).includes('2500'), r, pv.length + ' filas')
  // Opportunities
  r = await rpc('product_v1_stage_catalog', { p_workspace_id: WA, p_after_id: null, p_limit: 20 }); const st = items(r.j); check('Etapas comerciales (3)', 'opportunity.stages', r.status === 200 && st.length === 3, r, st.length + ' filas')
  r = await coll('opportunity.list', { customer_id: CUST }); const op = items(r.j); check('Oportunidad 1.200 € en etapa abierta', 'opportunity.list', r.status === 200 && op.length === 1 && JSON.stringify(op).includes('120000'), r, op.length + ' filas')
  // Agenda / tasks
  r = await coll('task.list', { customer_id: CUST }); check('Tarea de renovación (1)', 'task.list', r.status === 200 && items(r.j).length === 1 && r.x.includes('renovación'), r, items(r.j).length + ' filas')
  // Cases
  r = await rpc('case_v1_query', { p_workspace_id: WA, p_operation: 'case.list', p_input: { customer_id: CUST, limit: 50 } }); check('Incidencia técnica (1)', 'case.list', r.status === 200 && items(r.j).length === 1 && r.x.includes('fibra'), r, items(r.j).length + ' filas')
  // Billing
  r = await rpc('billing_v1_invoice_list', { p_workspace_id: WA, p_input: { customer_id: CUST, limit: 50 } }); const inv = items(r.j); check('Factura borrador listada (1)', 'invoice.list', r.status === 200 && inv.length === 1 && JSON.stringify(inv).includes('draft'), r, inv.length + ' filas')
  const INV = inv[0]?.id
  r = await rpc('billing_v1_invoice_get', { p_workspace_id: WA, p_input: { id: INV } }); const g = JSON.stringify(r.j)
  check('Factura borrador: base 30000, IVA 6300, total 36300, sin número', 'invoice.get', r.status === 200 && /"status":"draft"/.test(g) && /30000/.test(g) && /6300/.test(g) && /36300/.test(g) && !/"number_sequence":\d/.test(g), r)
} finally { await fetch(U + '/auth/v1/logout?scope=global', { method: 'POST', headers: { apikey: K, authorization: 'Bearer ' + t.access_token } }) }
console.log(new Date().toISOString() + '\n' + res.join('\n') + `\n${res.filter(x => x.startsWith('PASS')).length}/${res.length} PASS`)
if (res.some(x => x.startsWith("FAIL"))) process.exitCode = 1
