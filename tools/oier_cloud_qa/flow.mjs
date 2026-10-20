import {origin,projectRef,customerName,prompt} from './preflight.mjs'
const authOrigin=`https://${projectRef}.supabase.co`
const invariant=(value)=>{if(!value)throw Error('HOSTED_ASSERTION_FAILED')}
const body=request=>{try{return request.postDataJSON()}catch{return null}}
const isResponse=(response,operation)=>new URL(response.url()).origin===origin&&body(response.request())?.operation===operation
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
/** No mocks, cookies, headers, screenshots, traces, HAR, storageState or raw error output. */
export async function hostedFlow(page,manifest,env,journal,saveJournal,report){
 let actor='A',authenticated=false,forbidden=false
 const mutations=[],phase=async(name,fn)=>{report.phase=name;invariant(Date.now()<Date.parse(manifest.expiresAt));await fn();report.completed.push(name)}
 const guard=async route=>{
  const request=route.request(),url=new URL(request.url())
  if(Date.now()>=Date.parse(manifest.expiresAt)&&!(url.origin===authOrigin&&url.pathname==='/auth/v1/logout')){forbidden=true;await route.abort();return}
  if(![origin,authOrigin,'https://app.netlify.com'].includes(url.origin)){forbidden=true;await route.abort();return}
  if(url.origin==='https://app.netlify.com'){
   if(request.isNavigationRequest())report.edgeAccess='REDIRECTED_TO_NETLIFY_ACCESS_NOT_BYPASSED'
   if(request.method()!=='GET'){forbidden=true;await route.abort();return}
  }
  if(url.origin===authOrigin&&!url.pathname.startsWith('/auth/v1/')&&!(request.method()==='GET'&&(url.pathname.startsWith('/rest/v1/')||url.pathname.startsWith('/storage/v1/')))){forbidden=true;await route.abort();return}
  if(url.origin===origin&&url.pathname.startsWith('/api/')&&request.method()==='POST'){
   const q=body(request),op=q?.operation
   const read=typeof op==='string'&&(/(?:\.|_)(get|list|count|summary|stages|search|editor|editors)$/.test(op)||['invoice.financial_summary','invoice.propose'].includes(op))
   if(!read){
    const valid=actor==='A'&&uuid.test(q?.input?.command_id??'')&&(
     op==='customer.create'&&q.input.legal_name===customerName&&!mutations.some(v=>v.operation===op)||
     op==='invoice.create_draft'&&q.input.customer_id===journal.customerId&&!mutations.some(v=>v.operation===op))
    if(!valid){forbidden=true;await route.abort();return}
    mutations.push({operation:op,commandId:q.input.command_id});journal.lastDispatch={operation:op,commandId:q.input.command_id};saveJournal()
   }
  }
  await route.continue()
 }
 await page.route('**/*',guard)
 async function login(who){
  actor=who;await page.goto(origin+'/login')
  invariant(new URL(page.url()).origin===origin)
  await page.getByLabel('Email',{exact:true}).waitFor({state:'visible'})
  // Filling errors are never emitted by the runner; no credential-bearing artifacts are enabled.
  await page.getByLabel('Email',{exact:true}).fill(env[`OIER_CLOUD_QA_${who}_EMAIL`])
  await page.getByLabel('Contraseña',{exact:true}).fill(env[`OIER_CLOUD_QA_${who}_PASSWORD`])
  const response=page.waitForResponse(r=>new URL(r.url()).origin===authOrigin&&new URL(r.url()).pathname==='/auth/v1/token'&&r.request().method()==='POST')
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click()
  const auth=await response,identity=await auth.json();authenticated=auth.ok()
  invariant(auth.ok()&&identity.user?.id===manifest[`actor${who}`].id)
  await page.waitForURL(u=>u.origin===origin&&u.pathname!=='/login')
 }
 async function logout(){
  await page.setViewportSize({width:1440,height:960})
  await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click()
  await page.waitForURL(u=>u.origin===origin&&u.pathname==='/login');authenticated=false
 }
 async function query(operation,id){
  return page.evaluate(async({operation,id})=>{
   const response=await fetch(operation==='customer.editor'?'/api/product/v1/queries':'/api/billing/v1',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation,input:{id}})})
   const data=await response.json()
   if(!response.ok)return{http:response.status,denied:[403,404].includes(response.status)&&Object.keys(data).sort().join(',')==='error,ok'&&data.ok===false&&['access_denied','not_found'].includes(data.error)}
   const record=operation==='customer.editor'?data.data:data.data?.invoice
   const valid=data.ok===true&&(operation==='customer.editor'?data.data?.contract_version==='product.v1':data.data?.contract_version==='billing.v1'&&data.data?.operation==='invoice.get')
   const line=record?.lines?.[0]
   return{http:response.status,denied:false,valid,id:record?.id,customerId:record?.customer_id,version:record?.version,status:record?.status,currency:record?.currency,number:record?.number,totals:record?.totals,issue:record?.issue_on,due:record?.due_on,lineCount:record?.lines?.length,description:line?.description,quantity:line?.quantity_milli,price:line?.unit_price_minor,discount:line?.discount_bps,tax:line?.tax_bps,withholding:line?.withholding_bps}
  },{operation,id})
 }
 try{
  await page.setViewportSize({width:390,height:960})
  await phase('A_ORDINARY_BROWSER_SIGNIN',()=>login('A'))
  await phase('A_CUSTOMER_CREATE_AND_READ',async()=>{
   await page.goto(origin+'/clients');await page.getByRole('button',{name:'Nuevo cliente',exact:true}).click()
   await page.getByLabel('Razón social',{exact:true}).fill(customerName)
   const pending=page.waitForResponse(r=>isResponse(r,'customer.create'))
   await page.getByRole('button',{name:'Guardar cliente',exact:true}).click()
   const response=await pending,data=await response.json(),request=body(response.request())
   invariant(response.ok()&&data.ok===true&&data.receipt?.operation==='customer.create'&&data.receipt.command_id===request.input.command_id&&data.receipt.status==='active'&&uuid.test(data.receipt.id))
   journal.customerId=data.receipt.id;journal.customerReceipt={id:data.receipt.id,version:data.receipt.version,commandId:data.receipt.command_id};saveJournal()
   await page.getByRole('heading',{name:customerName,exact:true}).waitFor()
   invariant((await query('customer.editor',journal.customerId)).id===journal.customerId)
  })
  let issue,due
  await phase('A_TEXT_PROPOSAL_NO_IMPLICIT_WRITE',async()=>{
   await page.goto(origin+'/facturacion?customer='+journal.customerId)
   await page.getByRole('textbox',{name:'Descripción de la factura',exact:true}).fill(prompt)
   await page.getByRole('button',{name:'Generar propuesta',exact:true}).click()
   await page.getByLabel('Concepto 1',{exact:true}).waitFor()
   invariant(await page.getByLabel('Concepto 1',{exact:true}).inputValue()==='instalación de fibra')
   invariant(Number(await page.getByLabel('Precio 1',{exact:true}).inputValue())===300&&Number(await page.getByLabel('IVA % 1',{exact:true}).inputValue())===21)
   invariant(Number(await page.getByLabel('Cantidad 1',{exact:true}).inputValue())===1&&Number(await page.getByLabel('Descuento % 1',{exact:true}).inputValue())===0&&Number(await page.getByLabel('IRPF % 1',{exact:true}).inputValue())===0)
   issue=await page.getByLabel('Fecha de emisión',{exact:true}).inputValue();due=new Date(Date.parse(issue+'T12:00:00Z')+15*86400000).toISOString().slice(0,10)
   invariant(await page.getByLabel('Vencimiento de factura',{exact:true}).inputValue()===due)
   invariant(!mutations.some(v=>v.operation==='invoice.create_draft'))
  })
  await phase('A_EXPLICIT_REVIEW_DRAFT_RECEIPT',async()=>{
   await page.getByRole('checkbox',{name:/He revisado cliente, conceptos, importes, impuestos y fechas/}).check()
   const pending=page.waitForResponse(r=>isResponse(r,'invoice.create_draft'))
   await page.getByRole('button',{name:'Guardar borrador local',exact:true}).click()
   const response=await pending,data=await response.json(),request=body(response.request()),receipt=data.receipt
   invariant(response.ok()&&data.ok===true&&receipt?.operation==='invoice.create_draft'&&receipt.command_id===request.input.command_id&&receipt.status==='draft'&&receipt.number===null&&uuid.test(receipt.id))
   journal.invoiceId=receipt.id;journal.invoiceReceipt={id:receipt.id,version:receipt.version,commandId:receipt.command_id};saveJournal()
  })
  report.readbackWidths=[]
  for(const width of [390,768,1440])await phase('A_RELOAD_AUTHORITATIVE_READ_'+width,async()=>{
   await page.setViewportSize({width,height:960});await page.goto(origin+'/facturacion?invoice='+journal.invoiceId);await page.reload()
   await page.locator(`[data-invoice-detail-id="${journal.invoiceId}"]`).waitFor()
   const fresh=await query('invoice.get',journal.invoiceId)
   invariant(fresh.valid&&fresh.id===journal.invoiceId&&fresh.customerId===journal.customerId&&fresh.version===journal.invoiceReceipt.version&&fresh.status==='draft'&&fresh.number===null&&fresh.currency==='EUR')
   invariant(fresh.issue===issue&&fresh.due===due&&fresh.lineCount===1&&fresh.description==='instalación de fibra'&&fresh.totals?.subtotal_minor===30000&&fresh.totals.tax_minor===6300&&fresh.totals.withholding_minor===0&&fresh.totals.total_minor===36300)
   invariant(fresh.quantity===1000&&fresh.price===30000&&fresh.discount===0&&fresh.tax===2100&&fresh.withholding===0)
   invariant(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));report.readbackWidths.push(width)
  })
  await phase('A_SIGNOUT',logout)
  await phase('B_ORDINARY_BROWSER_SIGNIN',()=>login('B'))
  await phase('B_OWN_INVOICE_AND_CUSTOMER_POSITIVES',async()=>{
   await page.goto(origin+'/facturacion?invoice='+manifest.actorB.invoiceId)
   await page.locator(`[data-invoice-detail-id="${manifest.actorB.invoiceId}"]`).waitFor()
   const own=await query('invoice.get',manifest.actorB.invoiceId),customer=await query('customer.editor',manifest.actorB.customerId)
   invariant(own.valid&&own.id===manifest.actorB.invoiceId&&own.customerId===manifest.actorB.customerId&&customer.valid&&customer.id===manifest.actorB.customerId)
  })
  await phase('B_CROSS_TENANT_INVOICE_AND_CUSTOMER_DENIAL',async()=>{
   invariant((await query('invoice.get',journal.invoiceId)).denied&&(await query('customer.editor',journal.customerId)).denied)
  })
  await phase('B_SIGNOUT',logout)
  invariant(!forbidden&&mutations.length===2&&mutations[0].operation==='customer.create'&&mutations[1].operation==='invoice.create_draft')
  report.observedMutations={customerCreate:1,draftCreate:1,other:0};report.sessionCleanup='ORDINARY_UI_SIGNOUT_A_B'
  report.result='HOSTED_UI_API_FLOW_PASS_DEPLOYMENT_ATTESTED_DB_INDEPENDENT_NOT_RUN'
 }finally{
  await page.unroute('**/*',guard).catch(()=>{})
  report.forbiddenRequestObserved=forbidden
  if(authenticated)report.sessionCleanup='INCOMPLETE_APPROVED_PRIVATE_PAGE_REQUIRES_REVIEW'
 }
}
