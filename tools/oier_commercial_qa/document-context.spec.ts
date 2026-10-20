import {expect,test} from '@playwright/test'
import {startDocumentFixture} from './documents-server.cjs'
const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002',contract='60000000-0000-4000-8000-000000000002'
const docA='20000000-0000-4000-8000-000000000001',docB='20000000-0000-4000-8000-000000000002'
let fixture:Awaited<ReturnType<typeof startDocumentFixture>>
test.beforeAll(async()=>{fixture=await startDocumentFixture()})
test.afterAll(async()=>{await fixture?.close()})
for(const mode of ['customer','target','late','unchanged'] as const)test(`document context ${mode} retires only changed identity`,async({page},info)=>{
 const reads:{target_kind:string;target_id:string;status?:string}[]=[],commands:string[]=[],errors:string[]=[]
 let release!:()=>void,lateResponded=false
 const held=new Promise<void>(resolve=>{release=resolve})
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(q.operation!=='document.list'){commands.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  reads.push(q.input)
  if(mode==='late'&&q.input.target_id===a)await held
  const isA=q.input.target_id===a
  await route.fulfill({json:{ok:true,data:{contract_version:'document.v1',operation:'document.list',items:[{id:isA?docA:docB,version:1,status:q.input.status??'active',document_kind:isA?'contract':'billing',media_type:'application/pdf',size_bytes:100,target:{kind:q.input.target_kind,id:q.input.target_id}}],next_id:null}}})
  if(mode==='late'&&isA)lateResponded=true
 })
 try{
  await page.goto(fixture.url+'/?context_controls=1'+(['target','unchanged'].includes(mode)?'&explicit_target=1':''))
  const old=page.locator(`article[data-document-id="${docA}"]`),current=page.locator(`article[data-document-id="${docB}"]`)
  await expect.poll(()=>reads.length).toBe(1)
  if(mode!=='late')await expect(old).toBeVisible()
  if(mode==='unchanged'){
   await page.getByRole('combobox',{name:'Estado de documentos',exact:true}).selectOption('archived')
   await expect(old.getByText('Archivado',{exact:true})).toBeVisible()
   await page.getByRole('textbox',{name:'Buscar cliente para documentos',exact:true}).fill('Consulta sin enviar')
   const before=reads.length
   await page.getByRole('button',{name:'Actualizar contexto documental sintético',exact:true}).click()
   await expect(page.getByLabel('Versión de contexto documental sintético',{exact:true})).toHaveText('1')
   await expect(page.getByRole('combobox',{name:'Estado de documentos',exact:true})).toHaveValue('archived')
   await expect(page.getByRole('textbox',{name:'Buscar cliente para documentos',exact:true})).toHaveValue('Consulta sin enviar')
   await expect(old).toBeVisible();expect(reads).toHaveLength(before)
  }else{
   await page.getByRole('button',{name:'Cambiar contexto documental sintético',exact:true}).click()
   await expect.poll(()=>reads.some(r=>r.target_id===(mode==='target'?contract:b))).toBe(true)
   await expect(current).toBeVisible();await expect(old).toHaveCount(0)
   if(mode==='target')await expect(page.getByRole('heading',{name:'Contrato sintético B',exact:true})).toBeVisible()
   if(mode==='late'){
    release();await expect.poll(()=>lateResponded).toBe(true)
    await page.getByRole('button',{name:'Actualizar contexto documental sintético',exact:true}).click()
    await expect(page.getByLabel('Versión de contexto documental sintético',{exact:true})).toHaveText('1')
    await expect(current).toBeVisible();await expect(old).toHaveCount(0)
   }
   expect(reads.at(-1)).toMatchObject({target_kind:mode==='target'?'contract':'customer',target_id:mode==='target'?contract:b})
  }
  expect(commands).toEqual([]);expect(errors).toEqual([])
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.screenshot({path:info.outputPath(`document-context-${mode}.png`)})
 }finally{release();await page.close()}
})
