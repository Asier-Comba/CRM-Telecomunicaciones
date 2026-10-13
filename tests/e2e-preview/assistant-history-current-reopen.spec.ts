import {createServer} from 'node:http'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import {expect,test} from '@playwright/test'
import {currentHistoryReopen} from '../../scripts/security/supabase-local/assistant-history-current-reopen.mjs'

// Real browser/HTTP and the actual history client codec; no Auth/DB evidence.
for(const mode of ['success','html_refusal','foreign_dto'] as const){
 test(`history reopen correlates current ordinary reads, ${mode}`,async({page})=>{
  const thread={id:'00000000-0000-4000-8000-000000000001',title:'Synthetic renamed history',archived:false,version:2,created_at:'2026-10-10T00:00:00Z',updated_at:'2026-10-10T00:00:00Z'}
  const items=Array.from({length:20},(_,index)=>({id:`10000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`,sequence:index+1,turn_id:'20000000-0000-4000-8000-000000000001',role:index%2?'assistant':'user',content:'Synthetic historical message',created_at:thread.created_at}))
  const client=ts.transpileModule(readFileSync('src/features/assistant/history-client-v2.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText
  let reads=0,commands=0
  const server=createServer(async(request,response)=>{
   if(request.url==='/client.js'){response.writeHead(200,{'Content-Type':'text/javascript'});response.end(client);return}
   if(request.method==='POST'){
    if(request.url!=='/api/assistant/v2/threads'){commands++;response.writeHead(500);response.end();return}
    let text='';for await(const chunk of request)text+=chunk
    const body=JSON.parse(text);reads++
    if(body.operation==='thread.get'&&mode==='html_refusal'){response.writeHead(500,{'Content-Type':'text/html'});response.end('<p>synthetic private upstream error</p>');return}
    const record=mode==='foreign_dto'&&body.operation==='thread.get'?{...thread,id:'00000000-0000-4000-8000-000000000002'}:thread
    const data=body.operation==='thread.list'?{contract:'assistant.threads.v2',items:[thread],next_id:null}:body.operation==='thread.get'?{contract:'assistant.thread.v2',record}:{contract:'assistant.messages.v2',items,next_sequence:20,historical:true}
    response.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});response.end(JSON.stringify({ok:true,data}));return
   }
   response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});response.end(`<button>Abrir conversación</button><div id="messages"></div><script type="module">import{historyRequestV2,historyErrorTextV2}from'/client.js';document.querySelector('button').onclick=async()=>{try{const signal=new AbortController().signal;await historyRequestV2('thread.list',{limit:20},signal);const fresh=await historyRequestV2('thread.get',{id:'${thread.id}'},signal);const messages=await historyRequestV2('message.page',{id:fresh.record.id,limit:20},signal);document.getElementById('messages').innerHTML=messages.items.map(()=>'<p data-history-message>Historical fixture</p>').join('')}catch(error){document.getElementById('messages').textContent=historyErrorTextV2(error)}};window.fixtureReady=true</script>`)
  })
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve))
  try{
   const address=server.address();if(!address||typeof address==='string')throw Error('LOOPBACK_FIXTURE_REQUIRED')
   const origin=`http://127.0.0.1:${address.port}`
   await page.goto(origin+'/assistant');await page.waitForFunction(()=> (window as unknown as {fixtureReady:boolean}).fixtureReady)
   const action=async()=>{
    await page.getByRole('button',{name:'Abrir conversación',exact:true}).click()
    // Same original render expectation runs concurrently with response checks.
    await expect(page.locator('[data-history-message]')).toHaveCount(20)
   }
   const result=currentHistoryReopen({page,origin,thread,action})
   if(mode==='success'){await result;expect(reads).toBe(3)}
   else{
    await expect(result).rejects.toThrow(mode==='html_refusal'?'HISTORY_REOPEN_GET_HTTP_REFUSED':'HISTORY_REOPEN_GET_DTO_INVALID')
    await expect(page.getByText('No se pudo validar el historial.',{exact:true})).toBeVisible()
    await expect(page.locator('[data-history-message]')).toHaveCount(0)
    expect(reads).toBe(2)
   }
   expect(commands).toBe(0)
  }finally{
   // Disposing the page also settles the unchanged render assertion on refusal.
   await page.close();server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()))
  }
 })
}
