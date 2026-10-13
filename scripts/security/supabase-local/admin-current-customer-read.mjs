import {parseCustomerEditorV1} from '../../../src/lib/server/product-runtime-v1.ts'

/** Same receipt/DTO checks for creation and reload; errors contain no body/cause. */
export async function readAdminCustomerResponse(pending,receipt){
 const response=await pending
 let input,body
 try{input=response.request().postDataJSON().input}catch{throw Error('ADMIN_CUSTOMER_INPUT_UNAVAILABLE')}
 try{body=await response.json()}catch{throw Error('ADMIN_CUSTOMER_BODY_UNAVAILABLE')}
 const fresh=parseCustomerEditorV1(receipt.id,body?.data)
 if(response.status()!==200||body?.ok!==true||Object.keys(body).sort().join(',')!=='data,ok'||!input||Object.keys(input).join(',')!=='id'||input.id!==receipt.id||!fresh||fresh.version<receipt.version||fresh.legal_name!=='W2 Admin Synthetic Company'||fresh.source!=='manual'||fresh.status!=='active')throw Error('ADMIN_NORMAL_CUSTOMER_READ_FAILED')
 return fresh
}

/** Match only ordinary requests emitted by the current main document.
 * No additional read, retry, authority or page/expect budget is introduced. */
export async function reloadAdminCustomer({page,origin,receipt,phase=()=>{}}){
 const url=page.url()
 let target
 try{target=new URL(url)}catch{throw Error('ADMIN_RELOAD_TARGET_INVALID')}
 if(!receipt||!Number.isSafeInteger(receipt.version)||receipt.version<1||typeof receipt.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(receipt.id)||target.origin!==origin||target.pathname!=='/clients/'+receipt.id||target.username||target.password)throw Error('ADMIN_RELOAD_TARGET_INVALID')
 let current=false,requests=new WeakSet()
 const navigated=frame=>{if(frame===page.mainFrame()){current=frame.url()===url;requests=new WeakSet()}}
 const requested=request=>{
  if(!current||request.frame()!==page.mainFrame()||request.method()!=='POST'||request.url()!==origin+'/api/product/v1/queries')return
  try{
   const body=request.postDataJSON()
   if(Object.keys(body).sort().join(',')==='input,operation'&&body.operation==='customer.editor'&&Object.keys(body.input).join(',')==='id'&&body.input.id===receipt.id)requests.add(request)
  }catch{}
 }
 page.on('framenavigated',navigated);page.on('request',requested)
 try{
  phase('reload_customer')
  const pending=page.waitForResponse(response=>current&&page.url()===url&&requests.has(response.request()))
  const [,response]=await Promise.all([page.reload(),pending])
  phase('reloaded_customer_read')
  return await readAdminCustomerResponse(response,receipt)
 }finally{page.off('framenavigated',navigated);page.off('request',requested)}
}
