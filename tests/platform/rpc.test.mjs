import {test} from 'node:test'
import assert from 'node:assert/strict'
import {checkRpcManifest} from '../../scripts/platform/rpc-manifest.mjs'
import {readJson} from '../../scripts/platform/lib.mjs'
test('real RPC grant inventory rejects missing/extra signatures or public definer grants',()=>{
 const manifest=readJson('scripts/security/native-postgres/function-privileges.json')
 assert.equal(checkRpcManifest(manifest).result,'PASS')
 const i=manifest.functions.findIndex(f=>f.signature.startsWith('public.'))
 const missing=structuredClone(manifest);missing.functions.splice(i,1);assert.throws(()=>checkRpcManifest(missing),/DRIFT/)
 const drift=structuredClone(manifest);drift.functions[i].authenticated=!drift.functions[i].authenticated;assert.throws(()=>checkRpcManifest(drift),/DRIFT/)
 const extra=structuredClone(manifest);extra.functions.push({...extra.functions[i],signature:'public.unregistered()'});assert.throws(()=>checkRpcManifest(extra),/DRIFT/)
})
