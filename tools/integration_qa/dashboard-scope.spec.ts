import {test,expect} from '@playwright/test'
import {startDashboardScopeFixture} from '../../tests/e2e-preview/fixtures/dashboard-scope-server.cjs'
let fixture:Awaited<ReturnType<typeof startDashboardScopeFixture>>
test.beforeAll(async()=>{fixture=await startDashboardScopeFixture()})
test.afterAll(async()=>{await fixture?.close()})
const counts=(n:number)=>({customers:n,contracts:0,services:0,lines:0,opportunities:0,tasks:0,meetings:0,renewals:0,permanences:0})
const data=(input:{audience:string;period:string},n:number)=>({contract_version:'product.dashboard.v2',audience:input.audience,period:{kind:input.period,start:input.period==='all'?null:'2026-10-01',end_exclusive:input.period==='all'?null:'2026-11-01'},snapshot_counts:counts(n),period_counts:{customers_created:0,tasks_due:0,meetings_scheduled:0,renewals_due:0,permanences_due:0,opportunities_closed:0},recent_activity:[],financial:null,financial_status:'unavailable'})
async function bind(page:import('@playwright/test').Page,read:(input:{audience:string;period:string})=>Promise<unknown>){
 const requests:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();requests.push(q)
  if(q.operation==='dashboard.get'){const answer=await read(q.input);if(answer==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}await route.fulfill({json:{ok:true,data:answer}});return}
  if(q.operation==='calendar.list'){await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:[],next:null}}});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 return {requests,errors}
}
for(const role of ['owner','admin'])test(`${role} starts with authorized workspace scope and truthful stock/period explanation`,async({page},info)=>{
 const seen=await bind(page,async input=>data(input,input.audience==='workspace'?11:0))
 await page.goto(fixture.url+'/?role='+role)
 await expect(page.getByLabel('Ámbito del dashboard')).toHaveValue('workspace')
 await expect(page.getByRole('region',{name:'Ámbito y lectura de las métricas'})).toContainText('El periodo solo filtra')
 await expect(page.getByRole('region',{name:'Ámbito y lectura de las métricas'})).toContainText('sin asignar')
 await expect(page.getByText('11',{exact:true})).toBeVisible()
 expect(seen.requests.find(v=>v.operation==='dashboard.get')?.input.audience).toBe('workspace')
 expect(seen.requests.filter(v=>v.operation==='calendar.list').every(v=>!('assigned_user_id'in v.input))).toBe(true)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 expect(seen.errors).toEqual([])
 await page.screenshot({path:info.outputPath('loaded-authorized-workspace.png'),fullPage:true})
})
for(const role of ['member','viewer'])test(`${role} retains personal scope without workspace control or invented totals`,async({page})=>{
 const seen=await bind(page,async input=>data(input,0))
 await page.goto(fixture.url+'/?role='+role)
 await expect(page.getByLabel('Ámbito del dashboard')).toHaveValue('my')
 await expect(page.getByLabel('Ámbito del dashboard').locator('option')).toHaveCount(1)
 await expect(page.getByText('No hay clientes asignados a ti.',{exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'Consultar todo el espacio',exact:true})).toHaveCount(0)
 expect(seen.requests.filter(v=>v.operation==='dashboard.get').every(v=>v.input.audience==='my')).toBe(true)
 expect(seen.requests.filter(v=>v.operation==='calendar.list').every(v=>v.input.assigned_user_id==='40000000-0000-4000-8000-000000000001')).toBe(true)
 expect(seen.errors).toEqual([])
})
test('scope changes clear old figures while loading, explain legitimate zeros and allow authorized workspace recovery',async({page},info)=>{
 let release!:()=>void;const held=new Promise<void>(r=>{release=r})
 const seen=await bind(page,async input=>{if(input.audience==='my')await held;return data(input,input.audience==='workspace'?11:0)})
 await page.goto(fixture.url)
 await expect(page.getByText('11',{exact:true})).toBeVisible()
 await page.getByLabel('Ámbito del dashboard').selectOption('my')
 await expect(page.getByText('Cargando métricas…',{exact:true})).toBeVisible()
 await expect(page.getByText('11',{exact:true})).toHaveCount(0)
 release()
 await expect(page.getByText('No hay clientes asignados a ti.',{exact:true})).toBeVisible()
 await expect(page.getByText(/Puede haber clientes sin asignar/)).toBeVisible()
 await page.getByRole('button',{name:'Consultar todo el espacio',exact:true}).click()
 await expect(page.getByText('11',{exact:true})).toBeVisible()
 expect(seen.requests.filter(v=>v.operation==='dashboard.get').map(v=>v.input.audience)).toEqual(['workspace','my','workspace'])
 expect(seen.requests.some(v=>v.operation.endsWith('.create')||v.operation.endsWith('.update'))).toBe(false)
 await page.screenshot({path:info.outputPath('scope-recovered.png'),fullPage:true})
})
test('denied reads present an error without retaining KPIs or implying an empty company',async({page})=>{
 let fail=false
 const seen=await bind(page,async input=>fail?'denied':data(input,11))
 await page.goto(fixture.url)
 await expect(page.getByText('11',{exact:true})).toBeVisible();fail=true
 await page.getByRole('button',{name:'Actualizar',exact:true}).click()
 await expect(page.getByRole('alert')).toContainText('No tienes permiso')
 await expect(page.getByText('11',{exact:true})).toHaveCount(0)
 await expect(page.getByText('No hay clientes asignados a ti.',{exact:true})).toHaveCount(0)
 expect(seen.errors).toEqual([])
})
