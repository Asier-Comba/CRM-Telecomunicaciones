import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCommercialResourceFixture} from './fixtures/commercial-resource-server.cjs'
const id='40000000-0000-4000-8000-000000000001',customer='10000000-0000-4000-8000-000000000001',operator='20000000-0000-4000-8000-000000000001',contract='60000000-0000-4000-8000-000000000001'
for(const mode of ['long','ordinary','denied'] as const)for(const width of [390,768,1440])test('portfolio result label '+mode+' at '+width,async({page},info)=>{
 const fixture=await startCommercialResourceFixture(),label=mode==='ordinary'?'Cliente servicio de prueba':'Cliente'+'X'.repeat(153),calls:{operation:string;input:Record<string,unknown>}[]=[],commands:string[]=[],errors:string[]=[];let geometry:unknown
 const service={id,version:1,status:'active',source:'manual',customer_id:customer,contract_id:contract,operator_id:operator,plan_version_id:null,service_kind:'mobile',display_name:label,activated_on:'2026-10-01',ended_on:null,status_effective_on:'2026-10-01'}
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();calls.push(q);if(route.request().url().endsWith('/commands')||/\.(create|create_manual|update|update_label|cancel|activate|resolve|dismiss|assign)$/.test(q.operation))commands.push(q.operation)
  const reply=(data:unknown)=>route.fulfill({json:{ok:true,data}})
  if(q.operation==='global.search'){expect(q.input).toEqual({query:'Cliente',limit:50});await reply({contract_version:'product.v1',items:[{kind:'service',id,customer_id:customer,label,status:'active'}]});return}
  if(q.operation==='portfolio.get'){
   if(q.input.kind==='service'&&q.input.id===id){if(mode==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied',private_body:'PRIVATE_PORTFOLIO_LABEL_MUST_NOT_RENDER'}});return};await reply({contract_version:'portfolio.v1',kind:'service',record:service});return}
   if(q.input.kind==='contract'&&q.input.id===contract){await reply({contract_version:'portfolio.v1',kind:'contract',record:{id:contract,version:1,status:'active',source:'manual',customer_id:customer,operator_id:operator,plan_version_id:null,start_date:'2026-10-01',signed_date:'2026-10-01',end_date:null,assigned_user_id:null}});return}
  }
  if(q.operation==='customer.list'){await reply({contract_version:'telecom.collections.v1',operation:q.operation,items:q.input.limit===1?[{id:customer,version:1,display_name:'Cliente normal',account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}]:[],next_id:null});return}
  if(q.operation==='operator.get'){await reply({contract_version:'telecom.collections.v1',operation:q.operation,record:{id:operator,version:1,code:'synthetic_operator',display_name:'Synthetic operator',status:'active',source:'manual'}});return}
  if(['contract.list','service.list','line.list','assignee.list'].includes(q.operation)){await reply({contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied',private_body:'PRIVATE_PORTFOLIO_LABEL_MUST_NOT_RENDER'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=portfolio');await page.getByLabel('Consultar cartera local',{exact:true}).fill('Cliente');await page.getByRole('button',{name:'Consultar cartera',exact:true}).click();const card=page.locator('article[data-portfolio-id="'+id+'"]')
  if(mode==='denied'){await expect(page.getByRole('alert').filter({hasText:'Algunos activos no están disponibles.'})).toBeVisible();await expect(card).toHaveCount(0);await expect(page.getByText(label,{exact:true})).toHaveCount(0)}
  else{
   await expect(card).toBeVisible();await expect(page.locator('article[data-portfolio-id]')).toHaveCount(1);const heading=card.getByRole('heading',{level:2,name:label,exact:true});await expect(heading).toHaveText(label);await expect(card.getByRole('button',{name:'Ver activo',exact:true})).toBeEnabled();await expect(card.getByRole('button',{name:'Añadir línea',exact:true})).toBeEnabled();await card.scrollIntoViewIfNeeded()
   const g=await card.evaluate(el=>{const h=el.querySelector('h2')!,c=el.getBoundingClientRect(),b=h.getBoundingClientRect();return{viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,cardLeft:c.left,cardRight:c.right,cardClient:el.clientWidth,cardScroll:el.scrollWidth,titleLeft:b.left,titleRight:b.right,titleClient:h.clientWidth,titleScroll:h.scrollWidth,titleHeight:b.height}});geometry=g
   expect(g.cardScroll).toBeLessThanOrEqual(g.cardClient+1);expect(g.titleScroll).toBeLessThanOrEqual(g.titleClient+1);expect(g.cardRight).toBeLessThanOrEqual(width+1);expect(g.titleRight).toBeLessThanOrEqual(g.cardRight);expect(g.documentWidth).toBeLessThanOrEqual(width+1)
   if(mode==='ordinary'){await card.getByRole('button',{name:'Ver activo',exact:true}).click();const panel=page.getByRole('dialog',{name:'Servicio: '+label,exact:true});await expect(panel).toBeVisible();await expect(panel.getByLabel('Nombre del activo',{exact:true})).toHaveValue(label);const ancestry=panel.getByRole('navigation',{name:'Relaciones del activo',exact:true});await expect(ancestry.locator('a[href="/clients/'+customer+'"]')).toBeVisible();await expect(ancestry.locator('a[href="/portfolio?kind=contract&id='+contract+'"]')).toBeVisible();await panel.getByRole('button',{name:'Cerrar panel',exact:true}).click();await expect(panel).toHaveCount(0);await expect(heading).toHaveText(label);await card.scrollIntoViewIfNeeded()}
  }
  expect(calls.filter(q=>q.operation==='global.search')).toHaveLength(1);expect(calls.filter(q=>q.operation==='portfolio.get'&&q.input.kind==='service'&&q.input.id===id)).toHaveLength(mode==='ordinary'?2:1);expect(commands).toEqual([]);expect(errors).toEqual([]);await expect(page.getByText('PRIVATE_PORTFOLIO_LABEL_MUST_NOT_RENDER',{exact:false})).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:info.outputPath('portfolio-result-label-'+mode+'-'+width+'.png')})
 }finally{await writeFile(info.outputPath('observations.json'),JSON.stringify({mode,width,labelLength:label.length,geometry,calls,commands,errors,scope:'ControlledHTTP/DTO,validservice160label,notAuthDB or completeportfolio/selectedlongtitle acceptance'},null,2));await page.unrouteAll({behavior:'wait'});await page.close();await fixture.close()}
})
