import {expect} from '@playwright/test'
import {resolve} from 'node:path'

export async function showCustomerCollectionRow(page,id){
 for(let n=0;n<30;n++){
  await expect(page.getByRole('button',{name:'Actualizar clientes',exact:true})).toBeEnabled()
  const row=page.locator(`[data-customer-id="${id}"]:visible`)
  if(await row.count()){await expect(row).toBeVisible();return}
  const next=page.getByRole('button',{name:'Página siguiente',exact:true})
  if(await next.isDisabled())throw Error('CUSTOMER_NOT_IN_REAL_COLLECTION')
  await next.click()
 }
 throw Error('CUSTOMER_COLLECTION_BOUND_EXCEEDED')
}
export async function customerCollectionsBrowser({page,origin,sql,wa,users,check,screenshotDir}){
 // Disposable extra rows are inserted after existing aggregate proofs. They are not product fixtures.
 const prefix='W2 Final9 Cursor Account '
 const visible=()=>page.locator('[data-customer-id]:visible')
 const response=()=>page.waitForResponse(r=>{try{return new URL(r.url()).pathname==='/api/product/v1/queries'&&r.request().postDataJSON().operation==='customer.list'}catch{return false}})
 async function sameRows(pending){const r=await pending;if(r.status()!==200)throw Error('CUSTOMER_COOKIE_READ_FAILED');const body=await r.json();if(!body.ok)throw Error('CUSTOMER_CLOSED_READ_FAILED');await expect(page.getByRole('button',{name:'Actualizar clientes',exact:true})).toBeEnabled();await expect.poll(()=>visible().evaluateAll(rows=>rows.map(r=>r.dataset.customerId))).toEqual(body.data.items.map(r=>r.id));return body.data}
 try{
  await check('customer_collection_real_cursor_filters_reload_member',async()=>{
   sql(`insert into public.customers(workspace_id,account_kind,legal_name,status,archived_at,lifecycle,source,assigned_user_id,created_by_user_id)select '${wa}','legal_entity','${prefix}'||i,case when i%3=0 then 'archived' when i%3=1 then 'active' else 'inactive' end,case when i%3=0 then now() else null end,case when i%2=0 then 'lead' else 'customer' end,'manual','${users.memberA.id}','${users.memberA.id}' from generate_series(1,45)i;`)
   const operations=[];const observed=r=>{try{operations.push(r.postDataJSON()?.operation)}catch{}};page.on('request',observed)
   let pending=response();await page.goto(origin+'/clients');let first=await sameRows(pending);if(!first.next_id||first.items.length!==20)throw Error('CUSTOMER_FIRST_PAGE_NOT_BOUNDED')
   pending=response();await page.getByRole('button',{name:'Página siguiente',exact:true}).click();let second=await sameRows(pending);if(second.items.some(r=>first.items.some(a=>a.id===r.id)))throw Error('CUSTOMER_DUPLICATE_CURSOR_ROWS')
   pending=response();await page.getByRole('button',{name:'Página anterior',exact:true}).click();await sameRows(pending)
   for(const[label,value,key]of [['Estado de cliente','archived','status'],['Relación comercial de clientes','lead','lifecycle'],['Origen de clientes','manual','source']]){
    pending=response();await page.getByLabel(label,{exact:true}).selectOption(value);const data=await sameRows(pending);if(data.items.some(r=>r[key]!==value))throw Error('CUSTOMER_FILTER_NOT_SERVER_APPLIED');await expect(page.getByRole('button',{name:'Página anterior',exact:true})).toBeDisabled();pending=response();await page.getByLabel(label,{exact:true}).selectOption('');await sameRows(pending)
   }
   const assignees=page.getByLabel('Responsable autorizado',{exact:true});await expect(assignees.locator(`option[value="${users.adminA.id}"]`)).toHaveCount(1);await expect(assignees.locator(`option[value="${users.memberA.id}"]`)).toHaveCount(1)
   pending=response();await assignees.selectOption(users.memberA.id);const assigned=await sameRows(pending);if(assigned.items.some(r=>r.assigned_user_id!==users.memberA.id))throw Error('CUSTOMER_OWNER_FILTER_WRONG');pending=response();await assignees.selectOption('');await sameRows(pending)
   const operator=page.getByLabel('Operador de clientes',{exact:true});await expect(operator).toBeEnabled();const option=await operator.locator('option').evaluateAll(opts=>opts.find(o=>o.value&&!o.disabled)?.value);if(option){pending=response();await operator.selectOption(option);await sameRows(pending);pending=response();await operator.selectOption('');await sameRows(pending)}
   pending=response();await page.getByRole('button',{name:'Actualizar clientes',exact:true}).click();await sameRows(pending);page.off('request',observed);if(!operations.includes('assignee.list')||operations.includes('member.list'))throw Error('ASSIGNEE_NOT_ORDINARY_READ')
  })
  await check('customer_collection_loaded_desktop_tablet_mobile',async()=>{
   for(const width of [1440,768,390]){await page.setViewportSize({width,height:960});await expect(visible().first()).toBeVisible();await page.screenshot({path:resolve(screenshotDir,'customer-collection-'+width+'.png'),fullPage:true});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('CUSTOMER_COLLECTION_LAYOUT_OVERFLOW')}
  })
  await check('customer_collection_revoked_authority_clears_rows',async()=>{
   sql(`update public.workspace_members set status='suspended' where workspace_id='${wa}' and user_id='${users.memberA.id}';`)
   const pending=response();await page.getByRole('button',{name:'Actualizar clientes',exact:true}).click();if((await pending).status()!==403)throw Error('CUSTOMER_REVOKED_READ_NOT_DENIED');await expect(page.getByRole('alert').filter({hasText:'No tienes permiso para esta acción.'}).first()).toBeVisible();await expect(visible()).toHaveCount(0)
  })
 }finally{sql(`update public.workspace_members set status='active' where workspace_id='${wa}' and user_id='${users.memberA.id}';delete from public.customers where workspace_id='${wa}' and legal_name like '${prefix}%';`)}
}
