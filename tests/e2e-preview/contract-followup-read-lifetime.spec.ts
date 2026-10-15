import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const customer='10000000-0000-4000-8000-000000000001',contract='20000000-0000-4000-8000-000000000001',operator='30000000-0000-4000-8000-000000000001',recordId='40000000-0000-4000-8000-000000000001'
const parent={id:contract,version:1,customer_id:customer,operator_id:operator,plan_version_id:null,start_date:'2026-10-01',signed_date:null,end_date:null,assigned_user_id:null,status:'active',source:'manual'}
for(const flow of ['renewal','permanence'] as const)for(const mode of ['retired_company','retired_actor','retired_reader','retired_inventory','current','child_denied','parent_denied','child_foreign','parent_foreign'] as const)for(const width of [390,768,1440])test('contract followup '+flow+' '+mode+' at '+width,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),reads:{operation:string;input:Record<string,unknown>}[]=[],commands:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 let held=false,failed=false,release:()=>void=()=>{}
 const gate=new Promise<void>(resolve=>{release=resolve}),renewal=flow==='renewal',noun=renewal?'renovación':'permanencia'
 const operation=renewal?'contract.record_renewal':'permanence.create_manual'
 const child=renewal?{id:recordId,version:1,status:'open',source:'manual',contract_id:contract,target_on:'2027-10-01',opens_on:null,closes_on:null,reason_code:null}:{id:recordId,version:1,status:'open',source:'manual',contract_id:contract,service_id:null,commitment_kind:'minimum_term',starts_on:'2026-10-01',ends_on:'2027-10-01',reason_code:'manual_record'}
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();reads.push(q)
  if(q.operation===operation){
   commands.push(q);expect(q.input.contract_id).toBe(contract)
   if(renewal){expect(q.input.target_on).toBe('2027-10-01');expect(q.input.opens_on).toBeNull();expect(q.input.closes_on).toBeNull()}
   else{expect(q.input.starts_on).toBe('2026-10-01');expect(q.input.ends_on).toBe('2027-10-01');expect(q.input.commitment_kind).toBe('minimum_term');expect(q.input.reason_code).toBe('manual_record')}
   await route.fulfill({json:{ok:true,receipt:{contract_version:'portfolio.v1',operation,command_id:q.input.command_id,id:recordId,version:1,status:'open',source:'manual'}}});return
  }
  if(q.operation==='portfolio.get'){
   const isChild=q.input.kind===flow,isReadbackParent=q.input.kind==='contract'&&commands.length>0
   if(isChild&&mode.startsWith('retired')&&!held){held=true;await gate}
   if(!failed&&(mode==='child_denied'&&isChild||mode==='parent_denied'&&isReadbackParent)){failed=true;await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   let record=isChild?child:parent
   if(!failed&&mode==='child_foreign'&&isChild){failed=true;record={...child,contract_id:contract.slice(0,-1)+'2'}}
   if(!failed&&mode==='parent_foreign'&&isReadbackParent){failed=true;record={...parent,customer_id:customer.slice(0,-1)+'2'}}
   await route.fulfill({json:{ok:true,data:{contract_version:'portfolio.v1',kind:q.input.kind,record}}});return
  }
  if(q.operation==='contract.list'){const {signed_date,...row}=parent;void signed_date;await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[row],next_id:null}}});return}
  if(q.operation==='operator.get'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,record:{id:operator,version:1,code:'synthetic_operator',display_name:'Operador sintético',status:'active',source:'manual'}}}});return}
  if(q.operation===flow+'.list'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}}});return}
  throw new Error('UNEXPECTED_OPERATION_'+q.operation)
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=contract-followup-lifetime&flow='+flow)
  await page.getByRole('button',{name:'Nueva '+noun+' manual',exact:true}).click()
  const preparing=page.getByRole('dialog',{name:'Nueva '+noun+' del cliente',exact:true}),select=preparing.getByRole('combobox',{name:'Contrato de la '+noun,exact:true})
  await expect(select).toBeEnabled();await select.selectOption(contract);await preparing.getByRole('button',{name:'Continuar con el contrato',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:renewal?'Registrar renovación manual':'Registrar permanencia manual',exact:true})
  await expect(dialog).toBeVisible()
  if(renewal)await dialog.getByLabel('Fecha objetivo').fill('2027-10-01')
  else{await dialog.getByLabel('Inicio de permanencia').fill('2026-10-01');await dialog.getByLabel('Fin de permanencia').fill('2027-10-01')}
  await dialog.getByRole('button',{name:renewal?'Registrar seguimiento':'Registrar permanencia',exact:true}).click()
  if(mode.startsWith('retired')){
   await expect.poll(()=>held).toBe(true)
   const name=mode==='retired_company'?'Cambiar empresa sintética':mode==='retired_actor'?'Cambiar actor sintético':mode==='retired_reader'?'Cambiar a lector sintético':'Cerrar seguimiento sintético'
   await page.getByRole('button',{name,exact:true}).dispatchEvent('click');await expect(dialog).toHaveCount(0)
   const response=page.waitForResponse(r=>r.request().postDataJSON()?.operation==='portfolio.get'&&r.request().postDataJSON()?.input.kind===flow)
   release();await (await response).finished();await page.waitForLoadState('networkidle')
   expect(reads.filter(q=>q.operation==='portfolio.get'&&q.input.kind==='contract')).toHaveLength(1)
   await expect(page.getByRole('link',{name:'Ver '+noun+' registrada',exact:true})).toHaveCount(0)
  }else{
   if(mode!=='current'){
    await expect(dialog.getByRole('alert')).toHaveText('El alta está registrada. Falta consultar su estado actual.')
    if(mode==='child_denied'||mode==='child_foreign')expect(reads.filter(q=>q.operation==='portfolio.get'&&q.input.kind==='contract')).toHaveLength(1)
    await dialog.getByRole('button',{name:'Consultar '+noun+' registrada',exact:true}).click()
   }
   const link=page.getByRole('link',{name:'Ver '+noun+' registrada',exact:true})
   await expect(link).toHaveAttribute('href','/portfolio?kind='+flow+'&id='+recordId)
   await expect(page.getByRole('status').filter({has:link})).toContainText(renewal?'Seguimiento de renovación registrado':'Permanencia registrada')
   expect(reads.filter(q=>q.operation==='portfolio.get').every(q=>q.input.kind==='contract'?q.input.id===contract:q.input.kind===flow&&q.input.id===recordId)).toBe(true)
  }
  expect(commands).toHaveLength(1);expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.screenshot({path:info.outputPath('followup-'+flow+'-'+mode+'-'+width+'.png')})
 }finally{release();await writeFile(info.outputPath('observations.json'),JSON.stringify({flow,mode,width,held,reads,commands,errors},null,2));await page.unrouteAll({behavior:'wait'});await page.close();await fixture.close()}
})
