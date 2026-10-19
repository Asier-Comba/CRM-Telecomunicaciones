import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const id=(n:number)=>'10000000-0000-4000-8000-'+String(n).padStart(12,'0')
for(const width of [390,768,1440])for(const mode of ['loaded','reference','company','actor','reader','denied'] as const)test('attention customer identity '+mode+' at '+width,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),reads:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 let changed=false,held=false,release:()=>void=()=>{}
 const gate=new Promise<void>(resolve=>{release=resolve}),name='Synthetic initial customer',current='Synthetic current customer'
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();reads.push(q);const reply=(data:unknown)=>route.fulfill({json:{ok:true,data}})
  if(q.operation==='telecom.attention'){const day=new Date().toISOString().slice(0,10);await reply({contract_version:'telecom.attention.v1',operation:q.operation,as_of:day,fallback_on:day,items:[],next_cursor:null});return}
  if(q.operation==='assignee.list'){await reply({contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null});return}
  if(q.operation==='global.search'){await reply({contract_version:'product.v1',items:[{kind:'customer',id:id(2),customer_id:id(2),label:'Synthetic Beta customer',status:'active'}]});return}
  if(q.operation==='customer.list'){
   if(mode==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   if(changed){held=true;await gate}
   const n=Number(String(q.input.after_id).slice(-12))+1
   await reply({contract_version:'telecom.collections.v1',operation:q.operation,items:[{id:id(n),version:1,display_name:changed?current:name,account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null});return
  }
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 const banner=page.getByRole('region',{name:'Cliente del centro de atención',exact:true})
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=attention-context&customer='+id(1))
  if(mode==='denied'){
   await expect(banner.getByRole('link',{name:'Cliente no disponible',exact:true})).toBeVisible();await expect(banner.getByText(name,{exact:true})).toHaveCount(0)
  }else{
   await expect(banner.getByRole('link',{name,exact:true})).toHaveAttribute('href','/clients/'+id(1))
   if(mode!=='loaded'){
    changed=true
    if(mode==='reference'){await page.getByRole('textbox',{name:'Buscar empresa para atención',exact:true}).fill('Beta');await expect(page.getByRole('option',{name:'Synthetic Beta customer',exact:true})).toHaveCount(1);await page.getByRole('combobox',{name:'Cliente vinculado',exact:true}).selectOption(id(2))}
    else await page.getByRole('button',{name:mode==='company'?'Cambiar empresa sintética':mode==='actor'?'Cambiar actor sintético':'Cambiar a lector sintético',exact:true}).click()
    await expect.poll(()=>held).toBe(true);await expect(banner.getByText(name,{exact:true})).toHaveCount(0);await expect(banner.getByRole('link',{name:'Consultando cliente…',exact:true})).toBeVisible()
    release();await expect(banner.getByRole('link',{name:current,exact:true})).toHaveAttribute('href','/clients/'+id(mode==='reference'?2:1))
   }
  }
  await banner.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('attention-identity-'+mode+'-'+width+'.png')})
  await page.getByRole('button',{name:'Limpiar filtros',exact:true}).click();await expect(banner).toHaveCount(0);await expect.poll(()=>reads.filter(q=>q.operation==='telecom.attention').at(-1)?.input.customer_id).toBeUndefined()
  expect(errors).toEqual([]);expect(reads.every(q=>!q.operation.endsWith('.create')&&!q.operation.endsWith('.update'))).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{release();await writeFile(info.outputPath('observations.json'),JSON.stringify({mode,width,reads,errors},null,2));await page.close();await fixture.close()}
})
