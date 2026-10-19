for(const mode of ['parent_denied','parent_invalid','parent_lost'] as const)for(const width of [390,768,1440])test('portfolio passive '+mode+' remains closable without write intent at '+width,async({page},info)=>{
 const fixture=await startCommercialResourceFixture(),id='60000000-0000-4000-8000-000000000001',parent='80000000-0000-4000-8000-000000000001',customer='10000000-0000-4000-8000-000000000001',operator='20000000-0000-4000-8000-000000000001'
 const commands:unknown[]=[],errors:string[]=[];let parentReads=0
 const service={id,version:1,status:'pending',source:'manual',customer_id:customer,contract_id:parent,operator_id:operator,plan_version_id:null,service_kind:'mobile',display_name:'Servicio sintético sin intento de escritura',activated_on:null,ended_on:null,status_effective_on:null}
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(route.request().url().endsWith('/commands'))commands.push(q)
  if(q.operation==='portfolio.get'){
   if(q.input.kind==='contract'){
    parentReads++
    if(mode==='parent_lost'){await route.abort('failed');return}
    if(mode==='parent_denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
    await route.fulfill({json:{ok:true,data:{contract_version:'portfolio.v1',kind:'contract',record:null}}});return
   }
   await route.fulfill({json:{ok:true,data:{contract_version:'portfolio.v1',kind:'service',record:service}}});return
  }
  if(['customer.list','contract.list','service.list','line.list','assignee.list'].includes(q.operation)){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}}});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=portfolio&portfolio_reference='+id+'&portfolio_kind=service')
  const drawer=page.getByRole('dialog',{name:'Servicio: Servicio',exact:true});await expect(drawer).toBeVisible();await expect.poll(()=>parentReads).toBeGreaterThan(0)
  const message=mode==='parent_denied'?'No tienes permiso para esta acción.':mode==='parent_lost'?'No se pudo confirmar el resultado. Reintenta la misma acción para comprobarlo.':'No se pudo completar la acción.'
  await expect.poll(()=>drawer.getByRole('alert').allTextContents()).toContain(message)
  const close=drawer.getByRole('button',{name:'Cerrar panel',exact:true});await expect(close).toBeEnabled()
  await drawer.getByLabel('Fecha efectiva',{exact:true}).fill('2026-10-01')
  await expect(drawer.getByRole('button',{name:'Guardar cambio',exact:true})).toBeDisabled()
  await page.screenshot({path:info.outputPath('portfolio-passive-'+mode+'-'+width+'.png')})
  await close.click();await expect(drawer).toHaveCount(0);expect(commands).toEqual([]);expect(errors).toEqual([])
 }finally{await writeFile(info.outputPath('observations.json'),JSON.stringify({mode,width,parentReads,commands,errors},null,2));await page.close();await fixture.close()}
})
