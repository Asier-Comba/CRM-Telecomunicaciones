import {test,expect,type Route} from '@playwright/test'
import {startDocumentsFixture} from '../../tools/asier_documents_pro/fixture.cjs'
import {beginLateResponseObservation,settledLateResponseObservation,lateResponseObservation,cleanLateResponseObservation,endLateResponseObservation} from '../../tools/asier_documents_global/late-response-observer.mjs'
test('late-response oracle waits for consumed JSON and rendered delivery before accepting zero rows',async({page})=>{
 const server=await startDocumentsFixture({library:true,strict:true}),id=(n:number)=>n.toString(16).padStart(8,'0')+'-0000-4000-8000-000000000001'
 const body={ok:true,data:{contract_version:'document.library.v2',operation:'document.library_list',items:Array.from({length:20},(_,i)=>({id:id(100-i),version:1,status:'active',document_kind:'general',display_title:'General · ref '+id(100-i).slice(0,8),title_state:'available',media_type:'application/pdf',size_bytes:1024,created_at:'2026-09-01T00:00:00.000000Z',context:{target:{kind:'customer',id:id(999),label:'Empresa · ref '+id(999).slice(0,8)},customer:{id:id(999),label:'Synthetic Company'}}})),next_cursor:null,completeness:'complete',total_count:20,count_state:'exact',capabilities:{search_fields:['title','reference','customer_label','category'],sort_fields:['created_asc','created_desc'],private_content:false,folders:false,file_name:false,consistency:'live_reauthorized_creation_cutoff'}}}
 let held:Route|undefined
 await page.route('**/api/**',async route=>{
  const {operation,input}=route.request().postDataJSON()
  if(operation!=='document.library_list'){await route.fulfill({status:503,json:{ok:false,error:'unavailable'}});return}
  if(input.query==='General'){held=route;return}
  if(input.query==='Denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  await route.fulfill({json:body})
 })
 try{
  await page.goto(server.url+'/documents');await expect(page.locator('[data-document-id]')).toHaveCount(20)
  await page.getByRole('textbox',{name:'Buscar documentos',exact:true}).fill('General');await page.getByRole('button',{name:'Buscar documentos',exact:true}).click();await expect.poll(()=>!!held).toBe(true)
  await page.getByRole('textbox',{name:'Buscar documentos',exact:true}).fill('Denied');await page.getByRole('button',{name:'Buscar documentos',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();await expect(page.locator('[data-document-id]')).toHaveCount(0)
  await beginLateResponseObservation(page,'/api/document/library/v2/queries');await held!.fulfill({json:body})
  const observed=await settledLateResponseObservation(page)
  expect(observed.json_consumed).toBe(true);expect(observed.settled).toBe(true);expect(cleanLateResponseObservation(observed)).toBe(true);await expect(page.locator('[data-document-id]')).toHaveCount(0)
 }finally{try{await endLateResponseObservation(page)}finally{await page.close();await server.close()}}
})

for(const mode of ['row','subtree','attribute-erased']as const)test(`late observer detects ${mode} inserted and removed within the same mutation batch`,async({page})=>{
 await page.setContent('<main>Observación sintética</main>')
 try{
  await beginLateResponseObservation(page,'/unused')
  await page.evaluate(kind=>{
   const row=document.createElement('div');row.setAttribute('data-document-id','synthetic-row')
   const container=kind==='subtree'?document.createElement('section'):row
   if(container!==row)container.append(row)
   document.body.append(container)
   if(kind==='attribute-erased')row.removeAttribute('data-document-id')
   container.remove()
  },mode)
  await expect.poll(async()=>(await lateResponseObservation(page)).saw_rows).toBe(true)
 }finally{await endLateResponseObservation(page)}
})

test('actual library error plus Next route announcer makes the broad alert assertion ambiguous',async({page})=>{
 const server=await startDocumentsFixture({library:true,strict:true})
 await page.route('**/api/**',route=>route.fulfill({status:403,json:{ok:false,error:'access_denied'}}))
 try{
  await page.goto(server.url+'/documents');await expect(page.getByRole('alert')).toBeVisible()
  // Exact node/style/role structure from installed Next16.4.3 AppRouterAnnouncer;
  // no route-announcer behavior or product data is replaced by this control.
  await page.evaluate(()=>{
   const container=document.createElement('next-route-announcer');container.style.cssText='position:absolute'
   const announcer=document.createElement('div');announcer.ariaLive='assertive';announcer.id='__next-route-announcer__';announcer.role='alert';announcer.style.cssText='position:absolute;border:0;height:1px;margin:-1px;padding:0;width:1px;clip:rect(0 0 0 0);overflow:hidden;white-space:nowrap;word-wrap:normal'
   container.attachShadow({mode:'open'}).appendChild(announcer);document.body.appendChild(container)
  })
  await expect(page.getByRole('alert')).toHaveCount(2)
  await expect(expect(page.getByRole('alert')).toBeVisible()).rejects.toThrow(/strict mode violation/)
  const failure=page.getByRole('alert').filter({has:page.getByRole('button',{name:'Reintentar consulta',exact:true})})
  await expect(failure).toHaveCount(1);await expect(failure).toContainText('No tienes permiso para esta acción.');await expect(failure).toBeVisible()
  await page.evaluate(()=>document.querySelector('main [role="alert"]')?.remove())
  await expect(page.getByRole('alert')).toHaveCount(1);await expect(failure).toHaveCount(0)
 }finally{await page.close();await server.close()}
})
