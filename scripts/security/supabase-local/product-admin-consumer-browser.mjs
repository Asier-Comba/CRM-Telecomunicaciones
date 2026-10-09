import {expect} from '@playwright/test'
import {parseProductInputV1,parseProductReceiptV1,parseCustomerEditorV1} from '../../../src/lib/server/product-runtime-v1.ts'

/** Observe only closed operations/status/timing; never retain IDs, URLs or bodies. */
export async function adminConsumerBrowser({page,origin,users,report}){
 const started=Date.now(),events=[],phase=name=>{if(report)report.w2_ui_action_step='admin:'+name}
 const operation=request=>{try{const q=request.postDataJSON();return ['customer.create','customer.editor'].includes(q?.operation)?q.operation:null}catch{return null}}
 const append=(request,event,status=null)=>{const op=operation(request);if(op&&events.length<32)events.push({operation:op,event,status,elapsed_ms:Date.now()-started,phase:report?.w2_ui_action_step??null})}
 const onRequest=request=>append(request,'request'),onResponse=response=>append(response.request(),'response',response.status()),onFailed=request=>append(request,'request_failed')
 const wait=(op,occurrence=1)=>{let seen=0;const pending=page.waitForResponse(response=>{try{return response.request().method()==='POST'&&new URL(response.url()).pathname==='/api/product/v1/'+(op==='customer.create'?'commands':'queries')&&operation(response.request())===op&&++seen===occurrence}catch{return false}});void pending.catch(()=>{});return pending}
 async function readCustomer(pending,receipt){const response=await pending,input=response.request().postDataJSON().input,body=await response.json();const fresh=parseCustomerEditorV1(receipt.id,body.data);if(response.status()!==200||body.ok!==true||Object.keys(body).sort().join(',')!=='data,ok'||Object.keys(input).join(',')!=='id'||input.id!==receipt.id||!fresh||fresh.version<receipt.version||fresh.legal_name!=='W2 Admin Synthetic Company'||fresh.source!=='manual'||fresh.status!=='active')throw Error('ADMIN_NORMAL_CUSTOMER_READ_FAILED')}
 page.on('request',onRequest);page.on('response',onResponse);page.on('requestfailed',onFailed)
 try{
  phase('open_login');await page.goto(origin+'/login')
  phase('fill_credentials');await page.locator('input[type="email"]').fill(users.adminA.email);await page.locator('input[type="password"]').fill(users.adminA.password)
  phase('submit_login');await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click()
  phase('dashboard');await page.waitForURL('**/dashboard')
  phase('open_clients');await page.goto(origin+'/clients')
  phase('open_editor');await page.getByRole('button',{name:'Nuevo cliente',exact:true}).click()
  phase('fill_customer');await page.getByLabel('Razón social',{exact:true}).fill('W2 Admin Synthetic Company')
  const created=wait('customer.create'),confirmation=wait('customer.editor'),detail=wait('customer.editor',2)
  phase('save_customer');await page.getByRole('button',{name:'Guardar cliente',exact:true}).click()
  phase('created_customer_receipt');const response=await created,body=await response.json(),input=parseProductInputV1('customer.create',response.request().postDataJSON().input),receipt=input?parseProductReceiptV1('customer.create',input,body.receipt):null
  if(response.status()!==200||body.ok!==true||Object.keys(body).sort().join(',')!=='ok,receipt'||!receipt||input.legal_name!=='W2 Admin Synthetic Company')throw Error('ADMIN_NORMAL_CUSTOMER_CREATE_FAILED')
  phase('created_customer_confirmation_read');await readCustomer(confirmation,receipt)
  phase('created_customer_detail_read');await readCustomer(detail,receipt)
  phase('created_customer_url');await page.waitForURL('**/clients/'+receipt.id)
  phase('created_customer_heading');await expect(page.getByRole('heading',{name:'W2 Admin Synthetic Company',exact:true})).toBeVisible()
  const reloaded=wait('customer.editor');phase('reload_customer');await page.reload()
  phase('reloaded_customer_read');await readCustomer(reloaded,receipt)
  phase('reloaded_customer_heading');await expect(page.getByRole('heading',{name:'W2 Admin Synthetic Company',exact:true})).toBeVisible()
  phase('open_settings');await page.goto(origin+'/settings')
  const owner=page.getByRole('row').filter({hasText:'Usuario '+users.ownerA.id.slice(0,8)})
  phase('owner_visible');await expect(owner).toBeVisible()
  phase('owner_no_buttons');await expect(owner.getByRole('button')).toHaveCount(0)
  phase('owner_no_combobox');await expect(owner.getByRole('combobox')).toHaveCount(0)
  phase('open_billing');await page.goto(origin+'/facturacion')
  phase('billing_emitter_control');await expect(page.getByRole('button',{name:'Configurar emisor',exact:true})).toBeVisible()
 }catch(error){
  if(report)report.w2_admin_failure_dom=await page.evaluate(()=>({customer_heading_present:[...document.querySelectorAll('h1,h2,h3')].some(e=>e.textContent?.trim()==='W2 Admin Synthetic Company'),customer_read_loading:document.querySelector('main')?.textContent?.includes('Cargando cliente…')??false,customer_unavailable:document.querySelector('main')?.textContent?.includes('Cliente no disponible')??false})).catch(()=>null)
  throw error
 }finally{
  page.off('request',onRequest);page.off('response',onResponse);page.off('requestfailed',onFailed)
  if(report)report.w2_admin_browser_observations=events
 }
}
