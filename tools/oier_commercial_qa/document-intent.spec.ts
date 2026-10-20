import {expect,test} from '@playwright/test'
import {startDocumentFixture} from './documents-server.cjs'
const id='20000000-0000-4000-8000-000000000001',customer='10000000-0000-4000-8000-000000000001'
let fixture:Awaited<ReturnType<typeof startDocumentFixture>>
test.beforeAll(async()=>{fixture=await startDocumentFixture()})
test.afterAll(async()=>{await fixture?.close()})
for(const operation of ['archive','restore'] as const)for(const mode of ['transport','malformed','wrong_receipt','denied','success'] as const)test(`document ${operation} preserves exact intent after ${mode}`,async({page},info)=>{
 const commands:{operation:string;input:{command_id:string}}[]=[],errors:string[]=[]
 let status=operation==='archive'?'active':'archived',version=1
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(route.request().url().endsWith('/commands')){
   commands.push(q)
   if(commands.length===1){
    if(mode==='transport'){await route.abort('failed');return}
    if(mode==='malformed'){await route.fulfill({status:200,contentType:'application/json',body:'{'});return}
    if(mode==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   }
   status=operation==='archive'?'archived':'active';version=2
   await route.fulfill({json:{ok:true,receipt:{contract_version:'document.v1',operation:q.operation,command_id:commands.length===1&&mode==='wrong_receipt'?'70000000-0000-4000-8000-000000000009':q.input.command_id,id,version,status}}});return
  }
  if(q.operation==='document.list'){
   const row={id,version,status,document_kind:'contract',media_type:'application/pdf',size_bytes:100,target:{kind:'customer',id:customer}}
   await route.fulfill({json:{ok:true,data:{contract_version:'document.v1',operation:q.operation,items:status===(q.input.status??'active')?[row]:[],next_id:null}}});return
  }
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.goto(fixture.url)
  if(operation==='restore')await page.getByRole('combobox',{name:'Estado de documentos',exact:true}).selectOption('archived')
  const label=operation==='archive'?'Archivar documento':'Restaurar documento'
  await page.getByRole('button',{name:label,exact:true}).click()
  const confirm=page.getByRole('dialog',{name:label,exact:true})
  await confirm.getByRole('button',{name:'Confirmar',exact:true}).click()
  await expect.poll(()=>commands.length).toBe(1)
  if(mode==='denied'){
   await expect(confirm.getByRole('alert')).toBeVisible()
   await expect(confirm.getByRole('button',{name:'Cancelar',exact:true})).toBeEnabled()
   await confirm.getByRole('button',{name:'Cancelar',exact:true}).click();await expect(confirm).toHaveCount(0)
  }else if(mode!=='success'){
   await expect(confirm.getByRole('alert')).toBeVisible()
   await info.attach('document-intent-observation',{body:JSON.stringify({operation,mode,commands}),contentType:'application/json'})
   await expect(confirm.getByRole('button',{name:'Cancelar',exact:true})).toBeDisabled()
   await expect(confirm.getByRole('button',{name:'Cerrar',exact:true})).toBeDisabled()
   await page.keyboard.press('Escape');await expect(confirm).toBeVisible()
   await page.screenshot({path:info.outputPath(`document-${operation}-${mode}-unknown.png`)})
   await confirm.getByRole('button',{name:'Reintentar la misma acción',exact:true}).click()
   await expect(confirm).toHaveCount(0);expect(commands).toHaveLength(2);expect(commands[1]).toEqual(commands[0])
  }else await expect(confirm).toHaveCount(0)
  expect(commands.every(c=>c.operation===`document.${operation}`)).toBe(true);expect(errors).toEqual([])
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{await page.close()}
})
