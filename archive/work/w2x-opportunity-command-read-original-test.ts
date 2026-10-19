import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startPipelineCurrentFixture} from './fixtures/pipeline-current-server.cjs'
const id='30000000-0000-4000-8000-000000000001',customer='10000000-0000-4000-8000-000000000001',first='20000000-0000-4000-8000-000000000001',second='20000000-0000-4000-8000-000000000002'
const modes=['company','current'] as const,widths=[390]
for(const flow of ['stage','editor'] as const)for(const mode of modes)for(const width of widths)test('opportunity command read '+flow+' '+mode+' at '+width,async({page},info)=>{
 const fixture=await startPipelineCurrentFixture(),commands:{operation:string;input:Record<string,unknown>}[]=[],reads:unknown[]=[],errors:string[]=[]
 let release:()=>void=()=>{},held=false;const gate=new Promise<void>(resolve=>{release=resolve}),operation=flow==='stage'?'opportunity.change_stage':'opportunity.update'
 let record={id,version:1,title:'Synthetic opportunity lifetime',status:'open',customer_id:customer,stage_id:first,owner_user_id:null,amount_minor:null,currency:null,next_follow_up_at:null,expected_close_date:null,next_action:null,source:'manual',links:[],history:[],history_partial:false}
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(q.operation==='opportunity.stages'){await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:[{id:first,code:'first',display_name:'Initial stage',position:0,outcome:null,status:'active'},{id:second,code:'second',display_name:'Next stage',position:1,outcome:null,status:'active'}],next_id:null}}});return}
  if(q.operation==='global.search'){await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:[{kind:'customer',id:customer,customer_id:customer,label:'Synthetic opportunity customer',status:'active'},{kind:'opportunity',id,customer_id:customer,label:record.title,status:'open'}]}}});return}
  if(q.operation===operation){commands.push(q);held=true;await gate;record={...record,version:2,...(flow==='stage'?{stage_id:second}:{title:String(q.input.title)})};await route.fulfill({json:{ok:true,receipt:{contract_version:'product.v1',operation,command_id:q.input.command_id,id,version:2,status:'open'}}});return}
  if(q.operation==='work.get'){reads.push(q);await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',kind:'opportunity',record}}});return}
  if(['assignee.list','contract.list','service.list','customer.list'].includes(q.operation)){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}}});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 let before=0,after=0
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+(flow==='editor'?'/#edit=true':''))
  const drawer=page.getByRole('dialog',{name:'Detalle de oportunidad',exact:true})
  if(flow==='editor'){await expect(drawer).toBeVisible();await drawer.getByLabel('Título comercial',{exact:true}).fill('Synthetic opportunity changed');await drawer.getByRole('button',{name:'Guardar oportunidad',exact:true}).click()}
  else{await expect(page.getByRole('button',{name:'Nueva oportunidad',exact:true})).toBeEnabled();await page.getByRole('textbox',{name:'Consultar pipeline local',exact:true}).fill('Synthetic opportunity');await page.getByRole('button',{name:'Consultar pipeline',exact:true}).click();const select=page.getByRole('combobox',{name:'Mover etapa de Synthetic opportunity lifetime',exact:true});await expect(select).toHaveValue(first);await select.selectOption(second)}
  await expect.poll(()=>held).toBe(true)
  if(mode!=='current'){
   await page.getByRole('button',{name:mode==='company'?'Cambiar empresa sintética':mode==='actor'?'Cambiar actor sintético':'Cambiar a lector sintético',exact:true}).dispatchEvent('click')
   if(flow==='editor'){await expect(drawer.getByLabel('Título comercial',{exact:true})).toHaveValue('Synthetic opportunity lifetime')}
   else await expect(page.getByText('Escribe una empresa u oportunidad y consulta el pipeline.',{exact:true})).toBeVisible()
  }
  before=reads.length;const response=page.waitForResponse(r=>r.request().postDataJSON()?.operation===operation);release();await (await response).finished();await page.waitForLoadState('networkidle');after=reads.length
  expect(after-before).toBe(mode==='current'?1:0);expect(commands).toHaveLength(1);expect(commands[0].input.id).toBe(id);expect(commands[0].input.expected_version).toBe(1)
  if(flow==='stage')expect(commands[0].input.stage_id).toBe(second);else expect(commands[0].input.title).toBe('Synthetic opportunity changed')
  if(mode==='current'){if(flow==='editor')await expect(drawer).toHaveCount(0);else await expect(page.getByText('Etapa guardada y comprobada.',{exact:true})).toBeVisible()}
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:info.outputPath('opportunity-command-'+flow+'-'+mode+'-'+width+'.png')})
 }finally{release();await writeFile(info.outputPath('observations.json'),JSON.stringify({flow,mode,width,reads,commands,before,after,errors},null,2));await page.close();await fixture.close()}
})
