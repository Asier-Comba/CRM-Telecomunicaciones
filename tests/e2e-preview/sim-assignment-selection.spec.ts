import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startTelecomResourceFixture} from './fixtures/telecom-resource-server.cjs'
const id=(prefix:number,n:number)=>prefix+'0000000-0000-4000-8000-'+String(n).padStart(12,'0')
for(const kind of ['physical','esim'] as const)for(const width of [390,768,1440])test('SIM assignment selection currency '+kind+' at '+width,async({page},info)=>{
 const fixture=await startTelecomResourceFixture(),reads:{operation:string;input:Record<string,unknown>}[]=[],commands:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 let liveVersion=1,pointsA=0,heldA=false,heldB=false,releaseA:()=>void=()=>{},releaseB:()=>void=()=>{}
 const gateA=new Promise<void>(resolve=>{releaseA=resolve}),gateB=new Promise<void>(resolve=>{releaseB=resolve})
 const line=(n:number)=>({id:id(5,n),version:n===1?liveVersion:1,service_id:id(7,n),customer_id:id(1,1),contract_id:id(6,1),operator_id:id(2,1),plan_version_id:null,display_name:'Synthetic line '+n,status:'active',source:'manual',activated_on:'2026-10-01',ended_on:null,service_kind:'mobile',masked_msisdn:'••••456',sim_id:null,sim_kind:null,sim_status:null,masked_iccid:null,masked_eid:null,portability_id:null,portability_status:null,open_commitment_count:0,next_commitment_ends_on:null})
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON(),{operation,input}=q;reads.push(q)
  const reply=(data:unknown)=>route.fulfill({json:{ok:true,data}})
  if(operation==='sim.assign'){commands.push(q);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(operation==='sim.get'){await reply({contract_version:'sim.v1',operation,record:{id:id(4,1),version:1,customer_id:id(1,1),operator_id:id(2,1),kind,display_label:'Synthetic SIM '+kind,status:'prepared',source:'manual',masked_iccid:'••••123',masked_eid:kind==='esim'?'••••789':null,assigned_line_id:null,activated_at:null,replaced_at:null,deactivated_at:null,cancelled_at:null,created_at:'2026-10-01T12:00:00Z',updated_at:'2026-10-15T12:00:00Z'}});return}
  if(operation==='line.list'){
   if(input.limit===1){const n=Number(String(input.after_id).slice(-12))+1;if(n===1&&++pointsA===2){liveVersion=2;heldA=true;await gateA}if(n===2){heldB=true;await gateB}await reply({contract_version:'telecom.collections.v1',operation,items:[line(n)],next_id:null})}
   else await reply({contract_version:'telecom.collections.v1',operation,items:[line(1),line(2)],next_id:null})
   return
  }
  if(operation==='portfolio.get'){
   const base={id:input.id,version:1,status:'active',source:'manual',customer_id:id(1,1),operator_id:id(2,1),plan_version_id:null}
   await reply({contract_version:'portfolio.v1',kind:input.kind,record:input.kind==='contract'?{...base,start_date:'2026-10-01',signed_date:'2026-10-01',end_date:null,assigned_user_id:null}:{...base,contract_id:id(6,1),service_kind:'mobile',display_name:'Synthetic service',activated_on:'2026-10-01',ended_on:null,status_effective_on:'2026-10-01'}});return
  }
  if(operation==='customer.list'){await reply({contract_version:'telecom.collections.v1',operation,items:[{id:id(1,1),version:1,display_name:'Synthetic customer',account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null});return}
  if(operation==='operator.get'){await reply({contract_version:'telecom.collections.v1',operation,record:{id:input.id,version:1,code:'synthetic_operator',display_name:'Synthetic operator',status:'active',source:'manual'}});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=sim&reset_scope=1')
  const select=page.getByRole('combobox',{name:'Línea para SIM',exact:true}),review=page.getByRole('button',{name:'Revisar asignación de SIM/eSIM',exact:true})
  await select.selectOption(id(5,1));await expect(review).toBeEnabled()
  await select.selectOption(id(5,2));await expect.poll(()=>heldB).toBe(true);await expect(review).toBeDisabled()
  await select.selectOption(id(5,1));await expect.poll(()=>heldA).toBe(true)
  await expect(review).toBeDisabled()
  await expect(page.getByText('Comprobando la línea seleccionada…',{exact:true})).toBeVisible()
  await review.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('sim-assignment-checking-'+kind+'-'+width+'.png')})
  expect(commands).toEqual([])
  const response=page.waitForResponse(r=>{const q=r.request().postDataJSON();return q?.operation==='line.list'&&q?.input.limit===1&&q?.input.after_id===id(5,0)})
  releaseB();releaseA();await (await response).finished();await page.waitForLoadState('networkidle');expect(reads.filter(q=>q.operation==='portfolio.get'&&q.input.kind==='service'&&q.input.id===id(7,2))).toHaveLength(0);await expect(review).toBeDisabled()
  await expect(page.getByText('La línea seleccionada no está disponible para esta asignación. Actualiza las líneas disponibles antes de continuar.',{exact:true})).toBeVisible()
  await review.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('sim-assignment-unavailable-'+kind+'-'+width+'.png')})
  await page.getByRole('button',{name:'Actualizar líneas disponibles',exact:true}).click();await select.selectOption(id(5,1));await expect(review).toBeEnabled()
  await review.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('sim-assignment-current-'+kind+'-'+width+'.png')})
  await review.click();const confirmation=page.getByRole('dialog',{name:'Confirmar cambio de SIM/eSIM',exact:true});await confirmation.getByRole('button',{name:'Confirmar cambio',exact:true}).click();await expect(confirmation.getByRole('alert')).toHaveText('No tienes permiso para esta acción.')
  expect(commands).toHaveLength(1);expect(commands[0].input).toMatchObject({id:id(4,1),expected_version:1,line_id:id(5,1),expected_line_version:2});await confirmation.getByRole('button',{name:'Cancelar',exact:true}).click();await expect(confirmation).toHaveCount(0);expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{releaseA();releaseB();await writeFile(info.outputPath('observations.json'),JSON.stringify({kind,width,pointsA,liveVersion,reads,commands,errors},null,2));await page.close();await fixture.close()}
})
