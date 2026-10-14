import {expect,test,type Route} from '@playwright/test'
import {startBillingFocusFixture} from './fixtures/billing-focus-server.cjs'
const id='10000000-0000-4000-8000-000000000002'
for(const width of [390,768,1440])for(const scenario of ['close_success','close_denial','prepare'])test(`billing preparation ${scenario} at ${width}`,async({page},info)=>{
 const denied=scenario==='close_denial'
 const fixture=await startBillingFocusFixture(),held:Route[]=[],commands:string[]=[]
 await page.addInitScript(()=>{
  const original=window.fetch.bind(window);(window as unknown as {preparedReads:number}).preparedReads=0
  window.fetch=async(input,init)=>{
   const response=await original(input,init);let selected=false
   try{const q=JSON.parse(String(init?.body));selected=q.operation==='customer.editor'||q.operation==='configuration.get'&&q.input.customer_id==='10000000-0000-4000-8000-000000000002'}catch{}
   if(selected){const json=response.json.bind(response);response.json=async()=>{const body=await json();(window as unknown as {preparedReads:number}).preparedReads++;return body}}
   return response
  }
 })
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();if(route.request().url().includes('/commands'))commands.push(q.operation)
  if(q.operation==='global.search'){await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:[{kind:'customer',id,customer_id:id,label:'Synthetic preparation customer',status:'active'}]}}});return}
  if(['contract.list','service.list','opportunity.list'].includes(q.operation)){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}}});return}
  if(q.operation==='customer.editor'||q.operation==='configuration.get'&&q.input.customer_id===id){held.push(route);return}
  await route.continue()
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/#create-customer')
  const dialog=page.getByRole('dialog',{name:'Nueva factura',exact:true});await dialog.getByLabel('Buscar empresa para factura').fill('Synthetic')
  await expect(dialog.getByLabel('Cliente vinculado').locator(`option[value="${id}"]`)).toHaveCount(1);await dialog.getByLabel('Cliente vinculado').selectOption(id);await dialog.getByRole('button',{name:'Preparar borrador',exact:true}).click();await expect.poll(()=>held.length).toBe(2)
  await expect(dialog.getByLabel('Cliente vinculado')).toBeDisabled()
  if(scenario!=='prepare'){if(denied)await page.keyboard.press('Escape');else await dialog.getByRole('button',{name:'Cerrar panel',exact:true}).click();await expect(dialog).toHaveCount(0)}
  for(const route of held){const q=route.request().postDataJSON();await route.fulfill(denied?{status:403,json:{ok:false,error:'access_denied'}}:{json:{ok:true,data:q.operation==='customer.editor'?{contract_version:'product.v1',id,version:1,account_kind:'legal_entity',legal_name:'Synthetic preparation customer',trade_name:null,lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}:{contract_version:'billing.v1',operation:'configuration.get',issuer:{version:1,profile:fixture.invoice.customer_fiscal,currency:'EUR',default_series:'A'},customer:null}}})}
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {preparedReads:number}).preparedReads)).toBe(2)
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))
  const editor=page.getByRole('dialog',{name:'Revisar borrador local',exact:true})
  if(scenario==='prepare'){await expect(editor).toBeVisible();await expect(editor.getByLabel('Cliente de factura')).toHaveValue(id)}
  else{await expect(editor).toHaveCount(0);await expect(page.getByLabel('Cliente para facturación')).toHaveValue('')}
  await expect(page.getByRole('alert')).toHaveCount(0);expect(commands).toEqual([])
  if(scenario==='prepare')await page.screenshot({path:info.outputPath(`billing-preparation-ready-${width}.png`)})
 }finally{await page.close();await fixture.close()}
})
