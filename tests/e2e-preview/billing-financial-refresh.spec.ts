import {expect,test,type Page} from '@playwright/test'
import {startBillingFocusFixture} from './fixtures/billing-focus-server.cjs'

// Real IntegratedBilling and parsers, inert HTTP data. Not Auth/DB evidence.
test('financial totals from the previous refresh disappear until the current response arrives',async({page},info)=>{
 const fixture=await startBillingFocusFixture()
 let release!:()=>void,waiting=false,reads=0
 const held=new Promise<void>(resolve=>release=resolve)
 await page.route('**/api/billing/v1/queries',async route=>{
  if(route.request().postDataJSON().operation!=='invoice.financial_summary')return route.continue()
  const current=++reads,result=await route.fetch(),body=await result.json()
  body.data.currencies=[{currency:'EUR',issued_minor:10000,paid_minor:6000,outstanding_minor:4000,overdue_minor:0,issued_count:2,paid_count:1,outstanding_count:1,overdue_count:0}]
  if(current>1){waiting=true;await held;body.data.currencies[0].issued_minor+=3025;body.data.currencies[0].outstanding_minor+=3025}
  await route.fulfill({json:body})
 })
 try{
  await page.setViewportSize({width:390,height:960});await page.goto(fixture.url)
  await expect.poll(()=>fixture.requests.filter(q=>q.operation==='invoice.list').length).toBe(1)
  fixture.releaseList()
  const totals=page.getByRole('region',{name:'Importes financieros EUR',exact:true})
  await expect(totals).toBeVisible()
  const original=await totals.getByRole('listitem').first().innerText()
  await page.getByRole('button',{name:'Actualizar facturas',exact:true}).click()
  await expect.poll(()=>waiting).toBe(true)
  await expect.poll(()=>fixture.requests.filter(q=>q.operation==='invoice.list').length).toBe(2)
  fixture.releaseList()
  await expect(totals).toHaveCount(0)
  await expect(page.getByText('Consultando resumen financiero actualizado…',{exact:true})).toBeVisible()
  await page.screenshot({path:info.outputPath('financial-current-refresh-pending-390.png')})
  release();await expect(totals).toBeVisible()
  await expect(totals.getByRole('listitem').first()).not.toHaveText(original)
  await expect(page.getByText('Consultando resumen financiero actualizado…',{exact:true})).toHaveCount(0)
 }finally{release();fixture.releaseList();fixture.releasePdf();await page.unrouteAll({behavior:'wait'});await fixture.close()}
})


async function seriesFixture(page:Page){
 const fixture=await startBillingFocusFixture(),queries:Record<string,unknown>[]=[],financial:Record<string,unknown>[]=[],commands:string[]=[],errors:string[]=[]
 const id=(n:number)=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`
 let holdA=false,waiting=false,release!:()=>void,settled!:()=>void
 const held=new Promise<void>(resolve=>release=resolve),done=new Promise<void>(resolve=>settled=resolve)
 const summary=Object.fromEntries(['currency','customer_id','due_on','id','issue_on','number','overdue','series','status','totals','version'].map(key=>[key,fixture.invoice[key as keyof typeof fixture.invoice]]))
 page.on('pageerror',error=>errors.push(error.message))
 await page.route('**/api/product/v1/queries',async route=>{
  if(route.request().postDataJSON().operation!=='global.search')return route.continue()
  await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:[{kind:'customer',id:id(1),customer_id:id(1),label:'Synthetic Company',status:'active'}]}}})
 })
 await page.route('**/api/billing/v1**',async route=>{
  const {operation,input}=route.request().postDataJSON()
  if(route.request().url().includes('/commands')){commands.push(operation);return route.fulfill({status:403,json:{ok:false,error:'access_denied'}})}
  if(operation==='invoice.private_pdf_reference')return route.fulfill({status:404,json:{ok:false,error:'not_found'}})
  if(operation==='invoice.financial_summary'){financial.push(input);return route.continue()}
  if(operation!=='invoice.list')return route.continue()
  queries.push(input)
  if(input.series==='DENY')return route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
  const delayed=holdA&&input.series==='A';if(delayed){waiting=true;await held}
  const series=input.series??'ALL',row=series==='B'?21:series==='A'?(input.after_id?12:11):31
  await route.fulfill({json:{ok:true,data:{contract_version:'billing.v1',operation,items:[{...summary,id:id(row),series:series==='ALL'?'A':series,number:{series:series==='ALL'?'A':series,year:2026,sequence:row}}],next_id:series==='A'&&!input.after_id?id(row):null}}})
  if(delayed)settled()
 })
 return {fixture,queries,financial,commands,errors,id,holdA(){holdA=true},waiting:()=>waiting,release,done,async close(){release();fixture.releaseList();fixture.releasePdf();await page.unrouteAll({behavior:'wait'});await fixture.close()}}
}
for(const width of [390,768,1440]){
 test(`billing series selection retains server cursor and ignores old filter response at ${width}`,async({page},info)=>{
  const r=await seriesFixture(page)
  try{
   await page.setViewportSize({width,height:960});await page.goto(r.fixture.url)
   await expect(page.locator(`tr[data-invoice-id="${r.id(31)}"]`)).toBeVisible()
   const filter=page.getByRole('textbox',{name:'Serie exacta de factura',exact:true}),apply=page.getByRole('button',{name:'Aplicar serie',exact:true})
   await expect(filter).toBeVisible()
   await page.getByRole('textbox',{name:'Buscar cliente de factura',exact:true}).fill('Synthetic')
   await page.getByRole('button',{name:'Buscar cliente',exact:true}).click()
   await page.getByRole('combobox',{name:'Cliente para facturación',exact:true}).selectOption(r.id(1))
   await page.getByRole('combobox',{name:'Estado de facturas',exact:true}).selectOption('issued')
   await filter.fill('a');await filter.press('Enter')
   await expect(page.locator(`tr[data-invoice-id="${r.id(11)}"]`)).toBeVisible()
   expect(r.queries.at(-1)).toEqual({limit:50,customer_id:r.id(1),status:'issued',series:'A'})
   await page.getByRole('button',{name:'Siguiente página de facturas',exact:true}).click()
   await expect(page.locator(`tr[data-invoice-id="${r.id(12)}"]`)).toBeVisible()
   expect(r.queries.at(-1)).toMatchObject({series:'A',after_id:r.id(11),customer_id:r.id(1),status:'issued'})
   r.holdA();await page.getByRole('button',{name:'Actualizar facturas',exact:true}).click();await expect.poll(r.waiting).toBe(true)
   await filter.fill('B');await apply.click()
   const row=page.locator(`tr[data-invoice-id="${r.id(21)}"]`)
   await expect(row).toBeVisible();await expect(row).toContainText('B/2026/000021')
   expect(r.queries.at(-1)).toEqual({limit:50,customer_id:r.id(1),status:'issued',series:'B'})
   r.release();await r.done;await expect(row).toBeVisible();await expect(page.locator('tr[data-invoice-id]')).toHaveCount(1)
   expect(r.financial.every(input=>JSON.stringify(input)===JSON.stringify({period:'month'}))).toBe(true)
   await expect(page.getByText('Los filtros de cliente y serie solo limitan la lista de facturas.',{exact:false})).toBeVisible()
   await filter.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('invoice-series-'+width+'.png'),fullPage:false})
   await filter.fill('');await apply.click();await expect(page.locator(`tr[data-invoice-id="${r.id(31)}"]`)).toBeVisible()
   expect(r.queries.at(-1)).toEqual({limit:50,customer_id:r.id(1),status:'issued'})
   const count=r.queries.length;await filter.fill('BAD?');await apply.click()
   expect(await filter.evaluate(node=>(node as HTMLInputElement).checkValidity())).toBe(false);expect(r.queries).toHaveLength(count)
   expect(r.commands).toEqual([]);expect(r.errors).toEqual([])
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  }finally{await r.close()}
 })
 test(`billing series denied query preserves error and recovers without writes at ${width}`,async({page})=>{
  const r=await seriesFixture(page)
  try{
   await page.setViewportSize({width,height:960});await page.goto(r.fixture.url)
   await expect(page.locator(`tr[data-invoice-id="${r.id(31)}"]`)).toBeVisible()
   const filter=page.getByRole('textbox',{name:'Serie exacta de factura',exact:true}),apply=page.getByRole('button',{name:'Aplicar serie',exact:true})
   await filter.fill('DENY');await apply.click();await expect(page.getByRole('alert')).toHaveText('No tienes permiso para esta acción.')
   await expect(page.locator('tr[data-invoice-id]')).toHaveCount(0)
   await expect(page.getByText('No hay facturas en esta página con los filtros seleccionados.',{exact:true})).toHaveCount(0)
   await filter.fill('A');await apply.click();await expect(page.locator(`tr[data-invoice-id="${r.id(11)}"]`)).toBeVisible();await expect(page.getByRole('alert')).toHaveCount(0)
   expect(r.commands).toEqual([]);expect(r.errors).toEqual([])
  }finally{await r.close()}
 })
}
