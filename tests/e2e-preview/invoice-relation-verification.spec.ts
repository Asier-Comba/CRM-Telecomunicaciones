import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startBillingFocusFixture} from './fixtures/billing-focus-server.cjs'
const uuid=(kind:number,n:number)=>kind+'0000000-0000-4000-8000-'+String(n).padStart(12,'0'),customer=uuid(1,2),selected=uuid(3,21),operator=uuid(2,1)
const contract=(n:number)=>({id:uuid(3,n),version:1,customer_id:customer,operator_id:operator,plan_version_id:null,assigned_user_id:null,status:'active',source:'manual',start_date:'2026-10-01',end_date:null})
for(const width of [390,768,1440])for(const mode of ['pending-found','pending-denied','pending-mismatch','current'] as const)test('invoice relation verification '+mode+' at '+width,async({page},info)=>{
 const fixture=await startBillingFocusFixture(),reads:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 let held=false,release:()=>void=()=>{};const gate=new Promise<void>(resolve=>{release=resolve})
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();reads.push(q);const reply=(data:unknown)=>route.fulfill({json:{ok:true,data}})
  if(q.operation==='contract.list'){
   if(q.input.limit===1){held=true;if(mode!=='current')await gate
    if(mode==='pending-denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
    const row=contract(21);if(mode==='pending-mismatch')row.customer_id=uuid(1,3)
    await reply({contract_version:'telecom.collections.v1',operation:q.operation,items:[row],next_id:null});return
   }
   await reply({contract_version:'telecom.collections.v1',operation:q.operation,items:Array.from({length:20},(_,i)=>contract(i+1)),next_id:uuid(3,20)});return
  }
  if(q.operation==='operator.get'){await reply({contract_version:'telecom.collections.v1',operation:q.operation,record:{id:operator,version:1,code:'synthetic',display_name:'Operador sintético actual',status:'active',source:'manual'}});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 const select=page.getByRole('combobox',{name:'Contrato de factura',exact:true}),option=select.locator('option:checked'),verification=page.getByLabel('Verificación de relación sintética',{exact:true})
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/facturacion?relation_scope=1');await expect.poll(()=>held).toBe(true);await expect(select).toBeEnabled();await expect(select).toHaveValue(selected)
  if(mode!=='current'){
   await expect(option).toHaveText('Comprobando relación…');await expect(verification).toContainText('"linkId":null');await expect(page.getByText('La relación seleccionada no está disponible para este cliente y contrato.',{exact:true})).toHaveCount(0)
   await page.screenshot({path:info.outputPath('invoice-relation-pending-'+mode+'-'+width+'.png')})
   release()
  }
  if(mode==='current'||mode==='pending-found'){await expect(option).toContainText('Operador sintético actual');await expect(verification).toContainText('"linkId":"'+selected+'"');await expect(page.getByText('La relación seleccionada no está disponible para este cliente y contrato.',{exact:true})).toHaveCount(0)}
  else{await expect(option).toHaveText('Relación no disponible');await expect(verification).toContainText('"linkId":null');await expect(page.getByText('La relación seleccionada no está disponible para este cliente y contrato.',{exact:true})).toBeVisible()}
  const points=reads.filter(q=>q.operation==='contract.list'&&q.input.limit===1);expect(points).toHaveLength(1);expect(points[0].input).toEqual({customer_id:customer,limit:1,sort:'id_asc',after_id:uuid(3,20)})
  await page.screenshot({path:info.outputPath('invoice-relation-settled-'+mode+'-'+width+'.png')});expect(errors).toEqual([]);expect(reads.every(q=>q.operation==='contract.list'||q.operation==='operator.get')).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{release();fixture.releaseList();fixture.releasePdf();await writeFile(info.outputPath('observations.json'),JSON.stringify({mode,width,reads,errors},null,2));await page.close();await fixture.close()}
})
