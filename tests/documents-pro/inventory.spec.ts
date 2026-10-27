import {test,expect,type Page,type Route} from '@playwright/test'
import {startDocumentsFixture} from '../../tools/asier_documents_pro/fixture.cjs'
const customer='30000000-0000-4000-8000-000000000001',other='30000000-0000-4000-8000-000000000002'
const id=(n:number)=>'70000000-0000-4000-8000-'+String(n).padStart(12,'0')
type RecordV1={id:string;version:number;status:'active'|'archived';document_kind:'contract';media_type:string;size_bytes:number;target:{kind:'customer';id:string}}
async function fixture(page:Page){
 const server=await startDocumentsFixture(),reads:Array<Record<string,unknown>>=[],commands:Array<Record<string,unknown>>=[]
 let refuse=false,fail=false,holdSearch:Route|undefined
 const records:RecordV1[]=Array.from({length:123},(_,i)=>({id:id(i+1),version:1,status:'active',document_kind:'contract',media_type:'application/pdf',size_bytes:1024+i,target:{kind:'customer',id:customer}}))
 const archived:RecordV1={...records[0],id:id(999),status:'archived'};records.push(archived)
 await page.route('**/api/**',async route=>{
  const body=route.request().postDataJSON(),{operation,input}=body
  if(operation==='document.list'){
   reads.push(input)
   if(refuse||input.target_id===other){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   if(fail){await route.fulfill({status:503,json:{ok:false,error:'unavailable'}});return}
   const items=records.filter(r=>r.target.id===input.target_id&&r.status===input.status&&(!input.after_id||r.id>input.after_id)).sort((a,b)=>a.id.localeCompare(b.id)).slice(0,input.limit)
   await route.fulfill({json:{ok:true,data:{contract_version:'document.v1',operation,items,next_id:items.length===input.limit?items.at(-1)!.id:null}}});return
  }
  if(operation==='document.get_metadata'){
   const record=records.find(r=>r.id===input.id)
   await route.fulfill({status:refuse?403:200,json:refuse?{ok:false,error:'access_denied'}:{ok:true,data:{contract_version:'document.v1',operation,record}}});return
  }
  if(operation==='global.search'){
   if(input.query==='Old'){holdSearch=route;return}
   await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:[{kind:'customer',id:other,customer_id:other,label:'New synthetic company',status:'active'}]}}});return
  }
  if(route.request().url().endsWith('/commands'))commands.push(body)
  await route.fulfill({status:503,json:{ok:false,error:'unavailable'}})
 })
 return{server,reads,commands,records,setRefuse:(v:boolean)=>{refuse=v},setFail:(v:boolean)=>{fail=v},get heldSearch(){return holdSearch},async open(){await page.goto(server.url+'/documents?customer='+customer);await expect(page.locator('[data-document-id]')).toHaveCount(20)},async close(){await page.close();await server.close()}}
}
test('context page remains the same after reload and previous-page history survives',async({page})=>{
 const s=await fixture(page)
 try{
  await s.open();await page.getByRole('button',{name:'Siguiente página de documentos',exact:true}).click();await expect(page.locator('[data-document-id]').first()).toHaveAttribute('data-document-id',id(21))
  await page.reload();await expect(page.locator('[data-document-id]').first()).toHaveAttribute('data-document-id',id(21));await expect(page.getByRole('button',{name:'Página anterior de documentos',exact:true})).toBeEnabled()
  await page.getByRole('button',{name:'Página anterior de documentos',exact:true}).click();await expect(page.locator('[data-document-id]').first()).toHaveAttribute('data-document-id',id(1));expect(s.commands).toEqual([])
 }finally{await s.close()}
})
test('changing selection query retires the pending old search result',async({page})=>{
 const s=await fixture(page)
 try{
  await s.open();await page.getByLabel('Buscar cliente para documentos',{exact:true}).fill('Old');await page.getByRole('button',{name:'Buscar registro',exact:true}).click();await expect.poll(()=>!!s.heldSearch).toBe(true)
  await page.getByLabel('Buscar cliente para documentos',{exact:true}).fill('New')
  const arrived=page.waitForResponse(r=>{try{return r.request().postDataJSON().operation==='global.search'}catch{return false}})
  await s.heldSearch!.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:[{kind:'customer',id:other,customer_id:other,label:'Old synthetic company',status:'active'}]}}});await arrived
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))
  await expect(page.getByRole('button',{name:'Empresa · Old synthetic company',exact:true})).toHaveCount(0);expect(s.commands).toEqual([])
 }finally{await s.close()}
})
test('all 123 documents of one authorized target are reachable without omission duplicate or fanout',async({page})=>{
 const s=await fixture(page)
 try{
  await s.open();const seen:string[]=[]
  for(let pageNumber=1;pageNumber<=7;pageNumber++){
   await expect(page.getByText('Página '+pageNumber+' · Hasta 20 documentos',{exact:true})).toBeVisible()
   seen.push(...await page.locator('[data-document-id]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-document-id')!)))
   if(pageNumber<7){await page.getByRole('button',{name:'Siguiente página de documentos',exact:true}).click();await expect(page.locator('[data-document-id]').first()).toHaveAttribute('data-document-id',id(pageNumber*20+1))}
  }
  expect(seen).toEqual(Array.from({length:123},(_,i)=>id(i+1)));expect(new Set(seen).size).toBe(123);expect(s.reads).toHaveLength(7)
  expect(s.reads.every(r=>r.target_id===customer&&r.limit===20)).toBe(true);await expect(page.getByRole('button',{name:'Siguiente página de documentos',exact:true})).toBeDisabled();expect(s.commands).toEqual([])
 }finally{await s.close()}
})
for(const width of [390,768,1440])test(`loaded inventory context drawer and keyboard at ${width}`,async({page},info)=>{
 const s=await fixture(page)
 try{
  await page.setViewportSize({width,height:960});await s.open();await expect(page.getByRole('table')).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false)
  await page.screenshot({path:info.outputPath('inventory-'+width+'.png'),fullPage:false})
  const button=page.locator('[data-document-id]').first().getByRole('button',{name:'Ver metadatos',exact:true});await button.click()
  const dialog=page.getByRole('dialog',{name:'Metadatos del documento',exact:true});await expect(dialog).toBeVisible();await expect(dialog.getByRole('link',{name:'Abrir registro vinculado',exact:true})).toHaveAttribute('href','/clients/'+customer)
  await page.screenshot({path:info.outputPath('metadata-'+width+'.png'),fullPage:false});await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(button).toBeFocused()
  await expect(page.getByRole('button',{name:'Descargar archivo privado',exact:true})).toHaveCount(0);expect(s.commands).toEqual([])
 }finally{await s.close()}
})
test('empty target denied and unavailable states stay distinct; retry clears withdrawn rows',async({page})=>{
 const s=await fixture(page)
 try{
  await s.open();s.setFail(true);await page.getByRole('button',{name:'Actualizar documentos',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();await expect(page.locator('[data-document-id]')).toHaveCount(0);await expect(page.getByText(/Sin documentos activos/)).toHaveCount(0)
  s.setFail(false);await page.getByRole('button',{name:'Reintentar consulta',exact:true}).click();await expect(page.locator('[data-document-id]')).toHaveCount(20)
  s.setRefuse(true);await page.getByRole('button',{name:'Actualizar documentos',exact:true}).click();await expect(page.getByRole('alert')).toContainText('No tienes permiso');await expect(page.locator('[data-document-id]')).toHaveCount(0)
  s.setRefuse(false);s.records.splice(0);await page.getByRole('button',{name:'Reintentar consulta',exact:true}).click();await expect(page.getByText('Sin documentos activos en esta página',{exact:true})).toBeVisible()
 }finally{await s.close()}
})
test('archive filter persists and workspace entry never claims a global inventory exists',async({page})=>{
 const s=await fixture(page)
 try{
  await s.open();await page.getByLabel('Estado de documentos',{exact:true}).selectOption('archived');await expect(page.locator('[data-document-id]')).toHaveCount(1);await page.reload();await expect(page.getByLabel('Estado de documentos',{exact:true})).toHaveValue('archived');await expect(page.locator('[data-document-id]')).toHaveCount(1)
  await page.getByRole('button',{name:'Todos los documentos',exact:true}).click();await expect(page.getByRole('heading',{name:'Inventario general pendiente de habilitación',exact:true})).toBeVisible();await expect(page.locator('[data-document-id]')).toHaveCount(0);await expect(page.getByLabel('Buscar documentos',{exact:true})).toBeDisabled();expect(s.commands).toEqual([])
 }finally{await s.close()}
})
