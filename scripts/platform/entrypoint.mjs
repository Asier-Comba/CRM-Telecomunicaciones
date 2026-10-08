import {spawn} from 'node:child_process'
import {validateEnvironment} from './config.mjs'
const result=validateEnvironment(process.env,process.env.PLATFORM_TARGET)
if(result.status!=='VALID'){console.error(JSON.stringify(result));process.exit(1)}
// Remove only when W2 publishes an accepted hosted product runtime and W4
// verifies it. Presence of keys alone must not activate a demo/legacy product.
if(['STAGING','PROD'].includes(process.env.PLATFORM_TARGET)){console.error('HOSTED_PRODUCT_RUNTIME_NOT_ACCEPTED');process.exit(1)}
const child=spawn(process.execPath,['server.js'],{stdio:'inherit'})
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal))
child.on('exit',(code)=>process.exit(code??1))
