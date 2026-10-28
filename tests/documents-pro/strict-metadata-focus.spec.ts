import {test,expect} from '@playwright/test'
import {startDocumentsFixture} from '../../tools/asier_documents_pro/fixture.cjs'
const customer='30000000-0000-4000-8000-000000000001',id='70000000-0000-4000-8000-000000000001'
test('StrictMode metadata Escape returns focus to the actual invoking row',async({page})=>{
 const server=await startDocumentsFixture(),record={id,version:1,status:'active',document_kind:'contract',media_type:'application/pdf',size_bytes:1024,target:{kind:'customer',id:customer}}
 await page.route('**/api/**',async route=>{const {operation}=route.request().postDataJSON();if(operation==='document.list')await route.fulfill({json:{ok:true,data:{contract_version:'document.v1',operation,items:[record],next_id:null}}});else if(operation==='document.get_metadata')await route.fulfill({json:{ok:true,data:{contract_version:'document.v1',operation,record}}});else await route.fulfill({status:503,json:{ok:false,error:'unavailable'}})})
 try{
  await page.setViewportSize({width:390,height:960});await page.goto(server.url+'/documents?customer='+customer+'&strict=1');const trigger=page.locator('[data-document-id]').getByRole('button',{name:'Ver metadatos',exact:true});await trigger.click()
  const drawer=page.getByRole('dialog',{name:'Metadatos del documento',exact:true});await expect(drawer).toBeVisible();await page.keyboard.press('Escape');await expect(drawer).toHaveCount(0);await expect(trigger).toBeFocused()
 }finally{await page.close();await server.close()}
})
