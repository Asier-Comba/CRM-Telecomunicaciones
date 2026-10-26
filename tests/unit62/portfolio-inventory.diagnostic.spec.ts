import {test,expect,type Page} from '@playwright/test'
import {startCommercialResourceFixture} from '../e2e-preview/fixtures/commercial-resource-server.cjs'

// Deliberately RED product handoff to W2. Real component/repository/parsers,
// controlled HTTP and identity. This is separate from the passing real stack.
const id='60000000-0000-4000-8000-000000000001'
async function activated(page:Page){
  const fixture=await startCommercialResourceFixture()
  let active=false,collectionReads=0
  const record=()=>({id,version:active?2:1,status:active?'active':'draft',source:'manual',customer_id:'10000000-0000-4000-8000-000000000001',operator_id:'20000000-0000-4000-8000-000000000001',plan_version_id:null,start_date:'2026-10-26',signed_date:active?'2026-10-26':null,end_date:null,assigned_user_id:null})
  await page.route('**/api/**',async route=>{
    const {operation,input}=route.request().postDataJSON()
    if(operation==='contract.activate'){
      active=true
      await route.fulfill({json:{ok:true,receipt:{contract_version:'portfolio.v1',operation,command_id:input.command_id,id,version:2,status:'active',source:'manual'}}});return
    }
    if(operation==='portfolio.get'){await route.fulfill({json:{ok:true,data:{contract_version:'portfolio.v1',kind:'contract',record:record()}}});return}
    if(operation==='contract.list'){
      collectionReads++;const {signed_date:ignored,...row}=record();void ignored
      await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,items:[row],next_id:null}}});return
    }
    if(['customer.list','assignee.list'].includes(operation)){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,items:[],next_id:null}}});return}
    await route.fulfill({status:400,json:{ok:false,error:'validation'}})
  })
  await page.setViewportSize({width:1440,height:960});await page.goto(fixture.url+'/?kind=portfolio&portfolio_reference='+id)
  const row=page.locator(`[data-domain-id="${id}"]:visible`)
  await expect(row).toContainText('Borrador');await page.getByLabel('Fecha de firma',{exact:true}).fill('2026-10-26');await page.getByRole('button',{name:'Activar contrato',exact:true}).click();await page.getByRole('button',{name:'Confirmar',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator(`article[data-portfolio-id="${id}"]`)).toContainText('Activo')
  return {row,reads:()=>collectionReads,finish:async()=>{await page.close();await fixture.close()}}
}
test('activation readback must also refresh the visible contract inventory (known RED)',async({page},testInfo)=>{
  const state=await activated(page)
  try{await page.screenshot({path:testInfo.outputPath('stale-inventory.png')});await expect(state.row).toContainText('Activo')}finally{await state.finish()}
})
test('explicit inventory refresh shows the same active contract (workaround control)',async({page})=>{
  const state=await activated(page)
  try{
    expect(state.reads()).toBe(1);await page.getByRole('button',{name:'Actualizar Contratos',exact:true}).click();await expect(state.row).toContainText('Activo');expect(state.reads()).toBe(2)
  }finally{await state.finish()}
})
