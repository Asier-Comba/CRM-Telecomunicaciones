import {createServer,type ServerResponse} from 'node:http'
import {expect,test,type Request,type Response} from '@playwright/test'
import {reloadAdminCustomer} from '../../scripts/security/supabase-local/admin-current-customer-read.mjs'

// Actual document navigation and HTTP responses; no Auth/DB acceptance claim.
for(const denied of [false,true]){
 test(`admin reload correlates the new document, current denial=${denied}`,async({page})=>{
  const id='10000000-0000-4000-8000-000000000001',receipt={id,version:2}
  const data={contract_version:'product.v1',id,version:2,account_kind:'legal_entity',legal_name:'W2 Admin Synthetic Company',trade_name:null,lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}
  let documents=0,reads=0,commands=0,oldResponse:ServerResponse|undefined,releaseDocument:(()=>void)|undefined
  const html=(current:boolean)=>`<h1>Synthetic document</h1><script>${current?`fetch('/api/product/v1/queries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'customer.editor',input:{id:'${id}'}})}).catch(()=>{})`:''}</script>`
  const server=createServer((request,response)=>{
   if(request.url==='/api/product/v1/commands'){commands++;response.writeHead(500);response.end();return}
   if(request.url==='/api/product/v1/queries'){
    reads++
    if(reads===1){oldResponse=response;return}
    response.writeHead(denied?403:200,{'Content-Type':'application/json'})
    response.end(JSON.stringify(denied?{ok:false,error:'access_denied'}:{ok:true,data:{...data,version:3}}));return
   }
   if(request.url!=='/clients/'+id){response.writeHead(404);response.end();return}
   documents++
   if(documents===1){response.writeHead(200,{'Content-Type':'text/html'});response.end(html(false));return}
   // Complete an old document's read after reload begins, before new commit.
   // Browser response event releases the new document deterministically.
   releaseDocument=()=>{response.writeHead(200,{'Content-Type':'text/html'});response.end(html(true))}
   if(!oldResponse){response.writeHead(500);response.end();return}
   oldResponse.writeHead(200,{'Content-Type':'application/json'});oldResponse.end(JSON.stringify({ok:true,data}))
  })
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve))
  let oldRequest:Request|undefined
  const releaseOld=(response:Response)=>{if(response.request()===oldRequest)releaseDocument?.()}
  try{
   const address=server.address();if(!address||typeof address==='string')throw Error('LOOPBACK_FIXTURE_ADDRESS')
   const origin=`http://127.0.0.1:${address.port}`
   await page.goto(origin+'/clients/'+id)
   const oldPending=page.waitForRequest(r=>r.method()==='POST'&&r.url()===origin+'/api/product/v1/queries')
   await page.evaluate(customerId=>{void fetch('/api/product/v1/queries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'customer.editor',input:{id:customerId}})}).catch(()=>{})},id)
   oldRequest=await oldPending
   await expect.poll(()=>reads).toBe(1)
   // Original operation-only predicate selects the old response in both cases.
   const legacy=page.waitForResponse(r=>r.request().method()==='POST'&&r.url()===origin+'/api/product/v1/queries'&&r.request().postDataJSON()?.operation==='customer.editor')
   page.on('response',releaseOld)
   const actual=reloadAdminCustomer({page,origin,receipt})
   if(denied)await expect(actual).rejects.toThrow('ADMIN_NORMAL_CUSTOMER_READ_FAILED')
   else expect((await actual).version).toBe(3)
   const mistaken=await legacy
   expect(mistaken.request()).toBe(oldRequest);expect(mistaken.status()).toBe(200)
   expect(documents).toBe(2);expect(reads).toBe(2);expect(commands).toBe(0)
   await expect(page.getByRole('heading',{name:'Synthetic document'})).toBeVisible()
  }finally{
   page.off('response',releaseOld);server.closeAllConnections()
   await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()))
  }
 })
}
