import {expect,test,type Route} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const id=(p:number,n:number)=>`${p}0000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const service=(n:number,retired:boolean)=>({id:id(5,n),version:1,customer_id:id(1,1),contract_id:id(6,1),operator_id:id(2,1),plan_version_id:null,service_kind:'fiber',display_name:(retired?'Servicio retirado ':'Servicio recuperado ')+n,status:'active',source:'manual',activated_on:'2026-10-01',ended_on:null})
for(const width of [390,768,1440])for(const mode of ['chosen_control','kind_supersedes','customer_supersedes'])test(`document destination pending read ${mode} at ${width}`,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),held:Route[]=[],reads:{operation:string;input:unknown}[]=[],commands:string[]=[],unexpected:string[]=[],errors:string[]=[];let calls=0
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();reads.push(q)
  if(route.request().url().includes('/commands')){commands.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(q.operation==='document.list'){await route.fulfill({json:{ok:true,data:{contract_version:'document.v1',operation:q.operation,items:[],next_id:null}}});return}
  if(q.operation==='service.list'){calls++;if(calls===1){await route.fulfill({status:403,json:{ok:false,error:'access_denied',private_body:'PRIVATE_OLD_DOCUMENT_TARGET'}});return}held.push(route);return}
  unexpected.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=customer-document-targets'+(mode==='customer_supersedes'?'&customerProbe=1':''));await expect.poll(()=>reads.filter(q=>q.operation==='document.list').length).toBe(1)
  const kind=page.getByRole('combobox',{name:'Destino de documentos del cliente',exact:true}),select=page.getByRole('combobox',{name:'Registro para documentos del cliente',exact:true});await kind.selectOption('service');await expect(page.getByRole('alert')).toBeVisible();const retry=page.getByRole('button',{name:'Reintentar destinos',exact:true});await retry.focus();await page.keyboard.press('Enter');await expect.poll(()=>held.length).toBe(1);await expect(select).toBeDisabled()
  if(mode==='chosen_control')await kind.focus()
  else{if(mode==='kind_supersedes')await kind.selectOption('customer');else await page.getByRole('button',{name:'Seleccionar cliente B',exact:true}).click();await expect(kind).toHaveValue('customer');await expect(select).toHaveCount(0);await expect.poll(()=>reads.filter(q=>q.operation==='document.list').length).toBe(2);await expect(page.getByText('Sin documentos en esta página.',{exact:true})).toBeVisible()}
  const route=held[0],response=page.waitForResponse(v=>v.url()===route.request().url()&&v.request().postData()===route.request().postData());await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:'service.list',items:Array.from({length:20},(_,i)=>service(i+1,mode!=='chosen_control')),next_id:id(5,20)}}});await (await response).finished();await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))
  if(mode==='chosen_control'){await expect(kind).toBeFocused();await expect(kind).toHaveValue('service');await expect(select).toBeEnabled();await expect(select.locator('option')).toHaveCount(21);await expect(select).toHaveValue('');await expect(page.getByRole('heading',{name:'Documentos',exact:true})).toHaveCount(0)}
  else{await expect(kind).toHaveValue('customer');await expect(select).toHaveCount(0);await expect(page.getByRole('heading',{name:'Documentos',exact:true})).toBeVisible();await expect(page.getByRole('option',{name:/Servicio retirado/})).toHaveCount(0);await expect(page.getByRole('alert')).toHaveCount(0)}
  await expect(page.getByText('PRIVATE_OLD_DOCUMENT_TARGET',{exact:true})).toHaveCount(0);expect(reads.filter(q=>q.operation==='service.list')).toEqual(Array.from({length:2},()=>({operation:'service.list',input:{customer_id:id(1,1),limit:20}})));const targets=reads.filter(q=>q.operation==='document.list').map(q=>q.input);expect(targets).toEqual([{target_kind:'customer',target_id:id(1,1),status:'active',limit:20},...(mode==='chosen_control'?[]:[{target_kind:'customer',target_id:id(1,mode==='customer_supersedes'?2:1),status:'active',limit:20}])]);expect(commands).toEqual([]);expect(unexpected).toEqual([]);expect(errors).toEqual([])
  await writeFile(info.outputPath('observations.json'),JSON.stringify({width,mode,interaction:'CHOSEN_CONTROL_AND_DESTINATION_CUSTOMER_RETIREMENT_UI_PASS',transportComplete:true,retiredCase:mode!=='chosen_control',observationWindow:'BODY_FINISHED_THEN_TWO_ANIMATION_FRAMES',focus:await page.evaluate(()=>({tag:document.activeElement?.tagName,body:document.activeElement===document.body})),reads,commands,unexpected,errors},null,2));await page.screenshot({path:info.outputPath(`document-destination-retirement-${mode}-${width}.png`),fullPage:false})
 }finally{await page.close();await fixture.close()}
})
