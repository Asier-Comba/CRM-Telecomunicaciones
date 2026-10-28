import {test,expect,type Page,type Route} from '@playwright/test'
import type {DocumentLibraryEntryV2} from '../../src/lib/contracts/document-library-v2'
import {startDocumentsFixture} from '../../tools/asier_documents_pro/fixture.cjs'
const id=(n:number)=>n.toString(16).padStart(8,'0')+'-0000-4000-8000-000000000001'
const caps={search_fields:['title','reference','customer_label','category'],sort_fields:['created_asc','created_desc'],private_content:false,folders:false,file_name:false,consistency:'live_reauthorized_creation_cutoff'}
async function setup(page:Page){
 const server=await startDocumentsFixture({library:true,strict:true}),reads:Array<Record<string,unknown>>=[],commands:Array<{operation:string;input:Record<string,unknown>}>=[],tokens=new Map<string,{offset:number;signature:string}>(),receipts=new Map<string,unknown>()
 const records:DocumentLibraryEntryV2[]=Array.from({length:123},(_,i)=>({id:id(i+1),version:1,status:'active',document_kind:i%2?'contract':'general',display_title:(i%2?'Contrato':'General')+' · ref '+id(i+1).slice(0,8),title_state:'available',media_type:i%3?'application/pdf':'image/png',size_bytes:1024,created_at:new Date(Date.UTC(2026,8,1)+i*1000).toISOString().replace('.000Z','.000000Z'),context:{target:{kind:(['customer','contract','service','line','service_case','opportunity']as const)[i%6],id:id(1000+i),label:'Operación sintética '+i},customer:{id:id(2000+i%3),label:'Empresa Sintética '+(i%3+1)}}}))
 let refuse=false,unavailable=false,partial=false,lose=false,seq=0,held:{route:Route;body:unknown}|undefined
 const signature=(input:Record<string,unknown>)=>JSON.stringify(Object.entries(input).filter(([k])=>k!=='cursor').sort(([a],[b])=>a.localeCompare(b)))
 function response(input:Record<string,unknown>){
  let rows=records.filter(r=>r.status===input.status&&(!input.customer_id||r.context.customer?.id===input.customer_id)&&(!input.target||r.context.target.id===(input.target as {id:string}).id&&r.context.target.kind===(input.target as {kind:string}).kind)&&(!input.document_kind||r.document_kind===input.document_kind)&&(!input.format||input.format==='pdf'&&r.media_type==='application/pdf'||input.format==='image'&&['image/png','image/jpeg'].includes(r.media_type??''))&&(!input.created_from||Date.parse(r.created_at)>=Date.parse(input.created_from as string))&&(!input.created_before||Date.parse(r.created_at)<Date.parse(input.created_before as string))&&(!input.query||[r.display_title,r.document_kind,r.context.customer?.label,r.context.target.label].join(' ').toLowerCase().includes((input.query as string).toLowerCase())))
  rows=rows.sort((a,b)=>{const result=(a.created_at+a.id).localeCompare(b.created_at+b.id);return input.sort==='created_asc'?result:-result})
  const sig=signature(input),prior=input.cursor?tokens.get(input.cursor as string):null
  if(input.cursor&&(!prior||prior.signature!==sig))return null
  const offset=prior?.offset??0,limit=input.limit as number,items=rows.slice(offset,offset+limit);let cursor:string|null=null
  if(offset+limit<rows.length){cursor='T'.repeat(48)+String(++seq).padStart(8,'0');tokens.set(cursor,{offset:offset+limit,signature:sig})}
  return{ok:true,data:{contract_version:'document.library.v2',operation:'document.library_list',items:structuredClone(items),next_cursor:cursor,completeness:partial?'partial':'complete',total_count:partial?null:rows.length,count_state:partial?'unavailable':'exact',capabilities:caps}}
 }
 await page.route('**/api/**',async route=>{
  const {operation,input}=route.request().postDataJSON()
  if(operation==='document.library_list'){
   reads.push(input)
   if(refuse||unavailable){await route.fulfill({status:refuse?403:503,json:{ok:false,error:refuse?'access_denied':'unavailable'}});return}
   const body=response(input)
   if(input.query==='Hold'){held={route,body};return}
   await route.fulfill({status:body?200:400,json:body??{ok:false,error:'validation'}});return
  }
  if(operation==='document.get_metadata'){
   const row=records.find(r=>r.id===input.id);await route.fulfill({status:row?200:404,json:row?{ok:true,data:{contract_version:'document.v1',operation,record:{id:row.id,version:row.version,status:row.status,document_kind:row.document_kind,media_type:row.media_type,size_bytes:row.size_bytes,target:{kind:row.context.target.kind,id:row.context.target.id}}}}:{ok:false,error:'not_found'}});return
  }
  if(operation==='document.archive'||operation==='document.restore'){
   commands.push({operation,input});let receipt=receipts.get(input.command_id)
   if(!receipt){const row=records.find(r=>r.id===input.id);if(!row||row.version!==input.expected_version){await route.fulfill({status:409,json:{ok:false,error:'conflict'}});return}row.version++;row.status=operation==='document.archive'?'archived':'active';receipt={contract_version:'document.v1',operation,command_id:input.command_id,id:row.id,version:row.version,status:row.status};receipts.set(input.command_id,receipt);if(lose){lose=false;await route.abort('failed');return}}
   await route.fulfill({json:{ok:true,receipt}});return
  }
  await route.fulfill({status:503,json:{ok:false,error:'unavailable'}})
 })
 return{server,records,reads,commands,setRefuse(v:boolean){refuse=v},setUnavailable(v:boolean){unavailable=v},setPartial(v:boolean){partial=v},loseNext(){lose=true},get held(){return held},async release(){await held!.route.fulfill({json:held!.body})},async open(){await page.goto(server.url+'/documents');await expect(page.locator('[data-document-id]')).toHaveCount(20)},async close(){await page.close();await server.close()}}
}
test('global initial inventory spans six target kinds and all123 rows through seven pages without fanout',async({page})=>{
 const s=await setup(page)
 try{await s.open();const seen:string[]=[];for(let n=1;n<=7;n++){await expect(page.getByText('Página '+n+' · Hasta 20 documentos',{exact:true})).toBeVisible();seen.push(...await page.locator('[data-document-id]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-document-id')!)));if(n<7){await page.getByRole('button',{name:'Siguiente página',exact:true}).click();await expect(page.locator('[data-document-id]').first()).toHaveAttribute('data-document-id',id(123-n*20))}}expect(seen).toEqual(Array.from({length:123},(_,i)=>id(123-i)));expect(new Set(seen).size).toBe(123);expect(s.reads).toHaveLength(7);expect(s.reads.every(input=>!input.target&&!input.customer_id)).toBe(true);expect(s.commands).toHaveLength(0)}finally{await s.close()}
})
test('old safe reference search and combined filters operate on the entire inventory and survive reload',async({page})=>{
 const s=await setup(page)
 try{await s.open();await expect(page.locator('[data-document-id="'+id(1)+'"]')).toHaveCount(0);await page.getByLabel('Buscar documentos',{exact:true}).fill(id(1).slice(0,8));await page.getByRole('button',{name:'Buscar documentos',exact:true}).click();await expect(page.locator('[data-document-id]')).toHaveCount(1);await expect(page.locator('[data-document-id]')).toHaveAttribute('data-document-id',id(1));expect(new URL(page.url()).search.includes(id(1).slice(0,8))).toBe(false);await page.reload();await expect(page.getByLabel('Buscar documentos',{exact:true})).toHaveValue(id(1).slice(0,8));await expect(page.locator('[data-document-id]')).toHaveCount(1);await page.getByRole('button',{name:'Quitar filtros',exact:true}).click();await expect(page.locator('[data-document-id]')).toHaveCount(20);await page.getByLabel('Categoría documental',{exact:true}).selectOption('contract');await page.getByLabel('Formato documental',{exact:true}).selectOption('pdf');await expect(page.getByText('20 en esta página · 41 documentos en la consulta',{exact:true})).toBeVisible();await expect(page.locator('[data-document-id]')).toHaveCount(20);expect(s.reads.at(-1)).toMatchObject({document_kind:'contract',format:'pdf'});await page.reload();await expect(page.getByLabel('Categoría documental',{exact:true})).toHaveValue('contract');await expect(page.getByLabel('Formato documental',{exact:true})).toHaveValue('pdf');await expect(page.getByText('20 en esta página · 41 documentos en la consulta',{exact:true})).toBeVisible()}finally{await s.close()}
})
test('opaque page cursor and previous-page state survive refresh without leaking into URLs',async({page})=>{
 const s=await setup(page)
 try{await s.open();await page.getByRole('button',{name:'Siguiente página',exact:true}).click();await expect(page.locator('[data-document-id]').first()).toHaveAttribute('data-document-id',id(103));expect(new URL(page.url()).search).toBe('');await page.reload();await expect(page.locator('[data-document-id]').first()).toHaveAttribute('data-document-id',id(103));await page.getByRole('button',{name:'Página anterior',exact:true}).click();await expect(page.locator('[data-document-id]').first()).toHaveAttribute('data-document-id',id(123))}finally{await s.close()}
})
test('late document query is retired after editing and after actor workspace role change',async({page})=>{
 const s=await setup(page)
 try{await s.open();s.records.forEach(record=>{record.context.customer!.label='Hold authorized company'});await page.getByLabel('Buscar documentos',{exact:true}).fill('Hold');await page.getByRole('button',{name:'Buscar documentos',exact:true}).click();await expect.poll(()=>!!s.held).toBe(true);expect((s.held!.body as {data:{items:unknown[]}}).data.items).toHaveLength(20);await page.getByLabel('Buscar documentos',{exact:true}).fill('New');const foreign={...structuredClone(s.records[0]),id:id(999),display_title:'General · ref '+id(999).slice(0,8),context:{target:{kind:'customer' as const,id:id(3999),label:'Other authorized context'},customer:{id:id(3999),label:'Other authorized company'}}};s.records.splice(0,s.records.length,foreign);await page.evaluate(()=>window.docsSetScope('10000000-0000-4000-8000-000000000009','20000000-0000-4000-8000-000000000009','owner'));await expect(page.locator('[data-document-id]')).toHaveCount(1);await expect(page.locator('[data-document-id]')).toHaveAttribute('data-document-id',id(999));await s.release();await page.evaluate(()=>new Promise<void>(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done()))));await expect(page.locator('[data-document-id]')).toHaveCount(1);await expect(page.locator('[data-document-id]')).toHaveAttribute('data-document-id',id(999));await page.evaluate(()=>window.docsSetScope('10000000-0000-4000-8000-000000000009','20000000-0000-4000-8000-000000000009','viewer'));await expect(page.getByText('Documentos disponibles para administradores del espacio.',{exact:true})).toBeVisible();await expect(page.locator('[data-document-id]')).toHaveCount(0)}finally{await s.close()}
})
test('denied unavailable partial and empty inventory remain distinct and old rows are withdrawn',async({page})=>{
 const s=await setup(page)
 try{await s.open();s.setRefuse(true);await page.getByRole('button',{name:'Actualizar biblioteca',exact:true}).click();await expect(page.getByRole('alert')).toContainText('No tienes permiso');await expect(page.locator('[data-document-id]')).toHaveCount(0);s.setRefuse(false);s.setUnavailable(true);await page.getByRole('button',{name:'Reintentar consulta',exact:true}).click();await expect(page.getByRole('heading',{name:'Biblioteca pendiente de habilitación',exact:true})).toBeVisible();s.setUnavailable(false);s.records.splice(0);s.setPartial(true);await page.getByRole('button',{name:'Reintentar consulta',exact:true}).click();await expect(page.getByText('La consulta no se ha podido completar',{exact:true})).toBeVisible();await expect(page.getByText('Sin documentos activos',{exact:true})).toHaveCount(0);s.setPartial(false);await page.getByRole('button',{name:'Actualizar biblioteca',exact:true}).click();await expect(page.getByText('Sin documentos activos',{exact:true})).toBeVisible()}finally{await s.close()}
})
test('uncertain archive retry freezes the exact command then restore uses the current CAS version',async({page})=>{
 const s=await setup(page)
 try{await s.open();s.loseNext();await page.locator('[data-document-id]').first().getByRole('button',{name:'Archivar',exact:true}).click();await page.getByRole('button',{name:'Confirmar',exact:true}).click();await expect(page.getByRole('button',{name:'Reintentar la misma acción',exact:true})).toBeVisible();await expect(page.getByLabel('Estado de biblioteca',{exact:true})).toBeDisabled();await page.getByRole('button',{name:'Reintentar la misma acción',exact:true}).click();await expect(page.getByText('Documento actualizado.',{exact:true})).toBeVisible();expect(s.commands).toHaveLength(2);expect(s.commands[0]).toEqual(s.commands[1]);await page.getByLabel('Estado de biblioteca',{exact:true}).selectOption('archived');await expect(page.locator('[data-document-id]')).toHaveCount(1);await page.getByRole('button',{name:'Restaurar',exact:true}).click();await page.getByRole('button',{name:'Confirmar',exact:true}).click();await expect(page.locator('[data-document-id]')).toHaveCount(0);expect(s.commands[2].input.expected_version).toBe(2);expect(s.records.find(r=>r.id===id(123))?.version).toBe(3)}finally{await s.close()}
})

test('unsent archive confirmation retires when browser history changes context without sending a command',async({page})=>{
 const s=await setup(page)
 try{
  await s.open();await page.locator('[data-document-id]').first().getByRole('button',{name:'Sólo este registro',exact:true}).click();await expect(page.locator('[data-document-id]')).toHaveCount(1)
  await page.locator('[data-document-id]').getByRole('button',{name:'Archivar',exact:true}).click();const proposal=page.getByRole('dialog',{name:'Archivar documento',exact:true});await expect(proposal).toBeVisible();expect(s.commands).toHaveLength(0)
  await page.goBack();await expect(page.locator('[data-document-id]')).toHaveCount(20);expect(s.commands).toHaveLength(0);await expect(proposal).toHaveCount(0)
  await page.goForward();await expect(page.locator('[data-document-id]')).toHaveCount(1);await expect(proposal).toHaveCount(0);expect(s.commands).toHaveLength(0)
 }finally{await s.close()}
})

test('uncertain archive history navigation preserves the frozen command until exact retry',async({page})=>{
 const s=await setup(page)
 try{
  await s.open();await page.locator('[data-document-id]').first().getByRole('button',{name:'Sólo este registro',exact:true}).click();await expect(page.locator('[data-document-id]')).toHaveCount(1)
  s.loseNext();await page.locator('[data-document-id]').getByRole('button',{name:'Archivar',exact:true}).click();await page.getByRole('button',{name:'Confirmar',exact:true}).click();await expect(page.getByRole('button',{name:'Reintentar la misma acción',exact:true})).toBeVisible()
  await page.goBack();await expect(page.getByRole('dialog',{name:'Archivar documento',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Cancelar',exact:true})).toBeDisabled();expect(s.commands).toHaveLength(1)
  await page.getByRole('button',{name:'Reintentar la misma acción',exact:true}).click();await expect(page.getByText('Documento actualizado.',{exact:true})).toBeVisible();expect(s.commands).toHaveLength(2);expect(s.commands[0]).toEqual(s.commands[1]);expect(s.records.find(r=>r.id===id(123))?.version).toBe(2);await expect(page.locator('[data-document-id]')).toHaveCount(0)
 }finally{await s.close()}
})
for(const width of [390,768,1440])test(`global loaded inventory details context and keyboard at${width}`,async({page},info)=>{
 const s=await setup(page)
 try{await page.setViewportSize({width,height:960});await s.open();expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);await page.screenshot({path:info.outputPath('global-'+width+'.png'),fullPage:false});const row=page.locator('[data-document-id]').first(),trigger=row.getByRole('button',{name:'Ver detalles',exact:true});await trigger.click();const drawer=page.getByRole('dialog',{name:'Detalles del documento',exact:true});await expect(drawer).toBeVisible();await expect(drawer.getByRole('link',{name:'Abrir registro vinculado',exact:true})).toHaveAttribute('href','/services/'+id(1122));await page.screenshot({path:info.outputPath('global-details-'+width+'.png'),fullPage:false});await page.keyboard.press('Escape');await expect(drawer).toHaveCount(0);await expect(trigger).toBeFocused();await expect(page.getByRole('button',{name:'Descargar archivo privado',exact:true})).toHaveCount(0)}finally{await s.close()}
})
