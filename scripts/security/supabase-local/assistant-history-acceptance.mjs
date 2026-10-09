import { randomUUID } from 'node:crypto'

// Actual Auth/JWT/PostgREST against the disposable stack. Read-history lifecycle
// evidence only: these requests do not dispatch a CRM mutation or prove workers.
export async function assistantHistoryAcceptance({ rpc, sql, check, users, wa, wb, anon, service, url, assistantAppUrl }) {
  const id = randomUUID(), turn = randomUUID()
  const call = (operation, input, token = users.ownerA.token, workspace = wa) =>
    rpc('assistant_thread_v2', { p_workspace_id: workspace, p_operation: operation, p_input: input }, token)
  const created = await call('thread.create', { id, title: 'Synthetic assistant history' })
  check(created.status === 200 && created.json?.record?.id === id, 'assistant_history_create')
  for (const [token, workspace] of [[users.memberA.token, wa], [users.ownerB.token, wb], [users.ownerA.token, wb], [anon, wa], [service, wa]]) {
    check((await call('thread.get', { id }, token, workspace)).status >= 400, 'assistant_history_owned_rpc_denial')
  }
  check((await call('thread.get', { id, actor_id: users.ownerB.id })).status >= 400, 'assistant_history_forged_actor_denied')
  const input = { id, turn_id: turn, text: 'Synthetic read request' }
  const starts = await Promise.all(Array.from({ length: 3 }, () => call('turn.start', input)))
  check(starts.every(r => r.status === 200 && r.json?.id === turn), 'assistant_history_concurrent_identity')
  check(starts.filter(r => r.json.replay === false).length === 1 && starts.filter(r => r.json.replay === true).length === 2, 'assistant_history_single_read_reservation')
  check((await call('turn.start', { ...input, text: 'Changed request' })).status >= 400, 'assistant_history_changed_replay_denied')
  const finish = { id, turn_id: turn, status: 'completed', answer: 'Synthetic historical display only.' }
  check((await call('turn.finish', { ...finish, answer: 'x'.repeat(8001) })).status >= 400, 'assistant_history_invalid_output_rejected')
  check((await call('turn.finish', finish)).json?.status === 'completed', 'assistant_history_invalid_output_rolled_back_transition')
  check((await call('turn.finish', finish)).status >= 400, 'assistant_history_terminal_replay_no_transition')
  const page = await call('message.page', { id, limit: 1 })
  check(page.status === 200 && page.json?.historical === true && page.json.items[0]?.role === 'user' && Number.isSafeInteger(page.json.next_sequence), 'assistant_history_keyset_historical_marker')
  check((await call('message.page', { id, after_sequence: page.json.next_sequence })).json?.items[0]?.role === 'assistant', 'assistant_history_next_message')
  const revokedTurn = randomUUID()
  check((await call('turn.start', { ...input, turn_id: revokedTurn })).status === 200, 'assistant_history_revocation_setup')
  sql(`update public.workspace_members set status='suspended' where workspace_id='${wa}' and user_id='${users.ownerA.id}';`)
  try {
    check((await call('thread.get', { id })).status === 403, 'assistant_history_valid_jwt_revoked_read')
    check((await call('turn.finish', { ...finish, turn_id: revokedTurn })).status === 403, 'assistant_history_revoked_completion')
  } finally {
    sql(`update public.workspace_members set status='active' where workspace_id='${wa}' and user_id='${users.ownerA.id}';`)
  }
  check((await call('turn.finish', { ...finish, turn_id: revokedTurn })).status >= 400, 'assistant_history_old_membership_completion_denied')
  check((await call('turn.finish', { id, turn_id: revokedTurn, status: 'cancelled' })).json?.status === 'cancelled', 'assistant_history_stale_read_cancelled')
  check((await call('thread.archive', { id, expected_version: 1 })).json?.record?.archived === true, 'assistant_history_archive_cas')
  const { createServerClient } = await import('@supabase/ssr'), cookies = {}
  for (const name of ['ownerA', 'memberA', 'ownerB', 'viewerA']) {
    const values = [], client = createServerClient(url, anon, { cookies: { getAll: () => [], setAll: v => values.push(...v) } })
    check(!(await client.auth.setSession({ access_token: users[name].token, refresh_token: users[name].refresh })).error, 'assistant_history_cookie_' + name)
    cookies[name] = values.map(v => v.name + '=' + v.value).join('; ')
  }
  const api = async (operation, input, name = 'ownerA', extras = {}) => {
    const response = await fetch(assistantAppUrl + '/api/assistant/v2/threads', { method: 'POST', headers: { cookie: cookies[name] || '', origin: assistantAppUrl, 'content-type': 'application/json', ...extras }, body: JSON.stringify({ operation, input }), signal: AbortSignal.timeout(30000) })
    check(response.headers.get('cache-control') === 'no-store', 'assistant_history_api_no_store')
    return { status: response.status, json: await response.json() }
  }
  const apiId = randomUUID(), apiTurn = randomUUID()
  check((await api('thread.create', { id: apiId, title: 'Synthetic actual assistant API' })).json?.data?.record?.id === apiId, 'assistant_history_api_create')
  check((await api('thread.get', { id: apiId })).status === 200, 'assistant_history_api_get')
  check((await api('thread.list', {})).json?.data?.items?.some(r => r.id === apiId), 'assistant_history_api_list')
  for (const name of ['memberA', 'ownerB', 'anonymous']) check((await api('thread.get', { id: apiId }, name)).status === 403, 'assistant_history_api_owner_only_' + name)
  check((await api('thread.get', { id: apiId, workspace_id: wb })).status === 400, 'assistant_history_api_body_authority_denied')
  check((await api('thread.get', { id: apiId }, 'ownerA', { 'x-workspace-id': wb })).status === 403, 'assistant_history_api_header_authority_denied')
  check((await api('thread.rename', { id: apiId, title: 'Synthetic renamed history', expected_version: 1 })).json?.data?.record?.version === 2, 'assistant_history_api_rename_cas')
  check((await call('turn.start', { id: apiId, turn_id: apiTurn, text: 'Synthetic cancel' })).status === 200, 'assistant_history_api_cancel_setup')
  check((await api('turn.cancel', { id: apiId, turn_id: apiTurn })).json?.data?.status === 'cancelled', 'assistant_history_api_cancel')
  check((await api('message.page', { id: apiId })).json?.data?.historical === true, 'assistant_history_api_message_page')
  sql(`update public.workspace_members set status='suspended' where workspace_id='${wa}' and user_id='${users.ownerA.id}';`)
  try { check((await api('thread.get', { id: apiId })).status === 403, 'assistant_history_api_valid_jwt_revoked') }
  finally { sql(`update public.workspace_members set status='active' where workspace_id='${wa}' and user_id='${users.ownerA.id}';`) }
  check((await api('thread.archive', { id: apiId, expected_version: 2 })).json?.data?.record?.archived === true, 'assistant_history_api_archive')
  const {assistantHistoryBrowser}=await import('./assistant-history-browser.mjs')
  const assistant_history_browser=await assistantHistoryBrowser({origin:assistantAppUrl,cookie:cookies.ownerA,viewerCookie:cookies.viewerA,call,sql,wa,wb,users,check})
  console.log('{"kind":"local_acceptance_progress","phase":"assistant_history_browser_complete"}')
  const {assistantReadGroundingAcceptance}=await import('./assistant-read-grounding-acceptance.mjs')
  const assistant_read_grounding=await assistantReadGroundingAcceptance({rpc,sql,check,users,wa,wb,anon,url,assistantAppUrl,cookie:cookies.ownerA})
  return { assistant_history: 'PASS_ACTUAL_AUTH_POSTGREST_SCOPE_REPLAY_CAS_REVOCATION', assistant_history_application_api: 'PASS_ACTUAL_COOKIE_THREAD_LIFECYCLE', assistant_history_browser, assistant_read_grounding, assistant_business_durability: 'NOT_TESTED' }
}
