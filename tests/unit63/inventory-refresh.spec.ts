import {test,expect,type Page,type Route} from '@playwright/test'
import {startCommercialResourceFixture} from '../e2e-preview/fixtures/commercial-resource-server.cjs'

const uuid=(n:number)=>`60000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const id=uuid(41),foreignId=uuid(81)
async function prepare(page:Page,width:number,mode:string){
 const fixture=await startCommercialResourceFixture(),held:Route[]=[],commands:string[]=[],reads:{operation:string;input:Record<string,unknown>}[]=[]
 let status='draft',version=1,other=false,failNext=mode==='failure'
 const record=(recordId=id)=>({id:recordId,version,status,source:'manual',customer_id:'10000000-0000-4000-8000-000000000001',operator_id:'20000000-0000-4000-8000-000000000001',plan_version_id:null,start_date:'2026-10-26',signed_date:version===1?null:'2026-10-26',end_date:null,assigned_user_id:null})
 async function collection(route:Route,rows:ReturnType<typeof record>[],next:string|null=null){const operation=route.request().postDataJSON().operation;await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,items:rows.map(({signed_date:ignored,...row})=>{void ignored;return row}),next_id:next}}})}
 await page.route('**/api/**',async route=>{
  const {operation,input}=route.request().postDataJSON()
  if(operation==='contract.activate'||operation==='contract.cancel'){
   commands.push(operation);status=operation==='contract.cancel'?'cancelled':'active';version=2
   if(mode==='uncertain'){await route.abort('failed');return}
   await route.fulfill({json:{ok:true,receipt:{contract_version:'portfolio.v1',operation,command_id:input.command_id,id,version,status,source:'manual'}}});return
  }
  if(operation==='portfolio.get'){
   if(mode==='unauthorized'||other){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   await route.fulfill({json:{ok:true,data:{contract_version:'portfolio.v1',kind:'contract',record:record()}}});return
  }
  if(operation==='contract.list'){
   reads.push({operation,input})
   if(other){await collection(route,[record(foreignId)]);return}
   if(mode==='unauthorized'){await collection(route,[]);return}
   if(mode==='late_initial'&&version===1||['late_refresh','scope'].includes(mode)&&version===2){held.push(route);return}
   if(version===2&&failNext){failNext=false;await route.fulfill({status:503,json:{ok:false,error:'unavailable'}});return}
   if(mode==='pagination'&&!input.after_id){await collection(route,Array.from({length:20},(_,n)=>({...record(uuid(n+1)),status:'draft'})),uuid(20));return}
   const rows=input.status&&input.status!==status?[]:[record()];await collection(route,rows);return
  }
  if(['customer.list','assignee.list','renewal.list'].includes(operation)){reads.push({operation,input});await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,items:[],next_id:null}}});return}
  await route.fulfill({status:400,json:{ok:false,error:'validation'}})
 })
 await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=portfolio&portfolio_reference='+id)
 const row=()=>page.locator(`[data-domain-id="${id}"]:visible`),card=()=>page.locator(`article[data-portfolio-id="${id}"]`),panel=()=>page.locator('#inventory-panel-Contratos')
 const close=()=>page.getByRole('button',{name:'Cerrar panel',exact:true}).click()
 const activate=async(cancel=false)=>{if(!await page.getByRole('dialog').count())await card().getByRole('button',{name:'Ver activo',exact:true}).click();if(!cancel)await page.getByLabel('Fecha de firma',{exact:true}).fill('2026-10-26');await page.getByRole('button',{name:cancel?'Cancelar activo':'Activar contrato',exact:true}).click();await page.getByRole('button',{name:'Confirmar',exact:true}).click();if(mode!=='uncertain'){await expect(page.getByRole('dialog')).toHaveCount(0);await expect(card()).toContainText(cancel?'Cancelado':'Activo')}}
 const release=async(route:Route,oldStatus='draft')=>{await collection(route,[{...record(),version:oldStatus==='draft'?1:2,status:oldStatus}])}
 return{row,card,panel,held,commands,reads,close,activate,release,foreign:async(control='Cambiar empresa sintética')=>{other=true;await page.getByRole('button',{name:control,exact:true}).click()},finish:async()=>{await page.close();await fixture.close()}}
}
for(const width of [390,768,1440]){
 test(`confirmed activation updates inventory without another command at ${width}`,async({page})=>{
  const s=await prepare(page,width,'normal');try{await expect(s.row()).toContainText('Borrador');await s.activate();await expect(s.row()).toContainText('Activo');expect(s.commands).toEqual(['contract.activate']);expect(s.reads.filter(r=>r.operation==='contract.list')).toHaveLength(2)}finally{await s.finish()}
 })
 test(`confirmed cancellation refreshes inventory at ${width}`,async({page})=>{
  const s=await prepare(page,width,'normal');try{await expect(s.row()).toContainText('Borrador');await s.activate(true);await expect(s.row()).toContainText('Cancelado');expect(s.commands).toEqual(['contract.cancel'])}finally{await s.finish()}
 })
 test(`failed refresh is honest and retry performs only a read at ${width}`,async({page})=>{
  const s=await prepare(page,width,'failure');try{await expect(s.row()).toContainText('Borrador');await s.activate();await expect(s.panel().getByRole('alert')).toBeVisible();await expect(s.row()).toHaveCount(0);await page.getByRole('button',{name:'Reintentar Contratos',exact:true}).click();await expect(s.row()).toContainText('Activo');expect(s.commands).toEqual(['contract.activate']);expect(s.reads.filter(r=>r.operation==='contract.list')).toHaveLength(3)}finally{await s.finish()}
 })
 test(`late old collection cannot replace the confirmed version at ${width}`,async({page})=>{
  const s=await prepare(page,width,'late_initial');try{await expect.poll(()=>s.held.length).toBe(1);await s.activate();await expect(s.row()).toContainText('Activo');await s.release(s.held[0]);await expect(s.row()).toContainText('Activo');expect(s.commands).toHaveLength(1)}finally{await s.finish()}
 })
 test(`late refresh keeps current selection at ${width}`,async({page})=>{
  const s=await prepare(page,width,'late_refresh');try{await expect(s.row()).toContainText('Borrador');await s.activate();await expect.poll(()=>s.held.length).toBe(1);await expect(s.row()).toHaveCount(0);await s.card().getByRole('button',{name:'Ver activo',exact:true}).click();await s.release(s.held[0],'active');await expect(s.row()).toContainText('Activo');await expect(page.getByRole('dialog')).toBeVisible();expect(s.commands).toHaveLength(1)}finally{await s.finish()}
 })
 for(const control of ['Cambiar empresa sintética','Cambiar actor sintético','Cambiar a lector sintético'])test(`${control} discards the old pending refresh at ${width}`,async({page})=>{
  const s=await prepare(page,width,'scope');try{await expect(s.row()).toContainText('Borrador');await s.activate();await expect.poll(()=>s.held.length).toBe(1);await s.foreign(control);await expect(page.locator(`[data-domain-id="${foreignId}"]:visible`)).toBeVisible();await s.release(s.held[0],'active');await expect(s.row()).toHaveCount(0);await expect(s.card()).toHaveCount(0);expect(s.commands).toHaveLength(1)}finally{await s.finish()}
 })
 test(`viewer cannot mutate or trigger command invalidation at ${width}`,async({page})=>{
  const s=await prepare(page,width,'normal');try{await s.close();await page.getByRole('button',{name:'Cambiar a lector sintético',exact:true}).click();await expect(page.getByText('Consulta de solo lectura para tu rol.',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Activar contrato',exact:true})).toHaveCount(0);expect(s.commands).toHaveLength(0)}finally{await s.finish()}
 })
 test(`unauthorized reference is never promoted by refresh at ${width}`,async({page})=>{
  const s=await prepare(page,width,'unauthorized');try{await expect(page.getByRole('alert').filter({hasText:'No tienes permiso para esta acción.'})).toBeVisible();await expect(s.row()).toHaveCount(0);await expect(s.card()).toHaveCount(0);expect(s.commands).toHaveLength(0)}finally{await s.finish()}
 })
 test(`status filter survives confirmed invalidation at ${width}`,async({page})=>{
  const s=await prepare(page,width,'normal');try{await s.close();await page.getByLabel('Estado de Contratos',{exact:true}).selectOption('draft');await expect(s.row()).toContainText('Borrador');await s.activate();await expect(page.getByLabel('Estado de Contratos',{exact:true})).toHaveValue('draft');await expect(s.row()).toHaveCount(0);await expect(s.panel().getByText('No hay registros de contratos en esta página.',{exact:true})).toBeVisible();expect(s.reads.filter(r=>r.operation==='contract.list').at(-1)?.input.status).toBe('draft')}finally{await s.finish()}
 })
 test(`pagination survives confirmed invalidation at ${width}`,async({page})=>{
  const s=await prepare(page,width,'pagination');try{await s.close();await page.getByRole('button',{name:'Siguiente página de Contratos',exact:true}).click();await expect(s.row()).toContainText('Borrador');await s.activate();await expect(s.row()).toContainText('Activo');await expect(s.panel().getByText('Página 2 · 1 registros',{exact:true})).toBeVisible();expect(s.reads.filter(r=>r.operation==='contract.list').at(-1)?.input.after_id).toBe(uuid(20))}finally{await s.finish()}
 })
 test(`selected tab and its filter survive invalidation at ${width}`,async({page})=>{
  const s=await prepare(page,width,'normal');try{await s.close();await page.getByRole('tab',{name:'Renovaciones',exact:true}).click();await page.getByLabel('Estado de Renovaciones',{exact:true}).selectOption('open');await s.activate();await expect(page.getByRole('tab',{name:'Renovaciones',exact:true})).toHaveAttribute('aria-selected','true');await expect(page.getByLabel('Estado de Renovaciones',{exact:true})).toHaveValue('open');expect(s.reads.filter(r=>r.operation==='renewal.list').at(-1)?.input.status).toBe('open')}finally{await s.finish()}
 })
 test(`uncertain response never automatically replays a command at ${width}`,async({page})=>{
  const s=await prepare(page,width,'uncertain');try{await expect(s.row()).toContainText('Borrador');await s.activate();await expect(page.getByRole('button',{name:'Reintentar la misma acción',exact:true})).toBeVisible();expect(s.commands).toEqual(['contract.activate']);expect(s.reads.filter(r=>r.operation==='contract.list')).toHaveLength(1)}finally{await s.finish()}
 })
}
