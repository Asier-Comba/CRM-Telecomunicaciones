import {expect,test,type Route} from '@playwright/test'
import {startCatalogResourceFixture} from './fixtures/catalog-resource-server.cjs'
// Actual UI/repository/closed DTOs; synthetic HTTP, without Auth/SQL/RLS claims.
const id=(n:number)=>`40000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const terms=(n:number)=>({id:id(n),plan_id:'30000000-0000-4000-8000-000000000001',version_number:n,terms_status:'published',currency:'EUR',recurring_period:'month',valid_from:'2026-01-01',valid_until:null,recurring_amount_minor:String(n*1000+4999),one_time_amount_minor:String(n*1000+9900),is_bundle:false,components:[{position:1,component_kind:'base',service_kind:n===2?'fiber':'mobile',addon_code:null,quantity:1}],entitlements:[]})
const reply=(route:Route,n:number)=>route.fulfill({json:{ok:true,data:{contract_version:'catalog.v1',operation:'plan_version.terms_get',record:terms(n)}}})
for(const width of [390,768,1440])test(`catalog conditions retire previous prices during version change at ${width}`,async({page},info)=>{
 const fixture=await startCatalogResourceFixture(),commands:string[]=[],errors:string[]=[],held:Route[]=[],late:Route[]=[]
 let holdB=true,delayA=false,reads=0
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const {operation,input}=route.request().postDataJSON()
  if(route.request().url().endsWith('/commands')){commands.push(operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(operation!=='plan_version.terms_get'){await route.fulfill({status:400,json:{ok:false,error:'validation'}});return}
  reads++;const n=Number(input.id.slice(-12))
  if(n===4){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(n===2&&holdB){held.push(route);return}
  if(n===1&&delayA){late.push(route);return}
  await reply(route,n)
 })
 const heading=(n:number)=>page.getByRole('heading',{name:`Condiciones · versión ${n}`,exact:true})
 const choose=(name:string)=>page.getByRole('button',{name:`Seleccionar versión ${name}`,exact:true}).dispatchEvent('click')
 const amount=(label:string)=>page.locator('div').filter({has:page.getByText(label,{exact:true})}).filter({has:page.locator('dd')}).last().locator('dd')
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url)
  await expect(heading(1)).toBeVisible();await expect(amount('Cuota mensual')).toContainText('59,99');await expect(amount('Alta o instalación')).toContainText('109,00')
  await choose('A');await expect(heading(1)).toBeVisible();expect(reads).toBe(1)
  await choose('B');await expect.poll(()=>held.length).toBe(1)
  await expect(heading(1)).toHaveCount(0);await expect(page.getByText('Cuota mensual',{exact:true})).toHaveCount(0);await expect(page.getByRole('status')).toContainText('Consultando condiciones publicadas')
  holdB=false;await reply(held[0],2);await expect(heading(2)).toBeVisible();await expect(amount('Cuota mensual')).toContainText('69,99');await expect(amount('Alta o instalación')).toContainText('119,00');await expect(page.getByText('Fibra × 1',{exact:true})).toBeVisible()
  delayA=true;await choose('A');await expect.poll(()=>late.length).toBe(1)
  await choose('C');await expect(heading(3)).toBeVisible();await expect(amount('Cuota mensual')).toContainText('79,99');await expect(amount('Alta o instalación')).toContainText('129,00')
  const response=page.waitForResponse(r=>r.url()===late[0].request().url()&&r.request().postData()===late[0].request().postData());await reply(late[0],1);await response
  await expect(heading(3)).toBeVisible();await expect(amount('Cuota mensual')).toContainText('79,99');await expect(page.getByRole('alert')).toHaveCount(0)
  await page.screenshot({path:info.outputPath(`catalog-current-terms-${width}.png`)})
  await choose('D');await expect(page.getByRole('alert')).toBeVisible();await expect(heading(3)).toHaveCount(0);await expect(page.getByText('Cuota mensual',{exact:true})).toHaveCount(0)
  await page.getByRole('button',{name:'Cerrar panel',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Condiciones cerradas');await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(commands).toEqual([]);expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 }finally{await page.close();await fixture.close()}
})
