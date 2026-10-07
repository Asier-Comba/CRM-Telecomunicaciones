import {readJson} from './lib.mjs'
export function checkRpcManifest(actual,manifest=readJson('scripts/security/native-postgres/function-privileges.json')){
 const publicFunctions=a=>a.filter(f=>f.signature.startsWith('public.'))
 const expected=publicFunctions(manifest.functions),observed=publicFunctions(actual.functions??[])
 if(JSON.stringify(observed)!==JSON.stringify(expected))throw new Error('PUBLIC_RPC_MANIFEST_DRIFT')
 if(observed.some(f=>f.definer&&f.public))throw new Error('PUBLIC_DEFINER_EXECUTION_FORBIDDEN')
 return {result:'PASS',public_functions:observed.length,scope:'SIGNATURE_SECURITY_MODE_AND_EXECUTION_GRANTS'}
}
