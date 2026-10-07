import {expect} from '@playwright/test'
import {resolve} from 'node:path'
export async function customer360CollectionsBrowser({page,origin,id,sql,wa,users,check,screenshotDir}){
 const wait=op=>page.waitForResponse(r=>{try{return r.request().method()==='POST'&&r.request().postDataJSON().operation===op}catch{return false}})
 const visible=()=>page.locator('[data-domain-id]:visible')
 async function sameRows(pending){const response=await pending;if(response.status()!==200)throw Error('C360_NORMAL_COOKIE_READ_FAILED');const result=await response.json();if(!result.ok)throw Error('C360_CLOSED_READ_FAILED');await expect.poll(()=>visible().evaluateAll(rows=>rows.map(r=>r.dataset.domainId))).toEqual(result.data.items.map(r=>r.id));return result.data}
 await check('customer360_exact_summary_safe_contacts_independent_domains',async()=>{
  const summary=wait('customer360.summary'),contacts=wait('contact.list'),operations=[],observe=r=>{try{operations.push(r.postDataJSON()?.operation)}catch{}};page.on('request',observe);await page.goto(origin+'/clients/'+id)
  const s=await(await summary).json();await expect(page.getByLabel('Resumen real del cliente').getByText('Líneas',{exact:true}).locator('..').locator('dd')).toHaveText(String(s.data.record.lines))
  const c=await(await contacts).json();if(c.data.items.some(r=>'email'in r||'phone'in r))throw Error('C360_DEFAULT_CONTACT_PII');await expect(page.getByRole('article').first()).toBeVisible();if(operations.includes('contact.editors'))throw Error('C360_PRIVILEGED_CONTACT_EDITOR_EAGER');page.off('request',observe)
  for(const[area,op]of [['Contratos','contract.list'],['Servicios','service.list'],['Líneas','line.list'],['SIM/eSIM','sim.list'],['Portabilidades','portability.list'],['Renovaciones','renewal.list'],['Permanencias','permanence.list'],['Oportunidades','opportunity.list'],['Tareas','task.list'],['Reuniones','meeting.list'],['Incidencias','case.list'],['Actividad','activity.list']]){const pending=wait(op);await page.getByRole('tab',{name:area,exact:true}).click();await sameRows(pending)}
 })
 const prefix='W2 Final9 Undated History '
 await check('customer360_undated_completed_tasks_cursor_filter_navigation',async()=>{
 sql(`insert into public.tasks(workspace_id,customer_id,title,status,completed_at,assigned_user_id,created_by_user_id)select '${wa}','${id}','${prefix}'||i,'completed',now(),'${users.ownerA.id}','${users.ownerA.id}' from generate_series(1,21)i;`)
 try{
   let pending=wait('task.list');await page.getByRole('tab',{name:'Tareas',exact:true}).click();await sameRows(pending);pending=wait('task.list');await page.getByLabel('Estado de Tareas',{exact:true}).selectOption('completed');const first=await sameRows(pending);if(first.items.length!==20||first.items.some(r=>r.status!=='completed'))throw Error('C360_COMPLETE_HISTORY_MISSING');if(!first.items.some(r=>r.due_at===null&&r.due_on===null))throw Error('C360_UNDATED_TASKS_MISSING')
   pending=wait('task.list');await page.getByRole('button',{name:'Siguiente página de Tareas',exact:true}).click();const second=await sameRows(pending);if(second.items.some(r=>first.items.some(a=>a.id===r.id)))throw Error('C360_CURSOR_DUPLICATES');pending=wait('task.list');await page.getByLabel('Estado de Tareas',{exact:true}).selectOption('');await sameRows(pending);await expect(page.getByRole('button',{name:'Página anterior de Tareas',exact:true})).toBeDisabled()
   const item=first.items.find(r=>r.title.startsWith(prefix));await page.goto(origin+'/calendar?task='+item.id);await expect(page.getByLabel('Título',{exact:true})).toHaveValue(item.title);await page.getByRole('button',{name:'Cerrar panel',exact:true}).click()
 }finally{sql(`delete from public.tasks where workspace_id='${wa}' and customer_id='${id}' and title like '${prefix}%';`)}
 })
 await check('customer360_loaded_telecom_desktop_tablet_mobile',async()=>{
  for(const[area,op,table]of [['Líneas','line.list','telecom_lines'],['SIM/eSIM','sim.list','telecom_sims'],['Portabilidades','portability.list','telecom_portabilities'],['Incidencias','case.list','service_cases']]){
   const customer=sql(table==='telecom_lines'?`select s.customer_id from public.telecom_lines l join public.telecom_services s on s.id=l.service_id and s.workspace_id=l.workspace_id join public.telecom_identifiers i on i.line_id=l.id and i.identifier_kind='msisdn' where l.workspace_id='${wa}' order by l.id limit 1`:`select customer_id from public.${table} where workspace_id='${wa}' order by id limit 1`);if(!customer)throw Error('C360_TELECOM_LOADED_FIXTURE_MISSING')
   await page.goto(origin+'/clients/'+customer);await expect(page.getByRole('button',{name:'Actualizar resumen',exact:true})).toBeVisible();const pending=wait(op);await page.getByRole('tab',{name:area,exact:true}).click();const data=await sameRows(pending);if(!data.items.length)throw Error('C360_TELECOM_LOADED_ROWS_MISSING')
   for(const width of [1440,768,390]){await page.setViewportSize({width,height:960});await expect(visible().first()).toBeVisible();await expect.poll(()=>page.getByRole('tab',{name:area,exact:true}).evaluate(el=>{const tab=el.getBoundingClientRect(),list=el.parentElement.getBoundingClientRect();return tab.left>=list.left-1&&tab.right<=list.right+1})).toBe(true);await expect(page.getByText(/Consultando (operador|versión vendida)/)).toHaveCount(0);await visible().first().scrollIntoViewIfNeeded();await page.screenshot({path:resolve(screenshotDir,'customer360-'+op.split('.')[0]+'-'+width+'.png'),fullPage:true});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('C360_LAYOUT_OVERFLOW')}
  }
 })
}
