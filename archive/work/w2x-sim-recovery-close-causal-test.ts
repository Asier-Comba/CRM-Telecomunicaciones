import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startTelecomResourceFixture} from './fixtures/telecom-resource-server.cjs'
const customer='10000000-0000-4000-8000-000000000001',operatorId='20000000-0000-4000-8000-000000000001',id='80000000-0000-4000-8000-000000000001'
for(const kind of ['physical','esim'] as const)for(const mode of ['uncertain','read_failed','review','denied'] as const)for(const width of [390,768,1440])test('SIM recovery close '+kind+' '+mode+' at '+width,async({page},info)=>{
 const fixture=await startTelecomResourceFixture(),commands:{operation:string;input:Record<string,unknown>}[]=[],calls:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[],applied=new Set<string>()
 let effects=0,reject=mode==='denied',readFailed=false,controls:unknown,effectsAfterDenied:number|undefined
 const row={id,version:1,customer_id:customer,operator_id:operatorId,kind,display_label:'Synthetic reviewed SIM',status:'prepared',source:'manual',masked_iccid:null,masked_eid:null,assigned_line_id:null,activated_at:null,replaced_at:null,deactivated_at:null,cancelled_at:null,created_at:'2026-10-18T12:00:00Z',updated_at:'2026-10-18T12:00:00Z'},operator={id:operatorId,version:1,code:'synthetic_operator',display_name:'Synthetic recovery operator',status:'active',source:'manual'}
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();calls.push(q);const reply=(data:unknown)=>route.fulfill({json:{ok:true,data}})
  if(q.operation==='sim.create'){
   commands.push(q)
   if(reject){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   if(!applied.has(String(q.input.command_id))){applied.add(String(q.input.command_id));effects++}
   if(mode==='uncertain'&&commands.length===1){await route.abort('failed');return}
   await reply({contract_version:'sim.v1',operation:q.operation,command_id:q.input.command_id,id,version:1,status:'prepared',source:'manual',association_id:null,replacement_id:null,replacement_version:null,replacement_status:null,replacement_association_id:null});return
  }
  if(q.operation==='sim.get'){if(mode==='read_failed'&&effects&&!readFailed){readFailed=true;await route.fulfill({status:503,json:{ok:false,error:'internal_safe'}});return};await reply({contract_version:'sim.v1',operation:q.operation,record:row});return}
  if(q.operation==='sim.list'){await reply({contract_version:'sim.v1',operation:q.operation,items:effects?[row]:[],next_id:null});return}
  if(q.operation==='customer.list'){await reply({contract_version:'telecom.collections.v1',operation:q.operation,items:[{id:customer,version:1,display_name:'Synthetic SIM customer',account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null});return}
  if(q.operation==='operator.list'){await reply({contract_version:'telecom.collections.v1',operation:q.operation,items:[operator],next_id:null});return}
  if(q.operation==='operator.get'){await reply({contract_version:'telecom.collections.v1',operation:q.operation,record:operator});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 const form=page.getByRole('dialog',{name:'Nueva SIM/eSIM',exact:true}),modal=page.getByRole('dialog',{name:'Registrar SIM/eSIM',exact:true})
 async function review(){await page.getByRole('button',{name:'Nueva SIM/eSIM',exact:true}).click();await form.getByLabel('Nombre de SIM/eSIM',{exact:true}).fill(row.display_label);await form.getByRole('combobox',{name:'Tipo de SIM',exact:true}).selectOption(kind);await form.getByRole('combobox',{name:'Operador de SIM/eSIM',exact:true}).selectOption(operatorId);await form.getByRole('button',{name:'Revisar alta de SIM/eSIM',exact:true}).click()}
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=sim-create&reset_scope=1');await review()
  const cancel=modal.getByRole('button',{name:'Cancelar',exact:true}),close=form.getByRole('button',{name:'Cerrar panel',exact:true})
  if(mode==='review'){await expect(cancel).toBeEnabled();await cancel.click();await expect(modal).toHaveCount(0);await expect(close).toBeEnabled();await close.click();await expect(form).toHaveCount(0);expect(commands).toHaveLength(0);expect(effects).toBe(0)}
  else{
   await modal.getByRole('button',{name:'Confirmar cambio',exact:true}).click()
   if(mode==='read_failed'){
    await expect(form.getByRole('status')).toHaveText('Cambio registrado. Reintentar solo actualiza la lectura.');await expect(form.getByRole('alert')).toBeVisible();controls={drawerCloseDisabled:await close.isDisabled()};await expect(close).toBeDisabled();await close.evaluate((b:HTMLButtonElement)=>b.click());await page.keyboard.press('Escape');await expect(form).toBeVisible();const retry=form.getByRole('button',{name:'Actualizar lectura',exact:true});await retry.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('sim-recovery-'+kind+'-'+mode+'-'+width+'.png')});await retry.click()
   }else{
    await expect(modal.getByRole('alert')).toBeVisible();controls={cancelDisabled:await cancel.isDisabled(),modalCloseDisabled:await modal.getByRole('button',{name:'Cerrar',exact:true}).isDisabled(),drawerCloseDisabled:await close.isDisabled()}
    if(mode==='denied'){
     effectsAfterDenied=effects;expect(effectsAfterDenied).toBe(0);expect(commands).toHaveLength(1);await expect(cancel).toBeEnabled();await cancel.click();await expect(modal).toHaveCount(0);await expect(close).toBeEnabled();await close.click();await expect(form).toHaveCount(0);reject=false;await review();await modal.getByRole('button',{name:'Confirmar cambio',exact:true}).click()
    }else{
     await expect(cancel).toBeDisabled();await expect(modal.getByRole('button',{name:'Cerrar',exact:true})).toBeDisabled();await expect(close).toBeDisabled();await cancel.evaluate((b:HTMLButtonElement)=>b.click());await page.keyboard.press('Escape');await expect(modal).toBeVisible();const retry=modal.getByRole('button',{name:'Reintentar misma operación',exact:true});await retry.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('sim-recovery-'+kind+'-'+mode+'-'+width+'.png')});await retry.click()
    }
   }
   await expect(form).toHaveCount(0);await expect(page.getByRole('link',{name:'Ver SIM/eSIM registrada',exact:true})).toHaveAttribute('href','/sims/'+id);expect(effects).toBe(1);expect(commands).toHaveLength(mode==='read_failed'?1:2)
   if(mode==='uncertain')expect(commands[1]).toEqual(commands[0]);if(mode==='denied'){expect(commands[1].input.command_id).not.toBe(commands[0].input.command_id);const {command_id:first,...input1}=commands[0].input,{command_id:second,...input2}=commands[1].input;expect(first).toBeTruthy();expect(second).toBeTruthy();expect(input2).toEqual(input1)}
   expect(commands.every(q=>q.operation==='sim.create'&&q.input.customer_id===customer&&q.input.operator_id===operatorId&&q.input.kind===kind&&q.input.display_label===row.display_label)).toBe(true)
  }
  expect(calls.filter(q=>!['sim.create','sim.get','sim.list','customer.list','operator.list','operator.get'].includes(q.operation))).toEqual([]);expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  if(mode==='review'||mode==='denied')await page.screenshot({path:info.outputPath('sim-recovery-'+kind+'-'+mode+'-'+width+'.png')})
 }finally{await writeFile(info.outputPath('observations.json'),JSON.stringify({kind,mode,width,controls,effectsAfterDenied,effects,commands,calls,errors},null,2));await page.unrouteAll({behavior:'wait'});await page.close();await fixture.close()}
})
