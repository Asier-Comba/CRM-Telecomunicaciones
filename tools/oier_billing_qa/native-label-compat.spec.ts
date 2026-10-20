import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {startBillingFocusFixture} from '../../tests/e2e-preview/fixtures/billing-focus-server.cjs'
const files=['billing-current-madrid-day-browser','product-billing-exact-browser','product-billing-authorized-relations-browser','product-billing-uncertain-browser','product-browser-acceptance','product-billing-confirmed-read-browser']
let fixture:Awaited<ReturnType<typeof startBillingFocusFixture>>
test.beforeAll(async()=>{fixture=await startBillingFocusFixture()})
test.afterAll(async()=>{await fixture?.close()})
test('literal locators from every native billing caller resolve to one actual integrated control',async({page},info)=>{
 const rows:{caller:string;label:string;matches:number}[]=[],commands:string[]=[]
 const selectors=files.flatMap(file=>{
  const text=readFileSync(resolve(__dirname,'../../scripts/security/supabase-local',file+'.mjs'),'utf8')
  const labels=[...new Set([...text.matchAll(/['"]((?:Nuevo|Guardar|Revisar) borrador(?: local)?)['"]/g)].map(match=>match[1]))]
  expect(labels.length).toBeGreaterThan(0)
  return labels.map(label=>({caller:file,label}))
 })
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(route.request().url().includes('/commands')){commands.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(q.operation==='global.search'){await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:[{kind:'customer',id:fixture.invoice.customer_id,customer_id:fixture.invoice.customer_id,label:'Bilbao Telecom Demo SL',status:'active'}]}}});return}
  if(q.operation==='invoice.list'){await route.fulfill({json:{ok:true,data:{contract_version:'billing.v1',operation:q.operation,items:[],next_id:null}}});return}
  if(q.operation==='invoice.private_pdf_reference'){await route.fulfill({status:404,json:{ok:false,error:'not_found'}});return}
  await route.continue()
 })
 await page.goto(fixture.url)
 await page.getByRole('textbox',{name:'Buscar cliente de factura',exact:true}).fill('Bilbao')
 await page.getByRole('button',{name:'Buscar cliente',exact:true}).click()
 await page.getByRole('combobox',{name:'Cliente para facturación',exact:true}).selectOption(fixture.invoice.customer_id)
 for(const entry of selectors.filter(s=>s.label.startsWith('Nuevo')))rows.push({...entry,matches:await page.getByRole('button',{name:entry.label,exact:true}).count()})
 // Open the actual UI independently so all stale native labels can be observed.
 await page.getByRole('button',{name:/^Nuevo borrador(?: local)?$/}).click()
 for(const entry of selectors.filter(s=>!s.label.startsWith('Nuevo')))rows.push({...entry,matches:await page.getByRole(entry.label.startsWith('Revisar')?'dialog':'button',{name:entry.label,exact:true}).count()})
 await info.attach('actual-native-locator-matrix',{body:JSON.stringify({scope:'CONTROLLED_COMPONENT_NO_AUTHDB_NOT_CAUSE_OF_ALL_REMOTE_FAILURES',rows,commands}),contentType:'application/json'})
 expect(commands).toEqual([])
 expect(rows.filter(row=>row.matches!==1)).toEqual([])
})
