import {expect,test,type Page,type Route} from '@playwright/test'
import {startCommercialResourceFixture} from './fixtures/commercial-resource-server.cjs'

// Reuses repro58's real consumer/repository/parsers and unchanged W2 fixture.
// Transport and identity context are synthetic; this is not Auth/RLS evidence.
const id=(n:number)=>`60000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const value=(n:number)=>({contract_version:'portfolio.v1',kind:'contract',record:{id:id(n),version:1,status:'draft',source:'manual',customer_id:'10000000-0000-4000-8000-000000000001',operator_id:'20000000-0000-4000-8000-000000000001',plan_version_id:null,start_date:'2026-10-01',signed_date:null,end_date:null,assigned_user_id:null}})
const reply=(route:Route,n:number)=>route.fulfill({json:{ok:true,data:value(n)}})
const createdService=()=>({contract_version:'portfolio.v1',kind:'service',record:{id:id(4),version:1,status:'pending',source:'manual',customer_id:value(1).record.customer_id,contract_id:id(1),operator_id:value(1).record.operator_id,plan_version_id:null,service_kind:'mobile',display_name:'Synthetic confirmed service',activated_on:null,ended_on:null,status_effective_on:null}})
const region=(page:Page)=>page.getByRole('region',{name:'Resultados de la consulta de cartera',exact:true})
const card=(page:Page,n:number)=>region(page).locator(`article[data-portfolio-id="${id(n)}"]`)
async function delivered(page:Page,route:Route,action:()=>Promise<unknown>){
  const response=page.waitForResponse(r=>r.request()===route.request())
  await action();await (await response).finished()
  await page.evaluate(()=>new Promise<void>(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done()))))
}
async function prepare(page:Page,width:number,mode='held'){
  const fixture=await startCommercialResourceFixture(),held:Route[]=[],reads:number[]=[],commands:string[]=[],errors:string[]=[]
  page.on('pageerror',e=>errors.push(e.name))
  await page.route('**/api/**',async route=>{
    const {operation,input}=route.request().postDataJSON()
    if(route.request().url().endsWith('/commands')){commands.push(operation);if(mode==='create'&&operation==='service.create_manual'){await route.fulfill({json:{ok:true,receipt:{contract_version:'portfolio.v1',operation,command_id:input.command_id,id:id(4),version:1,status:'pending',source:'manual'}}});return}await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
    if(operation==='global.search'){
      if(input.query.endsWith('DENIED')){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
      const numbers=input.query.endsWith('B')?[3]:[1,2]
      await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:numbers.map(n=>({kind:'contract',id:id(n),customer_id:value(n).record.customer_id,label:input.query+(n===2?' restricted':'')+' '+n,status:'draft'}))}}});return
    }
    if(operation==='portfolio.get'){
      const n=Number(input.id.slice(-12));reads.push(n)
      if(mode==='create'&&input.kind==='service'){await route.fulfill({json:{ok:true,data:createdService()}});return}
      if((mode==='all_held'&&n<3)||(['held','create'].includes(mode)&&n===2)||(mode==='first_held'&&n===1)){held.push(route);return}
      if(mode==='denied'&&n===2||mode==='all_denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
      if(mode==='invalid'&&n===2){await route.fulfill({json:{ok:true,data:{...value(n),private_marker:'synthetic-private-marker'}}});return}
      await reply(route,n);return
    }
    if(['contract.list','customer.list','assignee.list'].includes(operation)){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,items:[],next_id:null}}});return}
    await route.fulfill({status:400,json:{ok:false,error:'validation'}})
  })
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=portfolio')
  const search=async(query='W2 UI Portfolio A')=>{await page.getByLabel('Consultar cartera local',{exact:true}).fill(query);await page.getByRole('button',{name:'Consultar cartera',exact:true}).click()}
  const finish=async(expectedCommands:string[]=[])=>{try{expect(commands).toEqual(expectedCommands);expect(errors).toEqual([])}finally{await page.close();await fixture.close()}}
  return {held,reads,commands,search,finish}
}
for(const width of [390,768,1440]){
  test(`confirmed service readback survives a late search sibling at ${width}`,async({page})=>{
    const state=await prepare(page,width,'create')
    try{
      await state.search();await expect(card(page,1)).toBeVisible();await card(page,1).getByRole('button',{name:'Añadir servicio o plazo',exact:true}).click()
      await page.getByLabel('Nombre del nuevo activo',{exact:true}).fill('Synthetic confirmed service');await page.getByRole('button',{name:'Guardar activo manual',exact:true}).click()
      await expect(page.getByRole('dialog')).toHaveCount(0);await expect(card(page,4)).toBeVisible()
      await delivered(page,state.held[0],()=>reply(state.held[0],2));await expect(card(page,4)).toBeVisible();await expect(card(page,2)).toBeVisible();expect(state.reads.filter(n=>n===4)).toHaveLength(1)
    }finally{await state.finish(['service.create_manual'])}
  })
  test(`valid reference renders while sibling remains pending at ${width}`,async({page})=>{
    const state=await prepare(page,width)
    try{await state.search();await expect.poll(()=>state.held.length).toBe(1);await expect(card(page,1)).toBeVisible();await expect(card(page,1).getByRole('button',{name:'Añadir servicio o plazo',exact:true})).toBeEnabled();await expect(region(page)).toHaveAttribute('aria-busy','true');expect(state.reads.sort()).toEqual([1,2]);await delivered(page,state.held[0],()=>reply(state.held[0],2));await expect(region(page)).toHaveAttribute('aria-busy','false');await expect(card(page,2)).toBeVisible()}finally{await state.finish()}
  })
  for(const mode of ['denied','invalid'])test(`${mode} sibling remains explicit without hiding authorized card at ${width}`,async({page})=>{
    const state=await prepare(page,width,mode)
    try{await state.search();await expect(card(page,1)).toBeVisible();await expect(card(page,2)).toHaveCount(0);await expect(page.getByRole('alert').filter({hasText:mode==='denied'?'No tienes permiso para esta acción.':'No se pudo completar la acción.'})).toBeVisible();await expect(region(page)).toHaveAttribute('aria-busy','false');await expect(page.getByText('W2 UI Portfolio A restricted 2',{exact:true})).toHaveCount(0);expect(await page.locator('body').innerText()).not.toContain('synthetic-private-marker')}finally{await state.finish()}
  })
  test(`out of order reads preserve search order and one read per reference at ${width}`,async({page})=>{
    const state=await prepare(page,width,'first_held')
    try{await state.search();await expect(card(page,2)).toBeVisible();await expect(card(page,1)).toHaveCount(0);await delivered(page,state.held[0],()=>reply(state.held[0],1));await expect(region(page).locator('article').first()).toHaveAttribute('data-portfolio-id',id(1));expect(state.reads.sort()).toEqual([1,2])}finally{await state.finish()}
  })
  test(`editing query cancels stale result and selection without another read at ${width}`,async({page})=>{
    const state=await prepare(page,width,'all_held')
    try{await state.search();await expect.poll(()=>state.held.length).toBe(2);await page.getByLabel('Consultar cartera local',{exact:true}).fill('W2 UI Portfolio B');for(let n=0;n<2;n++)await delivered(page,state.held[n],()=>reply(state.held[n],n+1));await expect(region(page).locator('article')).toHaveCount(0);await expect(region(page)).toHaveAttribute('aria-busy','false');expect(state.reads.sort()).toEqual([1,2]);await state.search('W2 UI Portfolio B');await expect(card(page,3)).toBeVisible()}finally{await state.finish()}
  })
  test(`new search ignores old success and denial at ${width}`,async({page})=>{
    const state=await prepare(page,width,'all_held')
    try{await state.search();await expect.poll(()=>state.held.length).toBe(2);await state.search('W2 UI Portfolio B');await expect(card(page,3)).toBeVisible();await delivered(page,state.held[0],()=>reply(state.held[0],1));await delivered(page,state.held[1],()=>state.held[1].fulfill({status:403,json:{ok:false,error:'access_denied'}}));await expect(region(page).locator('article')).toHaveCount(1);await expect(card(page,3)).toBeVisible();await expect(region(page).locator('..').getByRole('alert')).toHaveCount(0)}finally{await state.finish()}
  })
  for(const control of ['Cambiar empresa sintética','Cambiar actor sintético','Cambiar a lector sintético'])test(`${control} discards pending old scope at ${width}`,async({page})=>{
    const state=await prepare(page,width,'all_held')
    try{await state.search();await expect.poll(()=>state.held.length).toBe(2);await page.getByRole('button',{name:control,exact:true}).click();for(let n=0;n<2;n++)await delivered(page,state.held[n],()=>reply(state.held[n],n+1));await expect(region(page).locator('article')).toHaveCount(0);await expect(page.getByLabel('Consultar cartera local',{exact:true})).toHaveValue('');await expect(region(page)).toHaveAttribute('aria-busy','false')}finally{await state.finish()}
  })
  test(`all denied is an error rather than an apparently empty successful search at ${width}`,async({page})=>{
    const state=await prepare(page,width,'all_denied')
    try{await state.search();await expect(page.getByRole('alert').filter({hasText:'No tienes permiso para esta acción.'})).toBeVisible();await expect(region(page).locator('article')).toHaveCount(0);await expect(region(page)).toHaveAttribute('aria-busy','false');await expect(page.getByText('Consulta un cliente o activo para ver sus resultados.',{exact:true})).toHaveCount(0)}finally{await state.finish()}
  })
}
