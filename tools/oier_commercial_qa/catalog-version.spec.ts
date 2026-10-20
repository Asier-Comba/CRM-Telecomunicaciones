import {expect,test} from '@playwright/test'
import {startCatalogResourceFixture} from '../../tests/e2e-preview/fixtures/catalog-resource-server.cjs'
const operator='20000000-0000-4000-8000-000000000001',planId='30000000-0000-4000-8000-000000000001',versionId='60000000-0000-4000-8000-000000000001'
const plan={id:planId,version:2,operator_id:operator,code:'synthetic_fiber',display_name:'Fibra sintética versionable',service_kind:'fiber',status:'active'}
let fixture:Awaited<ReturnType<typeof startCatalogResourceFixture>>
test.beforeAll(async()=>{fixture=await startCatalogResourceFixture()})
test.afterAll(async()=>{await fixture?.close()})
test('explicit price publication returns the same immutable version and reviewed amounts',async({page},info)=>{
 const commands:{operation:string;input:Record<string,unknown>}[]=[],effects=new Set<string>()
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();let data:unknown
  const row={id:versionId,plan_id:planId,operator_id:operator,service_kind:'fiber',version_number:1,valid_from:'2026-10-21',valid_until:'2026-12-31',currency:'EUR',recurring_amount_minor:'2995',plan_status:'active'}
  if(q.operation==='plan_version.create'){
   commands.push(q);effects.add(q.input.command_id)
   data={contract_version:'catalog.v1',operation:q.operation,command_id:q.input.command_id,id:versionId,version:1,status:'published',plan_id:planId,parent_version:3,version_number:1}
  }else if(q.operation==='operator.list')data={contract_version:'telecom.collections.v1',operation:q.operation,items:[{id:operator,version:1,code:'synthetic_operator',display_name:'Operador sintético',status:'active',source:'manual'}],next_id:null}
  else if(q.operation==='operator.get')data={contract_version:'telecom.collections.v1',operation:q.operation,record:{id:operator,version:1,code:'synthetic_operator',display_name:'Operador sintético',status:'active',source:'manual'}}
  else if(q.operation==='plan.list')data={contract_version:'telecom.collections.v1',operation:q.operation,items:[plan],next_id:null}
  else if(q.operation==='plan.get')data={contract_version:'telecom.collections.v1',operation:q.operation,record:plan}
  else if(q.operation==='plan_version.list')data={contract_version:'telecom.collections.v1',operation:q.operation,items:effects.size?[row]:[],next_id:null}
  else if(q.operation==='plan_version.get')data={contract_version:'telecom.collections.v1',operation:q.operation,record:row}
  else if(q.operation==='plan_version.terms_get')data={contract_version:'catalog.v1',operation:q.operation,record:{...Object.fromEntries(Object.entries(row).filter(([key])=>!['operator_id','service_kind','plan_status'].includes(key))),terms_status:'published',recurring_period:'month',one_time_amount_minor:'0',is_bundle:false,components:[{position:1,component_kind:'base',service_kind:'fiber',addon_code:null,quantity:1}],entitlements:[]}}
  else{await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  await route.fulfill({json:{ok:true,data}})
 })
 await page.goto(fixture.url+'/?qa_catalog=1')
 await page.getByRole('tab',{name:'Tarifas',exact:true}).click()
 const card=page.locator(`article[data-catalog-id="${planId}"]`)
 await expect(card.getByRole('button',{name:'Publicar nueva versión',exact:true})).toBeVisible()
 await card.getByRole('button',{name:'Publicar nueva versión',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'Nueva versión de '+plan.display_name,exact:true})
 await dialog.getByLabel('Vigencia desde',{exact:true}).fill('2026-10-21')
 await dialog.getByLabel('Vigencia hasta',{exact:true}).fill('2026-12-31')
 await dialog.getByLabel('Cuota mensual',{exact:true}).fill('29,95')
 await dialog.getByLabel('Alta o instalación',{exact:true}).fill('0,00')
 await dialog.getByRole('button',{name:'Revisar versión',exact:true}).click()
 expect(commands).toEqual([])
 await dialog.getByRole('button',{name:'Confirmar publicación',exact:true}).click()
 await expect(dialog.getByRole('status')).toContainText('Versión publicada y recuperada')
 expect(commands).toHaveLength(1);expect(effects.size).toBe(1)
 expect(commands[0].input).toMatchObject({plan_id:planId,expected_version:2,valid_from:'2026-10-21',valid_until:'2026-12-31',currency:'EUR',recurring_amount_minor:'2995',one_time_amount_minor:'0',is_bundle:false,components:[{component_kind:'base',service_kind:'fiber',addon_code:null,quantity:1}],entitlements:[]})
 await dialog.getByRole('button',{name:'Ver condiciones publicadas',exact:true}).click()
 await expect(page.getByRole('dialog',{name:'Condiciones · versión 1',exact:true})).toContainText('29,95 EUR')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 await page.screenshot({path:info.outputPath('published-version.png')})
})
