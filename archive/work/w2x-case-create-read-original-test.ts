import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startTelecomResourceFixture} from './fixtures/telecom-resource-server.cjs'
const id=(prefix:number,n:number)=>prefix+'0000000-0000-4000-8000-'+String(n).padStart(12,'0')
for(const mode of ['reference','company','actor','reader','current'] as const)for(const width of [390,768,1440])test('case create read '+mode+' at '+width,async({page},info)=>{
 const fixture=await startTelecomResourceFixture(),reads:{operation:string;input:Record<string,unknown>}[]=[],commands:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 let held=false,written=false,release:()=>void=()=>{};const gate=new Promise<void>(resolve=>{release=resolve})
 const row={id:id(8,1),version:1,customer_id:id(1,1),contract_id:null,service_id:null,line_id:null,case_type:'technical',title:'Synthetic incident',priority:'normal',due_on:null,assigned_user_id:null,status:'open',source:'manual',resolved_at:null,closed_at:null,resolution_code:null,cancellation_code:null,internal_note_count:0,created_at:'2026-10-15T12:00:00Z',updated_at:'2026-10-15T12:00:00Z',overdue:false}
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON(),{operation,input}=q;reads.push(q)
  const reply=(data:unknown)=>route.fulfill({json:{ok:true,data}})
  if(operation==='case.create'){
   commands.push(q);held=true;await gate;written=true
   await reply({contract_version:'case.v1',operation,command_id:input.command_id,id:row.id,version:1,status:'open',source:'manual',resolution_code:null,cancellation_code:null,note_id:null,note_seq:null});return
  }
  if(operation==='case.get'){await reply({contract_version:'case.v1',operation,record:row});return}
  if(operation==='case.list'){await reply({contract_version:'case.v1',operation,items:written&&input.customer_id===id(1,1)?[row]:[],next_id:null});return}
  if(operation==='customer.list'){const n=Number(String(input.after_id).slice(-12))+1;await reply({contract_version:'telecom.collections.v1',operation,items:[{id:id(1,n),version:1,display_name:'Synthetic customer '+n,account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null});return}
  if(operation==='contract.list'||operation==='assignee.list'){await reply({contract_version:'telecom.collections.v1',operation,items:[],next_id:null});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 let before=0
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=case-create&reset_scope=1');await page.getByRole('button',{name:'Nueva incidencia',exact:true}).click();const form=page.getByRole('dialog',{name:'Nueva incidencia',exact:true});await form.getByLabel('Título de incidencia',{exact:true}).fill(row.title);await form.getByRole('button',{name:'Revisar incidencia',exact:true}).click();await page.getByRole('dialog',{name:'Registrar incidencia',exact:true}).getByRole('button',{name:'Registrar incidencia',exact:true}).click();await expect.poll(()=>held).toBe(true)
  if(mode!=='current'){
   await page.getByRole('button',{name:mode==='reference'?'Seleccionar recurso B':mode==='company'?'Cambiar empresa sintética':mode==='actor'?'Cambiar actor sintético':'Cambiar a lector sintético',exact:true}).dispatchEvent('click');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByText('No hay registros de incidencias en esta página.',{exact:true})).toBeVisible()
  }
  before=reads.filter(q=>q.operation==='case.get'&&q.input.id===row.id).length
  const response=page.waitForResponse(r=>r.request().postDataJSON()?.operation==='case.create');release();await (await response).finished();await page.waitForLoadState('networkidle')
  const after=reads.filter(q=>q.operation==='case.get'&&q.input.id===row.id).length
  expect(after-before).toBe(mode==='current'?1:0)
  if(mode==='current'){await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('link',{name:'Ver incidencia registrada',exact:true})).toHaveAttribute('href','/cases/'+row.id);await expect(page.getByRole('status').filter({hasText:'Incidencia registrada:'})).toContainText(row.title);await page.screenshot({path:info.outputPath('case-create-current-'+width+'.png')})}
  expect(commands).toHaveLength(1);expect(commands[0].input).toMatchObject({customer_id:id(1,1),contract_id:null,service_id:null,line_id:null,assigned_user_id:null,title:row.title,case_type:'technical',priority:'normal',due_on:null});expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{release();await writeFile(info.outputPath('observations.json'),JSON.stringify({mode,width,before,reads,commands,errors},null,2));await page.close();await fixture.close()}
})
