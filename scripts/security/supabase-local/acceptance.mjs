import { randomBytes, randomUUID } from 'node:crypto'
import { productAcceptance } from './product-acceptance.mjs'
import {sensitiveAcceptance}from './sensitive-acceptance.mjs'
import {settingsAcceptance}from './settings-acceptance.mjs'
import {automationsAcceptance}from './automations-acceptance.mjs'
import {notificationsAcceptance}from './notifications-acceptance.mjs'
import {inboxAcceptance}from './inbox-acceptance.mjs'
import {individualOperationAcceptance}from './individual-operation-acceptance.mjs'
import {importJobAcceptance}from './importjob-acceptance.mjs'
import {billingArtifactAcceptance}from './billing-artifact-acceptance.mjs'
import {documentContentAcceptance}from './document-content-acceptance.mjs'
import {documentAcceptance}from './document-acceptance.mjs'
import {portfolioAcceptance,portfolioDeadlineAcceptance}from './portfolio-acceptance.mjs'
import {teamAcceptance}from './team-acceptance.mjs'
import { workReadAcceptance } from './work-read-acceptance.mjs'
import { readFileSync } from 'node:fs'

// No mock Auth, JWT, PostgREST or Storage. Only setup SQL runs as postgres.
export async function acceptance({ url, anon, service, db, command, report, appUrl }) {
  const checks = [], statuses = {}
  function check(ok, name) { if (!ok) throw new Error(`CHECK_${name.toUpperCase().replace(/[^A-Z0-9_]/g, '_')}`); checks.push(name) }
  async function http(path, token = anon, method = 'GET', body, mime) {
    const response = await fetch(url + path, {
      method, redirect: 'error', signal: AbortSignal.timeout(15_000),
      headers: { apikey: token === service ? service : anon, authorization: `Bearer ${token}`, ...(body !== undefined ? { 'content-type': mime || 'application/json' } : {}) },
      body: body === undefined ? undefined : mime ? body : JSON.stringify(body),
    })
    const text = await response.text()
    let json; try { json = JSON.parse(text) } catch { json = null }
    return { status: response.status, json, text }
  }
  function sql(source) { return command('docker', ['exec', '-i', db, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'], { input: source }) }
  const wa = randomUUID(), wb = randomUUID(), wc = randomUUID(), ca = randomUUID(), cb = randomUUID()
  const users = {}
  const roster = { ownerA: [wa, 'owner'], adminA: [wa, 'admin'], memberA: [wa, 'member'], viewerA: [wa, 'viewer'], ownerB: [wb, 'owner'], memberB: [wb, 'member'], removedA: [wa, 'admin'], suspendedA: [wa, 'admin'], suspendedW: [wc, 'owner'], multiAB: [wa, 'member'] }
  for (const [name, [workspace, role]] of Object.entries(roster)) {
    const email = `w4-${name.toLowerCase()}@example.invalid`, password = randomBytes(32).toString('base64url')
    const created = await http('/auth/v1/admin/users', service, 'POST', { email, password, email_confirm: true })
    check(created.status >= 200 && created.status < 300 && /^[0-9a-f-]{36}$/.test(created.json?.id || ''), `auth_create_${name}`)
    const login = await http('/auth/v1/token?grant_type=password', anon, 'POST', { email, password })
    check(login.status === 200 && !!login.json?.access_token, `auth_login_${name}`)
    const token = login.json.access_token, id = created.json.id
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    check(claims.sub === id && claims.role === 'authenticated', `jwt_actor_${name}`)
    const verified = await http('/auth/v1/user', token)
    check(verified.status === 200 && verified.json?.id === id, `auth_verify_${name}`)
    users[name] = { id, token, refresh:login.json.refresh_token, workspace, role }
  }
  const identities = Object.values(users).map(u => `('${u.workspace}','${u.id}','${u.role}','active')`).join(',')
  sql(`begin;
    insert into public.workspaces(id,name,slug) values
      ('${wa}','Synthetic A','w4-local-a'),('${wb}','Synthetic B','w4-local-b'),('${wc}','Synthetic C','w4-local-c');
    insert into public.workspace_members(workspace_id,user_id,role,status) values ${identities},('${wb}','${users.multiAB.id}','member','active');
    insert into public.customers(id,workspace_id,account_kind,legal_name,lifecycle,status,source) values
      ('${ca}','${wa}','legal_entity','Synthetic A customer','customer','active','manual'),
      ('${cb}','${wb}','legal_entity','Synthetic B customer','customer','active','manual');
    update public.profiles set workspace_id='${wb}' where id in ('${users.ownerA.id}','${users.multiAB.id}');
    commit;`)
  const rpc = (name, args, token) => http(`/rest/v1/rpc/${name}`, token, 'POST', args)
  for (const [name, u] of Object.entries(users)) {
    const r = await rpc('current_workspace_role', { p_workspace_id: u.workspace }, u.token)
    check(r.status === 200 && r.json === u.role, `jwt_db_role_${name}`)
    const own = await http(`/rest/v1/workspaces?select=id&id=eq.${u.workspace}`, u.token)
    check(own.status === 200 && own.json?.length === 1 && own.json[0].id === u.workspace, `rest_workspace_${name}`)
  }
  Object.assign(report, { auth: 'PASS', jwt: 'PASS', auth_users: Object.keys(users).length })
  for (const [u, foreign] of [[users.ownerA, wb], [users.memberA, wb], [users.viewerA, wb], [users.ownerB, wa], [users.memberB, wa]]) {
    const r = await http(`/rest/v1/workspaces?select=id&id=eq.${foreign}`, u.token)
    check(r.status === 200 && r.json?.length === 0, 'rest_cross_workspace')
  }
  const foreignProfile = await http(`/rest/v1/profiles?select=id&id=eq.${users.ownerB.id}`, users.ownerA.token)
  check(foreignProfile.status === 200 && foreignProfile.json?.length === 0, 'foreign_profile')
  const membership = await http(`/rest/v1/workspace_members?select=user_id&workspace_id=eq.${wa}`, users.memberA.token)
  check(membership.status === 200 && membership.json?.length === 1 && membership.json[0].user_id === users.memberA.id, 'member_self_membership_only')
  const allMemberships = await http(`/rest/v1/workspace_members?select=user_id&workspace_id=eq.${wa}`, users.adminA.token)
  check(allMemberships.status === 200 && allMemberships.json?.length > 1, 'admin_memberships')
  const viewerWrite = await http('/rest/v1/workspace_members', users.viewerA.token, 'POST', { workspace_id: wb, user_id: users.viewerA.id, role: 'owner' })
  check(viewerWrite.status >= 400, 'viewer_cannot_self_elevate')
  const poisonedProfile = await http(`/rest/v1/profiles?id=eq.${users.memberA.id}`, users.memberA.token, 'PATCH', { workspace_id: wb })
  check(poisonedProfile.status >= 400, 'profile_preference_cannot_grant_workspace')
  const multiIds = await rpc('current_workspace_ids', {}, users.multiAB.token)
  check(multiIds.status === 200 && multiIds.json?.length === 2 && [wa, wb].every(w => multiIds.json.includes(w)), 'multi_memberships_not_profile_preference')
  const malformed = await http('/rest/v1/workspaces?id=eq.not-a-uuid', users.ownerA.token)
  check(malformed.status >= 400, 'malformed_rest_parameter')
  const parts = users.ownerA.token.split('.')
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
  for (const forged of [
    [parts[0], Buffer.from(JSON.stringify({ ...payload, sub: users.ownerB.id })).toString('base64url'), parts[2]].join('.'),
    [parts[0], Buffer.from(JSON.stringify({ ...payload, role: 'service_role' })).toString('base64url'), parts[2]].join('.'),
    [Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url'), parts[1], ''].join('.'),
  ]) {
    const denied = await rpc('current_workspace_role', { p_workspace_id: wa }, forged)
    check(denied.status === 401 || denied.status === 403, 'forged_jwt_rejected')
  }

  // Application relations are deliberately server-only except identity projections.
  const tables = JSON.parse(sql(`select json_agg(c.relname order by c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p','v') and not exists(select 1 from pg_depend d where d.classid='pg_class'::regclass and d.objid=c.oid and d.deptype='e');`))
  for (const table of tables) {
    if (['spatial_ref_sys'].includes(table)) continue
    for (const [label, token] of [['anon', anon], ['A', users.ownerA.token], ['B', users.ownerB.token]]) {
      const r = await http(`/rest/v1/${table}?select=*&limit=1`, token)
      statuses[`table.${table}.${label}`] = r.status
      if (label === 'anon' || !['workspaces', 'workspace_members', 'profiles'].includes(table)) check(r.status === 401 || r.status === 403 || r.status === 404, `raw_denied_${table}_${label}`)
      else check(r.status === 200 && Array.isArray(r.json), `identity_projection_${table}_${label}`)
    }
  }
  report.postgrest = 'PASS'
  report.status_codes = statuses
  const names = ['telecom_v1_customer_get_row', 'telecom_v1_customer_search_rows', 'telecom_v1_customer_summary', 'telecom_v1_contract_get', 'telecom_v1_contract_list', 'telecom_v1_service_list', 'telecom_v1_line_list', 'telecom_v1_activity_list', 'telecom_v1_opportunity_list', 'telecom_v1_task_list', 'telecom_v1_meeting_list', 'telecom_v1_renewal_list', 'telecom_v1_permanence_list', 'telecom_v1_dashboard_authorize']
  const functions = JSON.parse(sql(`select json_agg(json_build_object('name',p.proname,'args',p.proargnames) order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in (${names.map(n => `'${n}'`).join(',')});`))
  check(functions.length === 14, 'complete_rpc_catalog')
  for (const f of functions) for (const [label, token] of [['anon', anon], ['authenticated', users.ownerA.token]]) {
    const args = Object.fromEntries(f.args.map(n => [n, n === 'p_actor_id' ? users.ownerA.id : n === 'p_workspace_id' ? wa : null]))
    const r = await rpc(f.name, args, token); statuses[`rpc.${f.name}.${label}`] = r.status
    check(r.status === 401 || r.status === 403 || r.status === 404, `server_rpc_denied_${f.name}_${label}`)
  }
  const reader = (u, workspace, customer) => rpc('telecom_v1_customer_get_row', { p_actor_id: u.id, p_workspace_id: workspace, p_customer_id: customer }, service)
  const positive = await reader(users.ownerA, wa, ca)
  check(positive.status === 200 && positive.json?.id === ca, 'service_rpc_scoped_positive')
  const foreign = await reader(users.ownerA, wa, cb)
  check(foreign.status === 200 && foreign.json === null, 'service_rpc_foreign_customer')
  check((await reader(users.ownerA, wb, cb)).status >= 400, 'service_rpc_actor_workspace_mismatch')
  for (const [workspace, customer] of [[wa, ca], [wb, cb]]) {
    const r = await reader(users.multiAB, workspace, customer)
    check(r.status === 200 && r.json?.id === customer, 'multi_explicit_authorized_scope')
  }
  report.rpc = 'PASS'
  const productResult=await productAcceptance({rpc,sql,check,http,users,wa,wb,ca,url,anon,appUrl})
  const importJobResult=await importJobAcceptance({rpc,sql,check,users,wa,wb,url,anon,appUrl})
  const artifactResult=await billingArtifactAcceptance({rpc,sql,check,http,users,wa,wb,ca,url,anon,service,appUrl})
  const workReadResult=await workReadAcceptance({rpc,sql,check,http,users,wa,wb,ca,url,anon,appUrl})

  const portfolioResult=await portfolioAcceptance({rpc,sql,check,http,users,wa,wb,ca,url,anon,appUrl})
  const deadlineResult=await portfolioDeadlineAcceptance({rpc,sql,check,http,users,wa,wb,ca,url,anon,appUrl})
  const contentResult=await documentContentAcceptance({rpc,sql,check,http,users,wa,wb,ca,cb,url,anon,appUrl})
  const documentResult=await documentAcceptance({rpc,sql,check,http,users,wa,wb,ca,url,anon,service,appUrl})
  const teamResult=await teamAcceptance({rpc,sql,check,http,users,wa,wb,url,anon,appUrl})

  const individualResult=await individualOperationAcceptance({rpc,sql,check,users,wa,ca,url,anon,appUrl})
  Object.assign(report,await inboxAcceptance({rpc,sql,check,users,wa,wb,ca,url,anon,appUrl}))
  Object.assign(report,await notificationsAcceptance({rpc,sql,check,users,wa,wb,url,anon,appUrl}))
  Object.assign(report,await automationsAcceptance({rpc,sql,check,users,wa,wb,url,anon,appUrl}))
  Object.assign(report,await settingsAcceptance({rpc,sql,check,users,wa,wb,ca,url,anon,appUrl}))
  Object.assign(report,await sensitiveAcceptance({rpc,sql,check,users,wa,wb,url,anon,appUrl}))
  const buckets = await http('/storage/v1/bucket', service)
  check(buckets.status === 200 && ['telecom-documents', 'telecom-import-quarantine'].every(id => buckets.json?.some(b => b.id === id && b.public === false)), 'private_buckets')
  const bytes = Buffer.from('Synthetic local acceptance text only. No customer document.\n')
  const doc = randomUUID(), object = `${wa}/documents/${doc}/${randomUUID()}`, orphan = `${wa}/documents/${randomUUID()}/${randomUUID()}`
  const foreignDoc = randomUUID(), foreignObject = `${wb}/documents/${foreignDoc}/${randomUUID()}`, quarantine = `${wa}/${randomUUID()}`
  // Text bytes use permitted bucket MIME labels solely to exercise API policy.
  for (const path of [object, orphan, foreignObject]) check((await http(`/storage/v1/object/telecom-documents/${path}`, service, 'POST', bytes, 'application/pdf')).status < 300, 'server_synthetic_object_setup')
  check((await http(`/storage/v1/object/telecom-import-quarantine/${quarantine}`, service, 'POST', bytes, 'application/zip')).status < 300, 'server_quarantine_setup')
  sql(`insert into public.documents(id,workspace_id,customer_id,document_kind,file_name,media_type,size_bytes,storage_path) values
    ('${doc}','${wa}','${ca}','general','synthetic.txt','application/pdf',${bytes.length},'${object}'),
    ('${foreignDoc}','${wb}','${cb}','general','synthetic.txt','application/pdf',${bytes.length},'${foreignObject}');`)
  const download = (path, token, bucket = 'telecom-documents') => http(`/storage/v1/object/authenticated/${bucket}/${path}`, token)
  for (const name of ['ownerA', 'adminA', 'removedA', 'suspendedA']) {
    const r = await download(object, users[name].token)
    check(r.status === 200 && r.text === bytes.toString(), `storage_allowed_${name}`)
  }
  for (const [label, token] of [['anon', anon], ['member', users.memberA.token], ['viewer', users.viewerA.token], ['B', users.ownerB.token]]) {
    const r = await download(object, token); statuses[`storage.download.${label}`] = r.status
    check(r.status >= 400, `storage_denied_${label}`)
    const missing = await download(`${wa}/documents/${randomUUID()}/${randomUUID()}`, token)
    check(missing.status === r.status && missing.json?.message === r.json?.message, `storage_no_existence_oracle_${label}`)
  }
  check((await download(orphan, users.ownerA.token)).status >= 400, 'storage_unlinked_orphan_denied')
  check((await download(foreignObject, users.ownerA.token)).status >= 400, 'storage_foreign_object_denied')
  for (const token of [anon, users.ownerB.token, users.memberA.token]) {
    const r = await http('/storage/v1/object/list/telecom-documents', token, 'POST', { prefix: wa, limit: 100, offset: 0 })
    check(r.status >= 400 || (r.status === 200 && r.json?.length === 0), 'storage_foreign_prefix_list_empty')
    const b = await http('/storage/v1/bucket', token)
    check(b.status >= 400 || (b.status === 200 && b.json?.length === 0), 'storage_bucket_listing_empty')
  }
  const ownerList = await http('/storage/v1/object/list/telecom-documents', users.ownerA.token, 'POST', { prefix: `${wa}/documents/${doc}`, limit: 100, offset: 0 })
  check(ownerList.status === 200 && ownerList.json?.length === 1, 'storage_linked_owner_listing')
  for (const token of [anon, users.ownerA.token, users.memberA.token, users.ownerB.token]) {
    const list = await http('/storage/v1/object/list/telecom-import-quarantine', token, 'POST', { prefix: wa, limit: 100, offset: 0 })
    check(list.status >= 400 || (list.status === 200 && list.json?.length === 0), 'quarantine_list_closed')
    check((await download(quarantine, token, 'telecom-import-quarantine')).status >= 400, 'quarantine_read_closed')
    const dest = `${wa}/${randomUUID()}`
    check((await http(`/storage/v1/object/telecom-import-quarantine/${dest}`, token, 'POST', bytes, 'application/zip')).status >= 400, 'quarantine_upload_closed')
  }
  for (const token of [users.ownerA.token, users.memberA.token]) {
    const dest = `${wa}/documents/${randomUUID()}/${randomUUID()}`
    check((await http(`/storage/v1/object/telecom-documents/${dest}`, token, 'POST', bytes, 'application/pdf')).status >= 400, 'client_document_upload_closed')
    await http('/storage/v1/object/telecom-documents', token, 'DELETE', { prefixes: [object] })
    check((await download(object, service)).status === 200, 'client_delete_no_effect')
    for (const operation of ['move', 'copy']) {
      await http(`/storage/v1/object/${operation}`, token, 'POST', { bucketId: 'telecom-documents', sourceKey: object, destinationKey: dest })
      check((await download(object, service)).status === 200 && (await download(dest, service)).status >= 400, `client_${operation}_no_effect`)
    }
  }
  const revokeDraft={command_id:randomUUID(),customer_id:ca,issue_on:'2026-10-04',due_on:null,series:'A',currency:'EUR',lines:[{description:'Synthetic revocation control',quantity_milli:1000,unit_price_minor:100,discount_bps:0,tax_bps:0,withholding_bps:0}]}
  check((await rpc('billing_v1_invoice_create_draft',{p_workspace_id:wa,p_input:revokeDraft},users.adminA.token)).status===200,'billing_pre_revocation_valid_payload_allowed')
  sql(`delete from public.workspace_members where user_id='${users.removedA.id}';
    update public.workspace_members set status='suspended' where user_id='${users.suspendedA.id}';
    update public.workspaces set status='suspended' where id='${wc}';`)
  for (const name of ['removedA', 'suspendedA', 'suspendedW']) {
    const u = users[name]
    check((await http('/auth/v1/user', u.token)).status === 200, `jwt_still_valid_${name}`)
    const r = await http(`/rest/v1/workspaces?select=id&id=eq.${u.workspace}`, u.token)
    check(r.status === 200 && r.json?.length === 0, `business_revoked_${name}`)
    const role = await rpc('current_workspace_role', { p_workspace_id: u.workspace }, u.token)
    check(role.status === 200 && role.json === null, `role_revoked_${name}`)
    const billingDenied=await rpc('billing_v1_invoice_create_draft',{p_workspace_id:u.workspace,p_input:{...revokeDraft,command_id:randomUUID()}},u.token)
    check(billingDenied.status===403&&billingDenied.json?.code==='42501',`billing_valid_jwt_revoked_${name}`)
    check((await rpc('product_v1_task_create',{p_workspace_id:u.workspace,p_input:{command_id:randomUUID(),title:'Revoked Synthetic'}},u.token)).status>=400, `product_valid_jwt_revoked_${name}`)
    check((await reader(u, u.workspace, ca)).status >= 400, `server_actor_revoked_${name}`)
    check((await download(object, u.token)).status >= 400, `storage_revoked_${name}`)
  }
  sql(`update public.documents set status='archived',archived_at=now() where id='${doc}';`)
  check((await download(object, users.ownerA.token)).status >= 400, 'storage_archived_metadata_revokes')
  sql(`update public.documents set status='active',archived_at=null where id='${doc}';
    update public.workspaces set status='suspended' where id='${wa}';`)
  check((await http('/auth/v1/user', users.ownerA.token)).status === 200, 'owner_jwt_valid_after_workspace_suspension')
  check((await download(object, users.ownerA.token)).status >= 400, 'storage_suspended_workspace')
  check((await reader(users.ownerA, wa, ca)).status >= 400, 'rpc_suspended_workspace')
  const remaining = await http(`/rest/v1/workspaces?select=id&id=eq.${wa}`, users.ownerA.token)
  check(remaining.status === 200 && remaining.json?.length === 0, 'rest_suspended_workspace')

  // Static source review supplements HTTP; service-role is not user RLS evidence.
  const repository = readFileSync('src/lib/server/telecom-supabase-repository-v1.ts', 'utf8')
  check(!repository.includes('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE'), 'no_public_service_binding')
  return { ...productResult, ...workReadResult, ...teamResult, ...portfolioResult, ...deadlineResult, ...documentResult, ...individualResult,...importJobResult,...artifactResult,...contentResult, result: 'PASS', auth: 'PASS', jwt: 'PASS', postgrest: 'PASS', rpc: 'PASS', storage: 'PASS', cross_tenant: 'PASS', revocation: 'PASS', auth_users: Object.keys(users).length, checks: checks.length, status_codes: statuses, manager: 'NOT_CANONICAL', signed_access: 'NOT_IMPLEMENTED', auth_email_production: 'NOT_TESTED', mfa_production: 'NOT_TESTED', scoped_service_principal: 'NOT_IMPLEMENTED', remote_staging: 'NOT_TESTED' }
}
