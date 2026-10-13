import {expect,test,type Route} from '@playwright/test'
import {startProductScopeFixture} from './fixtures/product-scope-server.cjs'
// Actual ProductProvider/repository/settings validators; no Auth/RLS claim.
function data(operation:string,name:string){return {contract_version:'settings.v1',operation,version:1,profile:operation==='settings.profile_get'?{display_name:`Synthetic ${name} user`,timezone:'Europe/Madrid',locale:'es-ES',notification_preferences:{in_app:true}}:{trade_name:`Synthetic ${name} company`,business_name:null,business_email:null,phone:null,website:null,address:null,timezone:'Europe/Madrid',locale:'es-ES',description:null,logo_document_id:null}}}
test('product provider discards old identity and child state across scope changes only',async({page})=>{
 const fixture=await startProductScopeFixture(),held:Route[]=[],errors:string[]=[],requests:string[]=[]
 let name='A',hold=false
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/settings/v1',async route=>{
  const {operation}=route.request().postDataJSON();requests.push(operation)
  if(hold){held.push(route);return}
  await route.fulfill({json:{ok:true,data:data(operation,name)}})
 })
 try{
  await page.goto(fixture.url);const company=page.locator('[data-company]'),person=page.locator('[data-person]'),draft=page.getByRole('textbox',{name:'Borrador sintético'})
  await expect(company).toHaveText('Synthetic A company');await expect(person).toHaveText('Synthetic A user')
  await draft.fill('Same scope draft');name='A refreshed';await page.getByRole('button',{name:'Actualizar identidad',exact:true}).click()
  await expect(company).toHaveText('Synthetic A refreshed company');await expect(draft).toHaveValue('Same scope draft')
  hold=true;await page.getByRole('button',{name:'Actualizar identidad',exact:true}).click();await expect.poll(()=>held.length).toBe(2)
  hold=false;name='B';await page.getByRole('button',{name:'Cambiar empresa',exact:true}).click()
  await expect(draft).toHaveValue('');await expect(company).toHaveText('Synthetic B company');await expect(person).toHaveText('Synthetic B user')
  await draft.fill('New scope draft')
  const oldResponses=held.map(route=>page.waitForResponse(r=>r.request()===route.request()))
  for(const route of held.splice(0))await route.fulfill({json:{ok:true,data:data(route.request().postDataJSON().operation,'OLD')}})
  for(const response of oldResponses)await (await response).finished()
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))
  await expect(company).toHaveText('Synthetic B company');await expect(draft).toHaveValue('New scope draft')
  for(const [button,label] of [['Cambiar usuario','C'],['Cambiar rol','D']]){
   name=label;await page.getByRole('button',{name:button,exact:true}).click();await expect(draft).toHaveValue('');await expect(company).toHaveText(`Synthetic ${label} company`);await draft.fill(`Draft ${label}`)
  }
  await expect(page.locator('[data-role]')).toHaveText('viewer')
  const before=requests.length;await page.getByRole('button',{name:'Cambiar modo',exact:true}).click();await expect(draft).toHaveValue('');await expect(company).toHaveText('Identidad pendiente')
  await page.getByRole('button',{name:'Actualizar identidad',exact:true}).click();expect(requests.length).toBe(before)
  name='E';await page.getByRole('button',{name:'Cambiar modo',exact:true}).click();await expect(company).toHaveText('Synthetic E company');expect(errors).toEqual([])
 }finally{for(const route of held)await route.abort().catch(()=>{});await page.unrouteAll({behavior:'wait'});await fixture.close()}
})
