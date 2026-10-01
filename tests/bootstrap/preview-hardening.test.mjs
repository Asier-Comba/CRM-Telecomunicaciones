import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createServer } from 'node:net'
import test from 'node:test'
import { browserCommand, nodeSupported, portAvailable, previewEnvironment, previewPort, projectStatus } from '../../scripts/preview-common.mjs'

test('Node24, local port, OS invocation and project diagnostics fail safely', async () => {
  assert.equal(nodeSupported('24.19.0'), true)
  for (const version of ['20.0.0','22.0.0','25.0.0']) assert.equal(nodeSupported(version), false)
  for (const port of ['0','80','65536','3107;echo x','https://foreign.invalid','0.0.0.0']) assert.throws(() => previewPort(port))
  assert.deepEqual(browserCommand(3107,'win32'), ['rundll32.exe',['url.dll,FileProtocolHandler','http://127.0.0.1:3107/login']])
  assert.ok(projectStatus().compatible)
  assert.ok(projectStatus('/does-not-exist').missing.includes('package-lock.json'))
  const server = createServer()
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve))
  try { assert.equal(await portAvailable(server.address().port), false) } finally { await new Promise(resolve => server.close(resolve)) }
})
test('synthetic child bindings override credentials without modifying parent', () => {
  const inherited = { NEXT_PUBLIC_SUPABASE_URL:'https://not-contacted.invalid', SUPABASE_SERVICE_ROLE_KEY:'synthetic-placeholder', OPENAI_API_KEY:'synthetic-placeholder', NEXT_PUBLIC_ENABLE_INBOX:'true' }
  const env = previewEnvironment(3107,inherited)
  assert.equal(env.NEXT_PUBLIC_SUPABASE_URL,'')
  assert.equal(env.SUPABASE_SERVICE_ROLE_KEY,'')
  assert.equal(env.OPENAI_API_KEY,'')
  assert.equal(env.NEXT_PUBLIC_ENABLE_INBOX,'false')
  assert.equal(env.NEXT_PUBLIC_ENABLE_DEMO_DATA,'true')
  assert.equal(inherited.NEXT_PUBLIC_ENABLE_INBOX,'true')
})
test('bounded request stream validates raw/text UTF8 boundaries and cancels excess', () => {
  execFileSync(process.execPath,['--experimental-transform-types','--input-type=module','-e',`
    import assert from 'node:assert/strict';
    import {readPreviewText} from './src/lib/telecom-preview/request.ts';
    const enc=new TextEncoder();
    const request=(raw,headers={})=>new Request('http://127.0.0.1/local',{method:'POST',headers,body:raw});
    const raw=JSON.stringify({text:'valid'});
    for(const n of [4095,4096]) assert.equal(await readPreviewText(request(raw+' '.repeat(n-enc.encode(raw).length))),'valid');
    assert.equal(await readPreviewText(request(raw+' '.repeat(4097-enc.encode(raw).length))),null);
    assert.equal(await readPreviewText(request(raw,{'content-length':'1'})),'valid');
    assert.equal(await readPreviewText(request(raw,{'content-length':'4097'})),null);
    assert.equal(await readPreviewText(new Request('http://127.0.0.1/local',{method:'POST'})),null);
    for(const n of [499,500]) assert.equal(await readPreviewText(request(JSON.stringify({text:'x'.repeat(n)}))),'x'.repeat(n));
    assert.equal(await readPreviewText(request(JSON.stringify({text:'x'.repeat(501)}))),null);
    assert.equal(await readPreviewText(request(JSON.stringify({text:'é'.repeat(250)}))),'é'.repeat(250));
    assert.equal(await readPreviewText(request(JSON.stringify({text:'é'.repeat(250)+'x'}))),null);
    for(const raw of ['[]','{}','{"text":" "}','{"text":"x","workspace":"A"}','{"text":"x","tenant":"A","tenant":"B"}','{"text":"x","__proto__":{}}']) assert.equal(await readPreviewText(request(raw)),null);
    assert.equal(await readPreviewText(request('{"text":"discard","text":"valid"}')),'valid');
    const bytes=enc.encode(JSON.stringify({text:'🙂é'})); let pulled=0;
    const chunks=new ReadableStream({pull(c){if(pulled===bytes.length)c.close();else c.enqueue(bytes.slice(pulled,pulled+++1))}},{highWaterMark:0});
    assert.equal(await readPreviewText(new Request('http://127.0.0.1/local',{method:'POST',body:chunks,duplex:'half'})),'🙂é');
    let cancelled=false, reads=0;
    const huge=new ReadableStream({pull(c){reads++;c.enqueue(new Uint8Array(4097))},cancel(){cancelled=true}},{highWaterMark:0});
    assert.equal(await readPreviewText(new Request('http://127.0.0.1/local',{method:'POST',body:huge,duplex:'half'})),null);
    assert.ok(cancelled);assert.equal(reads,1);
    const failed=new ReadableStream({pull(c){c.error(new Error('synthetic'))}});
    assert.equal(await readPreviewText(new Request('http://127.0.0.1/local',{method:'POST',body:failed,duplex:'half'})),null);
  `],{stdio:'pipe'})
})
test('preview envelope reuses W3 validation and rejects forged/deep malformed replies', () => {
  execFileSync(process.execPath,['--experimental-transform-types','--input-type=module','-e',`
    import assert from 'node:assert/strict';
    import {runPreviewRead} from './src/lib/telecom-preview/read-pipeline.ts';
    import {parsePreviewReply,readPreviewReply} from './src/lib/telecom-preview/reply.ts';
    const id='b0caa7e1-4391-4d84-991f-ac0d06a80e82';
    const good=await runPreviewRead('Qué tengo hoy',id);
    assert.ok(parsePreviewReply(good));assert.ok(await readPreviewReply(Response.json(good)));
    for(const mutate of [v=>v.extra=true,v=>v.request_id='forged',v=>v.responses=[],v=>v.responses[0].status='FORGED',v=>v.responses[0].meta.extra=true,v=>v.responses[0].meta.requestId='foreign',v=>v.responses[0].blocks.table.rows=[{unknown:'x'}],v=>v.responses[0].blocks.table.columns[0].extra=true,v=>v.responses[0].blocks.confirmation={status:'pending'},v=>v.responses[0].answer='x'.repeat(12001)]) {
      const bad=structuredClone(good);mutate(bad);assert.equal(parsePreviewReply(bad),null);
    }
    assert.equal(await readPreviewReply(new Response('x'.repeat(262145))),null);
    assert.equal(await readPreviewReply(new Response('{bad')),null);
    const badBlock=structuredClone(good);badBlock.responses[0].blocks.table=null;assert.equal(parsePreviewReply(badBlock),null);
    let getters=0;const exotic={...good};Object.defineProperty(exotic,'responses',{get(){getters++;return good.responses},enumerable:true});assert.equal(parsePreviewReply(exotic),null);assert.equal(getters,0);
  `],{stdio:'pipe'})
})
