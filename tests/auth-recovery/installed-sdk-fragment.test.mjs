import test from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

test('installed SSR SDK rejects implicit invite initialization and getSession hides that error, without network',()=>{
 // Separate process: do not leak browser globals or replace the parent SDK.
 // Synthetic tokens only, empty cookie fixture, every fetch explicitly denied.
 const source=`
 import {createBrowserClient} from '@supabase/ssr';
 globalThis.BroadcastChannel=undefined;
 globalThis.document={visibilityState:'visible',addEventListener(){},removeEventListener(){}};
 globalThis.window={document,location:{href:'http://127.0.0.1:3000/auth/callback#access_token=SYNTHETIC_ONLY&refresh_token=SYNTHETIC_ONLY&type=invite'},addEventListener(){},removeEventListener(){}};
 let requests=0;
 const client=createBrowserClient('http://127.0.0.1:54321','SYNTHETIC_ANON',{isSingleton:false,cookies:{getAll:()=>[],setAll(){}},auth:{autoRefreshToken:false},global:{fetch:async()=>{requests++;throw Error('NETWORK_FORBIDDEN')}}});
 const initialization=await client.auth.initialize(),session=await client.auth.getSession();
 await client.auth.stopAutoRefresh();
 console.log(JSON.stringify({pkce_mismatch:initialization.error?.message==='Not a valid PKCE flow url.',session_present:!!session.data.session,session_error:!!session.error,network_calls:requests}));
 `
 const env=Object.fromEntries(['PATH','SystemRoot','TEMP','TMP'].filter(key=>process.env[key]).map(key=>[key,process.env[key]]))
 const result=spawnSync(process.execPath,['--input-type=module','-e',source],{cwd:fileURLToPath(new URL('../../',import.meta.url)),env,encoding:'utf8',timeout:10000,maxBuffer:65536,windowsHide:true})
 assert.equal(result.status,0);assert.equal(result.stderr,'')
 assert.deepEqual(JSON.parse(result.stdout),{pkce_mismatch:true,session_present:false,session_error:false,network_calls:0})
})
