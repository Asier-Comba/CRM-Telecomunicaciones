import {readJson} from './lib.mjs'
export function checkRpcManifest(actual,manifest=readJson('scripts/security/native-postgres/function-privileges.json')){
 const publicFunctions=a=>a.filter(f=>f.signature.startsWith('public.'))
 const expected=publicFunctions(manifest.functions),observed=publicFunctions(actual.functions??[])
 if(JSON.stringify(observed)!==JSON.stringify(expected)){
  const e=new Error('PUBLIC_RPC_MANIFEST_DRIFT')
  e.differences=[...new Set([...expected,...observed].map(f=>f.signature))].map(signature=>({signature,expected:expected.find(f=>f.signature===signature)??null,observed:observed.find(f=>f.signature===signature)??null})).filter(f=>JSON.stringify(f.expected)!==JSON.stringify(f.observed))
  throw e
 }
 if(observed.some(f=>f.definer&&f.public))throw new Error('PUBLIC_DEFINER_EXECUTION_FORBIDDEN')
 return {result:'PASS',public_functions:observed.length,scope:'SIGNATURE_SECURITY_MODE_AND_EXECUTION_GRANTS'}
}
