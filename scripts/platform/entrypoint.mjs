import {spawn} from 'node:child_process'
import {readJson} from './lib.mjs'
import {evaluateRuntime} from './runtime-admission.mjs'
let binding=null
try{binding=readJson('infra/platform/public-build-binding.json')}catch{ /* Missing/malformed baked record cannot admit STAGING. */ }
// Only the image's versioned policy is read. No env path or approval flag.
// This proposal ships PROPOSED/PENDING and therefore still blocks STAGING.
const result=evaluateRuntime(process.env,process.env.PLATFORM_TARGET,readJson('infra/platform/product-staging-runtime-policy.json'),binding)
if(!result.accepted){console.error(result.configuration.status!=='VALID'?JSON.stringify(result.configuration):result.code);process.exit(1)}
const child=spawn(process.execPath,['server.js'],{stdio:'inherit'})
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal))
child.on('exit',(code)=>process.exit(code??1))
