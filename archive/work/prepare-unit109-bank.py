from pathlib import Path
import json,subprocess
w=Path('work');r=w/'crm-w2x-document-upload-uncertain';p='w2x-communications-customer-scope';c=json.loads((w/(p+'-claim.json')).read_text(encoding='utf-8-sig'));prior=json.loads((w/'w2x-collection-page-error-back-checkpoint.json').read_text(encoding='utf-8-sig'));assert prior['publication']=='PUBLISHED' and prior['sha']==c['base'];subprocess.run(['git','-C',str(r),'switch','-c',c['branch']],check=True)
s='''import {expect,test,type Route} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const id=(p:number,n:number)=>`${p}0000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const row=(n:number,customer:number)=>({id:id(2,n),version:1,status:'open',channel:'internal',source:'manual_internal',assigned_user_id:null,customer_id:id(1,customer),contact_id:null,last_seq:0,created_at:'2026-10-01T10:00:00Z',updated_at:customer===2?'2026-10-02T12:00:00Z':'2026-10-01T10:00:00Z',read_version:0,unread:true})
for(const width of [390,768,1440])for(const mode of ['switch_pending','switch_denied','filtered_empty_page','viewer_retires'])test(`linked communications customer scope ${mode} at ${width}`,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),heldOld:Route[]=[],heldCurrent:Route[]=[],reads:{operation:string;input:unknown}[]=[],commands:string[]=[],unexpected:string[]=[],errors:string[]=[];let calls=0
 const reply=(route:Route,items:ReturnType<typeof row>[],next:string|null=null)=>route.fulfill({json:{ok:true,data:{contract_version:'inbox.v1',operation:'inbox.list',items,next_id:next}}})
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();reads.push(q)
  if(route.request().url().includes('/commands')){commands.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(q.operation==='inbox.list'){
   calls++;if(calls===1){await reply(route,Array.from({length:20},(_,i)=>row(i+1,mode==='filtered_empty_page'||i>0?2:1)),id(2,20));return}
   if(mode==='filtered_empty_page'){await reply(route,[row(21,1)]);return}
   if(q.input.after_id){heldOld.push(route);return}heldCurrent.push(route);return
  }
  unexpected.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=communications')
  const links=page.getByRole('link',{name:'Abrir conversación interna',exact:true}),next=page.getByRole('button',{name:'Más conversaciones',exact:true}),previous=page.getByRole('button',{name:'Conversaciones anteriores',exact:true})
  await expect(next).toBeEnabled();await expect(links).toHaveCount(mode==='filtered_empty_page'?0:1)
  if(mode==='filtered_empty_page'){
   await expect(page.getByText('No hay conversaciones vinculadas en esta página.',{exact:true})).toBeVisible();await next.focus();await page.keyboard.press('Enter');await expect(links).toHaveCount(1);await expect(links).toHaveAttribute('href','/inbox?id='+id(2,21));await expect(page.getByText('Página 2',{exact:true})).toBeFocused()
  }else{
   if(mode!=='switch_denied'){await next.focus();await page.keyboard.press('Enter');await expect.poll(()=>heldOld.length).toBe(1);await expect(links).toHaveCount(0)}
   if(mode==='viewer_retires'){
    await page.getByRole('button',{name:'Cambiar a lector sintético',exact:true}).click();await expect(page.getByText('Acceso restringido. Las conversaciones internas requieren permisos comerciales.',{exact:true})).toBeVisible();await expect(links).toHaveCount(0);await expect(next).toHaveCount(0)
   }else{
    await page.getByRole('button',{name:'Seleccionar cliente B',exact:true}).click();await expect.poll(()=>heldCurrent.length).toBe(1);await expect(links).toHaveCount(0);await expect(page.getByRole('status').filter({hasText:'Consultando conversaciones'})).toBeVisible()
    if(mode==='switch_denied'){await heldCurrent[0].fulfill({status:403,json:{ok:false,error:'access_denied',private_body:'PRIVATE_NEW_CUSTOMER'}});await expect(page.getByRole('alert')).toBeVisible();await expect(links).toHaveCount(0)}
    else{await reply(heldCurrent[0],[row(21,2)]);await expect(links).toHaveCount(1);await expect(links).toHaveAttribute('href','/inbox?id='+id(2,21))}
    await expect(page.getByText('Página 1',{exact:true})).toBeVisible();await expect(previous).toBeDisabled()
   }
   if(heldOld.length){const route=heldOld[0],response=page.waitForResponse(v=>v.url()===route.request().url()&&v.request().postData()===route.request().postData());await reply(route,[row(22,1)]);await (await response).finished();await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));await expect(page.locator('a[href="/inbox?id='+id(2,22)+'"]')).toHaveCount(0);if(mode==='switch_pending'){await expect(links).toHaveAttribute('href','/inbox?id='+id(2,21));await expect(page.getByText('Página 1',{exact:true})).toBeVisible()}else await expect(links).toHaveCount(0)}
  }
  await expect(page.getByText('PRIVATE_NEW_CUSTOMER',{exact:true})).toHaveCount(0);const base={limit:20},after={limit:20,after_id:id(2,20)};expect(reads).toEqual((mode==='switch_pending'?[base,after,base]:mode==='switch_denied'?[base,base]:[base,after]).map(input=>({operation:'inbox.list',input})));expect(commands).toEqual([]);expect(unexpected).toEqual([]);expect(errors).toEqual([])
  await writeFile(info.outputPath('observations.json'),JSON.stringify({width,mode,interaction:'CUSTOMER_FILTER_CURSOR_RESET_AND_RETIRED_READ_UI_PASS',lateTransportComplete:heldOld.length>0,observationWindow:heldOld.length?'BODY_FINISHED_THEN_TWO_ANIMATION_FRAMES':'NO_LATE_READ_CASE',reads,commands,unexpected,errors},null,2));await page.screenshot({path:info.outputPath(`communications-customer-scope-${mode}-${width}.png`),fullPage:false})
 }finally{await page.close();await fixture.close()}
})
''';(r/'tests/e2e-preview/communications-customer-scope.spec.ts').write_text(s,encoding='utf-8');(w/(p+'-new-bank.ts')).write_text(s,encoding='utf-8')
(w/('playwright-'+p+'.config.cjs')).write_text("const p=require('./playwright-w2x-communications-page-focus-final.config.cjs');module.exports={...p,testMatch:['communications-customer-scope.spec.ts'],outputDir:require('node:path').resolve(__dirname,'"+p+"-results')}\n",encoding='utf-8')
s=(w/'checkpoint-w2x-collection-page-error-back.py').read_text(encoding='utf-8').replace('collection-page-error-back','communications-customer-scope').replace("'unit':108","'unit':109").replace('6256891004',str(c['claim'])).replace('e8b45e225760b372d4e2600e06abd0284befcd19',c['base']).replace('OWN45_BUILD66','OWN12_TEST_ONLY').replace('OWN45','OWN12').replace('previouspagerecoveryunit','customercommunicationsscopeQAbankunit').replace('source108global','source109global');(w/('checkpoint-'+p+'.py')).write_text(s,encoding='utf-8')
cp={'unit':109,'claim':c['claim'],'branch':c['branch'],'base':c['base'],'status':'OWN12_NEW_QA_RUNNING','publication':'IN_PROGRESS','product_changed':False,'release':'NOT_ACCEPTED','checks':{'browser':'NOT_RUN_FINAL','build':'NOT_RUN_TEST_ONLY_NO_PRODUCTION_CHANGE','auth_db':'NOT_RUN','model':'NOT_RUN','paid_api':0,'global':'NOT_RUN_CURRENT_SHA'},'matrix':{'total':342,'reviewed_partial':34,'unreconciled':308,'release_ready':0},'failures':[],'next':'Finish new12QAonly/lintdirected/reversalSRCguard/visual/publish,then individualPAR056evidence update ornewcommercialunit;preserve2139/2172/2214FIFO.'};(w/(p+'-checkpoint.json')).write_text(json.dumps(cp,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
f=w/'reconcile-w2x-current-continuation.py';s=f.read_text(encoding='utf-8').replace("'collection-page-error-back']","'collection-page-error-back','communications-customer-scope']").replace('units49-108','units49-109').replace("'active_unit':108","'active_unit':109");f.write_text(s,encoding='utf-8')
