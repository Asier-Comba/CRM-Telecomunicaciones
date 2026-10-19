import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startTelecomResourceFixture} from './fixtures/telecom-resource-server.cjs'
const id=(prefix:number,n:number)=>prefix+'0000000-0000-4000-8000-'+String(n).padStart(12,'0')
for(const kind of ['physical','esim'] as const)for(const mode of ['reference','company','actor','reader','current'] as const)for(const width of [390,768,1440])test('SIM create read '+kind+' '+mode+' at '+width,async({page},info)=>{
 const fixture=await startTelecomResourceFixture(),reads:{operation:string;input:Record<string,unknown>}[]=[],commands:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 let held=false,written=false,release:()=>void=()=>{};const gate=new Promise<void>(resolve=>{release=resolve})
 const row={id:id(8,1),version:1,customer_id:id(1,1),operator_id:id(2,1),kind,display_label:'New synthetic SIM',status:'prepared',source:'manual',masked_iccid:null,masked_eid:null,assigned_line_id:null,activated_at:null,replaced_at:null,deactivated_at:null,cancelled_at:null,created_at:'2026-10-15T12:00:00Z',updated_at:'2026-10-15T12:00:00Z'}
 const operator={id:id(2,1),version:1,code:'synthetic_operator',display_name:'Synthetic operator',status:'active',source:'manual'}
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON(),{operation,input}=q;reads.push(q);const reply=(data:unknown)=>route.fulfill({json:{ok:true,data}})
  if(operation==='sim.create'){commands.push(q);held=true;await gate;written=true;await reply({contract_version:'sim.v1',operation,command_id:input.command_id,id:row.id,version:1,status:'prepared',source:'manual',association_id:null,replacement_id:null,replacement_version:null,replacement_status:null,replacement_association_id:null});return}
  if(operation==='sim.get'){await reply({contract_version:'sim.v1',operation,record:row});return}
  if(operation==='sim.list'){await reply({contract_version:'sim.v1',operation,items:written&&input.customer_id===id(1,1)?[row]:[],next_id:null});return}
  if(operation==='customer.list'){const n=Number(String(input.after_id).slice(-12))+1;await reply({contract_version:'telecom.collections.v1',operation,items:[{id:id(1,n),version:1,display_name:'Synthetic customer '+n,account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null});return}
  if(operation==='operator.list'){await reply({contract_version:'telecom.collections.v1',operation,items:!input.after_id||String(input.after_id)<operator.id?[operator]:[],next_id:null});return}
  if(operation==='operator.get'){await reply({contract_version:'telecom.collections.v1',operation,record:operator});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 let before=0
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=sim-create&reset_scope=1');await page.getByRole('button',{name:'Nueva SIM/eSIM',exact:true}).click();const form=page.getByRole('dialog',{name:'Nueva SIM/eSIM',exact:true});await form.getByLabel('Nombre de SIM/eSIM',{exact:true}).fill(row.display_label);await form.getByRole('combobox',{name:'Tipo de SIM',exact:true}).selectOption(kind);await form.getByRole('combobox',{name:'Operador de SIM/eSIM',exact:true}).selectOption(operator.id);await form.getByRole('button',{name:'Revisar alta de SIM/eSIM',exact:true}).click();await page.getByRole('dialog',{name:'Registrar SIM/eSIM',exact:true}).getByRole('button',{name:'Confirmar cambio',exact:true}).click();await expect.poll(()=>held).toBe(true)
  if(mode!=='current'){await page.getByRole('button',{name:mode==='reference'?'Seleccionar recurso B':mode==='company'?'Cambiar empresa sintética':mode==='actor'?'Cambiar actor sintético':'Cambiar a lector sintético',exact:true}).dispatchEvent('click');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByText('No hay registros de sim/esim en esta página.',{exact:true})).toBeVisible()}
  before=reads.filter(q=>q.operation==='sim.get'&&q.input.id===row.id).length
  const response=page.waitForResponse(r=>r.request().postDataJSON()?.operation==='sim.create');release();await (await response).finished();await page.waitForLoadState('networkidle');expect(reads.filter(q=>q.operation==='sim.get'&&q.input.id===row.id).length-before).toBe(mode==='current'?1:0)
  if(mode==='current'){await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('link',{name:'Ver SIM/eSIM registrada',exact:true})).toHaveAttribute('href','/sims/'+row.id);await expect(page.getByRole('status').filter({hasText:'SIM/eSIM registrada:'})).toContainText(row.display_label);await page.screenshot({path:info.outputPath('sim-create-current-'+kind+'-'+width+'.png')})}
  expect(commands).toHaveLength(1);expect(commands[0].input).toMatchObject({customer_id:id(1,1),operator_id:operator.id,kind,display_label:row.display_label});expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{release();await writeFile(info.outputPath('observations.json'),JSON.stringify({kind,mode,width,before,reads,commands,errors},null,2));await page.close();await fixture.close()}
})
