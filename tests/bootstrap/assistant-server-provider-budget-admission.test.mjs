import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import test from 'node:test'

test('actual server provider factory cannot dispatch from a configured key or invented budget approval',()=>{
 const script=`
  import {registerHooks} from 'node:module';
  registerHooks({resolve(specifier,context,next){return specifier==='server-only'?{url:'data:text/javascript,',shortCircuit:true}:next(specifier,context)}});
  let calls=0;
  globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({status:'completed',model:'synthetic-model',usage:{input_tokens:1,output_tokens:1,total_tokens:2},output:[{type:'message',role:'assistant',content:[{type:'output_text',text:'{}'}]}]}))};
  const {createAiProviderV2}=await import('./src/lib/server/ai-provider-v2.ts');
  const provider=createAiProviderV2();
  if(provider?.status==='ready')await provider.createTurn({instructions:'Synthetic only',userText:'Synthetic question',context:'{}',schemaName:'synthetic',schema:{type:'object',properties:{},additionalProperties:false},maxOutputTokens:256});
  console.log(JSON.stringify({providerReady:provider?.status==='ready',calls}));`
 const result=spawnSync(process.execPath,['--experimental-transform-types','--input-type=module','-e',script],{
  cwd:new URL('../..',import.meta.url),encoding:'utf8',timeout:10000,
  env:{...process.env,OPENAI_API_KEY:'synthetic-fixture-not-a-key',OPENAI_MODEL:'synthetic-model',AI_PROVIDER:'openai',AI_BUDGET_APPROVED:'true',AI_PRODUCT_V2_ENABLED:'true'}})
 assert.equal(result.status,0,'inert factory subprocess must finish')
 assert.deepEqual(JSON.parse(result.stdout.trim()),{providerReady:false,calls:0})
})
