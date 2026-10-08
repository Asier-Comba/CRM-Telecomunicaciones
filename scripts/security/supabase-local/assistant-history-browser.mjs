import { chromium, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

/** Actual cookie browser/history RPC on the same disposable development app. */
export async function assistantHistoryBrowser({ origin, cookie, call, sql, wa, users, check }) {
  const browser = await chromium.launch()
  let context
  try {
    context = await browser.newContext({ viewport: { width:1440, height:960 } })
    await context.addCookies(cookie.split('; ').map(part => { const at=part.indexOf('='); return { name:part.slice(0,at), value:part.slice(at+1), url:origin } }))
    const page=await context.newPage();page.setDefaultTimeout(30000)
    const dir=resolve(process.env.RUNNER_TEMP,'w3-history-ui');mkdirSync(dir,{recursive:true})
    const pending=op=>page.waitForResponse(response=>{try{return new URL(response.url()).pathname==='/api/assistant/v2/threads'&&response.request().postDataJSON().operation===op}catch{return false}})
    await page.goto(origin+'/assistant')
    await expect(page.getByRole('heading',{name:'Asistente de cartera',exact:true})).toBeVisible()
    await expect(page.getByRole('button',{name:'Actualizar historial',exact:true})).toBeEnabled()
    await expect(page.getByLabel('Consulta al asistente',{exact:true})).toBeDisabled()
    await page.getByLabel('Título de nueva conversación',{exact:true}).fill('W3 UI Synthetic History')
    const creates=[],loseDelivery=async route=>{const request=route.request().postDataJSON();if(request.operation!=='thread.create'){await route.continue();return}creates.push(request);if(creates.length===1){check((await route.fetch()).status()===200,'assistant_history_browser_commit_before_delivery_loss');await route.abort('failed')}else await route.continue()}
    await page.route('**/api/assistant/v2/threads',loseDelivery)
    let response,body
    try{
      await page.getByRole('button',{name:'Nueva conversación',exact:true}).click()
      await expect(page.getByRole('alert').filter({hasText:'No se pudo confirmar el resultado.'})).toBeVisible();await expect(page.getByLabel('Título de nueva conversación',{exact:true})).toBeDisabled()
      const created=pending('thread.create');await page.getByRole('button',{name:'Reintentar misma creación',exact:true}).click();response=await created;body=await response.json()
      check(creates.length===2&&JSON.stringify(creates[0])===JSON.stringify(creates[1]),'assistant_history_browser_same_create_identity_retry')
    }finally{await page.unrouteAll({behavior:'wait'})}
    check(response.status()===200&&body.ok&&body.data?.record?.version===1,'assistant_history_browser_actual_create')
    const id=body.data.record.id;check(/^[0-9a-f-]{36}$/.test(id),'assistant_history_browser_created_uuid')
    check(sql(`select count(*) from public.assistant_conversations_v2 where id='${id}' and workspace_id='${wa}' and actor_id='${users.ownerA.id}' and version=1`)==='1','assistant_history_browser_retry_single_persisted_thread')
    await expect(page.getByRole('heading',{name:'W3 UI Synthetic History',exact:true})).toBeVisible()
    for(let i=0;i<11;i++){
      const turn_id=randomUUID(),text=i===0?'<img src=x onerror=alert(1)> historical only':'Synthetic historical request '+i
      check((await call('turn.start',{id,turn_id,text})).status===200,'assistant_history_browser_seed_real_start')
      check((await call('turn.finish',{id,turn_id,status:'completed',answer:'Synthetic historical answer '+i})).status===200,'assistant_history_browser_seed_real_finish')
    }
    await page.getByRole('button',{name:'Actualizar historial',exact:true}).click()
    await expect(page.locator('[data-history-message]')).toHaveCount(20)
    await expect(page.getByText('<img src=x onerror=alert(1)> historical only',{exact:true})).toBeVisible()
    await expect(page.getByRole('region',{name:'Mensajes históricos',exact:true}).locator('img')).toHaveCount(0)
    await page.getByRole('button',{name:'Más mensajes',exact:true}).click();await expect(page.locator('[data-history-message]')).toHaveCount(2)
    await expect(page.getByRole('button',{name:'Más mensajes',exact:true})).toBeDisabled()
    await page.getByRole('button',{name:'Mensajes anteriores',exact:true}).click();await expect(page.locator('[data-history-message]')).toHaveCount(20)
    check(true,'assistant_history_browser_actual_message_cursor_literal_history')
    await page.getByLabel('Nuevo título de conversación',{exact:true}).fill('W3 UI Renamed History')
    const renamed=pending('thread.rename');await page.getByRole('button',{name:'Guardar título',exact:true}).click()
    check((await(await renamed).json()).data?.record?.version===2,'assistant_history_browser_rename_cas')
    await page.reload();await expect(page.getByRole('button',{name:'Abrir conversación: W3 UI Renamed History',exact:true})).toBeVisible()
    await page.getByRole('button',{name:'Abrir conversación: W3 UI Renamed History',exact:true}).click();await expect(page.locator('[data-history-message]')).toHaveCount(20)
    check(true,'assistant_history_browser_reload_persistence')
    for(const width of [1440,768,390]){await page.setViewportSize({width,height:960});await page.getByRole('main').evaluate(el=>{el.scrollTop=0});await page.screenshot({path:resolve(dir,'history-'+width+'.png'),fullPage:true});await page.getByRole('main').evaluate(el=>{el.scrollTop=el.scrollHeight});await page.screenshot({path:resolve(dir,'history-lower-'+width+'.png'),fullPage:true});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'assistant_history_browser_responsive_'+width)}
    const cache=await page.evaluate(()=>JSON.stringify([Object.entries(localStorage),Object.entries(sessionStorage)]))
    check(!cache.includes('W3 UI Renamed History')&&!cache.includes('historical only'),'assistant_history_browser_no_history_browser_storage')
    sql(`update public.workspace_members set status='suspended' where workspace_id='${wa}' and user_id='${users.ownerA.id}'`)
    try{await page.getByRole('button',{name:'Actualizar historial',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'No tienes acceso a este historial.'})).toBeVisible();await expect(page.locator('[data-history-message]')).toHaveCount(0);await expect(page.locator('[data-history-thread]')).toHaveCount(0);check(true,'assistant_history_browser_revocation_clears_display')}
    finally{sql(`update public.workspace_members set status='active' where workspace_id='${wa}' and user_id='${users.ownerA.id}'`)}
    await page.getByRole('button',{name:'Actualizar historial',exact:true}).click();await expect(page.locator('[data-history-message]')).toHaveCount(20)
    await page.getByRole('button',{name:'Archivar conversación',exact:true}).click();const archived=pending('thread.archive');await page.getByRole('button',{name:'Confirmar archivo',exact:true}).click()
    check((await(await archived).json()).data?.record?.archived===true,'assistant_history_browser_archive_real')
    await expect(page.getByText('Conversación archivada. Sus mensajes se conservan.',{exact:true})).toBeVisible();await expect(page.locator('[data-history-message]')).toHaveCount(20);await expect(page.getByRole('button',{name:'Abrir conversación: W3 UI Renamed History',exact:true})).toHaveCount(0)
    check((await call('message.page',{id,limit:50})).json?.items?.length===22,'assistant_history_browser_archive_preserves_messages')
    for(let i=0;i<21;i++)check((await call('thread.create',{id:randomUUID(),title:'Synthetic history cursor '+i})).status===200,'assistant_history_browser_cursor_seed')
    await page.getByRole('button',{name:'Actualizar historial',exact:true}).click();await expect(page.locator('[data-history-thread]')).toHaveCount(20)
    const first=await page.locator('[data-history-thread]').evaluateAll(nodes=>nodes.map(node=>node.dataset.historyThread))
    await page.getByRole('button',{name:'Más conversaciones',exact:true}).click();await expect(page.locator('[data-history-thread]')).toHaveCount(1)
    const last=await page.locator('[data-history-thread]').getAttribute('data-history-thread');check(!first.includes(last)&&new Set(first).size===20,'assistant_history_browser_thread_cursor_no_duplicates')
    await expect(page.getByRole('button',{name:'Más conversaciones',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Conversaciones anteriores',exact:true}).click();await expect(page.locator('[data-history-thread]')).toHaveCount(20)
    return 'PASS_ACTUAL_COOKIE_BROWSER_HISTORY_CAS_PAGINATION_REVOCATION'
  } finally { await context?.close();await browser.close() }
}
