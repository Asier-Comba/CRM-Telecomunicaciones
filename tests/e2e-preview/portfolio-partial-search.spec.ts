import {expect,test} from '@playwright/test'
import {startCommercialResourceFixture} from './fixtures/commercial-resource-server.cjs'
const id=(n:number)=>`60000000-0000-4000-8000-${String(n).padStart(12,'0')}`,customer='10000000-0000-4000-8000-000000000001'
const record=(n:number)=>({id:id(n),version:1,status:'draft',source:'manual',customer_id:customer,operator_id:'20000000-0000-4000-8000-000000000001',plan_version_id:null,start_date:'2026-10-01',signed_date:null,end_date:null,assigned_user_id:null})
for(const width of [390,768,1440])for(const mode of ['partial_denied','partial_unavailable','all_denied','stale'] as const)test(`portfolio bounded search ${mode} at ${width}`,async({page},info)=>{
 const fixture=await startCommercialResourceFixture(),commands:string[]=[],errors:string[]=[]
 let waiting=false,release!:()=>void,settled!:()=>void;const held=new Promise<void>(r=>release=r),done=new Promise<void>(r=>settled=r)
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(route.request().url().endsWith('/commands'))commands.push(q.operation)
  if(q.operation==='global.search'){
   const ids=q.input.query==='Fresh'?[3]:[1,2]
   await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:ids.map(n=>({kind:'contract',id:id(n),customer_id:customer,label:`Contrato ${q.input.query} ${n}`,status:'draft'}))}}});return
  }
  if(q.operation==='portfolio.get'){
   const n=Number(q.input.id.slice(-12));if(mode==='stale'&&n===1){waiting=true;await held}
   if(n===2||mode==='all_denied'){await route.fulfill({status:mode==='partial_unavailable'?503:403,json:{ok:false,error:mode==='partial_unavailable'?'internal_safe':'access_denied',private_body:'PRIVATE_BODY_SHOULD_NEVER_RENDER'}});return}
   await route.fulfill({json:{ok:true,data:{contract_version:'portfolio.v1',kind:'contract',record:record(n)}}});if(mode==='stale'&&n===1)settled();return
  }
  if(['customer.list','contract.list','service.list','line.list','assignee.list'].includes(q.operation)){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}}});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=portfolio')
  await page.getByLabel('Consultar cartera local',{exact:true}).fill('Portfolio');await page.getByRole('button',{name:'Consultar cartera',exact:true}).click()
  let current=1
  if(mode==='stale'){
   await expect.poll(()=>waiting).toBe(true);await page.getByLabel('Consultar cartera local',{exact:true}).fill('Fresh');await page.getByRole('button',{name:'Consultar cartera',exact:true}).click();current=3
   await expect(page.locator(`article[data-portfolio-id="${id(3)}"]`)).toBeVisible();release();await done
   await expect(page.locator(`article[data-portfolio-id="${id(1)}"]`)).toHaveCount(0)
   await expect(page.getByRole('alert').filter({hasText:'Algunos activos no están disponibles.'})).toHaveCount(0)
  }else if(mode!=='all_denied')await expect(page.locator(`article[data-portfolio-id="${id(1)}"]`)).toBeVisible()
  await expect(page.locator(`article[data-portfolio-id="${id(2)}"]`)).toHaveCount(0)
  if(mode==='all_denied')await expect(page.locator('article[data-portfolio-id]')).toHaveCount(0)
  else{
   const card=page.locator(`article[data-portfolio-id="${id(current)}"]`);await expect(card).toBeVisible();await expect(page.locator('article[data-portfolio-id]')).toHaveCount(1)
   await card.getByRole('button',{name:'Ver activo',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Cerrar panel',exact:true}).click()
   await card.scrollIntoViewIfNeeded()
  }
  if(mode!=='stale')await expect(page.getByRole('alert').filter({hasText:'Algunos activos no están disponibles.'})).toContainText('Algunos activos no están disponibles.')
  await expect(page.getByText('PRIVATE_BODY_SHOULD_NEVER_RENDER')).toHaveCount(0);expect(commands).toEqual([]);expect(errors).toEqual([])
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.screenshot({path:info.outputPath(`portfolio-partial-${mode}-${width}.png`)})
 }finally{release();await page.close();await fixture.close()}
})
