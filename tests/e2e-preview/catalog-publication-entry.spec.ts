import {test,expect} from '@playwright/test'
import {startCatalogResourceFixture} from '../../tests/e2e-preview/fixtures/catalog-resource-server.cjs'
import {publishCatalogVersionBrowser} from '../../scripts/security/supabase-local/product-catalog-browser.mjs'

const operator='20000000-0000-4000-8000-000000000001',planId='30000000-0000-4000-8000-000000000001',versionId='60000000-0000-4000-8000-000000000001'
let fixture:Awaited<ReturnType<typeof startCatalogResourceFixture>>
test.beforeAll(async()=>{fixture=await startCatalogResourceFixture()})
test.afterAll(async()=>{await fixture?.close()})
for(const placement of ['first','later','absent'] as const)test(`publication journey starts independently of the captured operator drawer: ${placement}`,async({page},info)=>{
 let commands=0
 const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid'}).format(new Date())
 const operatorRow={id:operator,version:4,code:'synthetic_operator',display_name:'W2 Catalog Synthetic Updated',status:'active',source:'manual'}
 const plan={id:planId,version:commands?2:1,operator_id:operator,code:'synthetic_mobile',display_name:'W2 Catalog Synthetic Plan',service_kind:'mobile',status:'active'}
 const row={id:versionId,plan_id:planId,operator_id:operator,service_kind:'mobile',version_number:1,valid_from:day,valid_until:null,currency:'EUR',recurring_amount_minor:'2995',plan_status:'active'}
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();let data:unknown
  if(q.operation==='plan_version.create'){
   commands++;expect(q.input).toMatchObject({plan_id:planId,expected_version:1,recurring_amount_minor:'2995',one_time_amount_minor:'0'})
   data={contract_version:'catalog.v1',operation:q.operation,command_id:q.input.command_id,id:versionId,version:1,status:'published',plan_id:planId,parent_version:2,version_number:1}
  }else if(q.operation==='operator.list'){
   const first=Array.from({length:20},(_,n)=>({...operatorRow,id:`10000000-0000-4000-8000-${String(n+1).padStart(12,'0')}`,code:`synthetic_${n}`,display_name:`Synthetic Operator ${n}`}))
   data={contract_version:'telecom.collections.v1',operation:q.operation,items:placement==='first'?[operatorRow]:q.input.after_id?(placement==='later'?[operatorRow]:[]):first,next_id:placement!=='first'&&!q.input.after_id?first.at(-1)!.id:null}
  }
  else if(q.operation==='operator.get')data={contract_version:'telecom.collections.v1',operation:q.operation,record:operatorRow}
  else if(q.operation==='plan.list')data={contract_version:'telecom.collections.v1',operation:q.operation,items:[plan],next_id:null}
  else if(q.operation==='plan.get')data={contract_version:'telecom.collections.v1',operation:q.operation,record:plan}
  else if(q.operation==='plan_version.list')data={contract_version:'telecom.collections.v1',operation:q.operation,items:commands?[row]:[],next_id:null}
  else if(q.operation==='plan_version.get')data={contract_version:'telecom.collections.v1',operation:q.operation,record:row}
  else if(q.operation==='plan_version.terms_get')data={contract_version:'catalog.v1',operation:q.operation,record:{...Object.fromEntries(Object.entries(row).filter(([key])=>!['operator_id','service_kind','plan_status'].includes(key))),terms_status:'published',recurring_period:'month',one_time_amount_minor:'0',is_bundle:false,components:[{position:1,component_kind:'base',service_kind:'mobile',addon_code:null,quantity:1}],entitlements:[]}}
  else throw Error('UNEXPECTED_CONTROLLED_OPERATION')
  await route.fulfill({json:{ok:true,data}})
 })
 await page.goto(fixture.url+'/catalog?operator='+operator)
 await expect(page.getByRole('dialog',{name:operatorRow.display_name,exact:true})).toBeVisible()
 if(placement==='absent'){
  await expect(publishCatalogVersionBrowser({page,origin:fixture.url,createdPlanId:planId,createdOperatorId:operator,screenshotDir:info.outputDir})).rejects.toThrow('CATALOG_TARGET_OPERATOR_NOT_AVAILABLE')
  expect(commands).toBe(0);return
 }
 await publishCatalogVersionBrowser({page,origin:fixture.url,createdPlanId:planId,createdOperatorId:operator,screenshotDir:info.outputDir})
 expect(commands).toBe(1)
 await expect(page.getByRole('dialog')).toHaveCount(0)
})
