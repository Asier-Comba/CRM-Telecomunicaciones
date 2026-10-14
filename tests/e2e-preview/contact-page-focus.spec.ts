import {expect,test} from '@playwright/test'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const id='10000000-0000-4000-8000-000000000001'
const customer={contract_version:'product.v1',id,version:1,account_kind:'legal_entity',legal_name:'Synthetic contact keyboard company',trade_name:null,lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}
const row=(n:number)=>({id:`20000000-0000-4000-8000-${String(n).padStart(12,'0')}`,version:1,customer_id:id,display_name:`Synthetic contact ${n}`,job_title:null,status:'active',is_primary:n===1,has_email:false,has_phone:false})
for(const width of [390,768,1440])test(`contact pagination keeps keyboard context and respects chosen focus at ${width}`,async({page},info)=>{
 const fixture=await startCustomerResourceFixture();let release!:()=>void,releasePrevious!:()=>void,nextWaiting=false,previous=false,previousWaiting=false,deny=false
 const nextHeld=new Promise<void>(resolve=>release=resolve),previousHeld=new Promise<void>(resolve=>releasePrevious=resolve),inputs:unknown[]=[],commands:string[]=[]
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(q.operation==='customer.editor'){await route.fulfill({json:{ok:true,data:customer}});return}
  if(q.operation==='contact.list'){
   inputs.push(q.input);const next=!!q.input.after_id
   if(deny){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   if(next){nextWaiting=true;await nextHeld}else if(previous){previousWaiting=true;await previousHeld}
   await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:Array.from({length:next?4:20},(_,i)=>row(i+(next?21:1))),next_id:next?null:row(20).id}}});return
  }
  if(route.request().url().endsWith('/commands'))commands.push(q.operation)
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=detail');await expect(page.getByRole('heading',{name:customer.legal_name,exact:true})).toBeVisible();await page.getByRole('tab',{name:'Contactos',exact:true}).click()
  const panel=page.getByRole('tabpanel');await expect(panel.getByRole('article')).toHaveCount(20)
  const next=panel.getByRole('button',{name:'Siguiente página de contactos',exact:true});await next.focus();await page.keyboard.press('Enter');await expect.poll(()=>nextWaiting).toBe(true);await expect(panel.getByRole('article')).toHaveCount(0)
  release();await expect(panel.getByRole('article')).toHaveCount(4)
  process.stdout.write(JSON.stringify({contact_paging_focus:{...(await page.evaluate(()=>({tag:document.activeElement?.tagName,body:document.activeElement===document.body,disabled:document.activeElement instanceof HTMLButtonElement?document.activeElement.disabled:null})))}})+'\n')
  await expect(panel.getByText('Página 2 · Hasta 20 contactos',{exact:true})).toBeFocused()
  expect(inputs).toEqual([{customer_id:id,limit:20,sort:'id_asc'},{customer_id:id,limit:20,sort:'id_asc',after_id:row(20).id}])
  await page.screenshot({path:info.outputPath(`contacts-current-page-${width}.png`)})
  previous=true;await panel.getByRole('button',{name:'Página anterior de contactos',exact:true}).click();await expect.poll(()=>previousWaiting).toBe(true)
  const add=panel.getByRole('button',{name:'Añadir contacto',exact:true});await add.focus();releasePrevious();await expect(panel.getByRole('article')).toHaveCount(20);await expect(add).toBeFocused()
  deny=true;await next.focus();await page.keyboard.press('Enter');await expect(panel.getByRole('alert')).toBeFocused();await expect(panel.getByRole('article')).toHaveCount(0)
  deny=false;await panel.getByRole('button',{name:'Volver a consultar contactos',exact:true}).click();await expect(panel.getByRole('article')).toHaveCount(4)
  expect(commands).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{release();releasePrevious();try{if(!page.isClosed()){await page.unrouteAll({behavior:'wait'});await page.close()}}finally{await fixture.close()}}
})
