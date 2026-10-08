import {run,safeError} from './lib.mjs'
const name='crm-w5-package-smoke'
let started=false
try{
 if(process.env.CI!=='true'||process.env.GITHUB_ACTIONS!=='true')throw new Error('CONTAINER_CI_ONLY')
 if(run('docker',['ps','-a','--format','{{.Names}}']).trim().split('\n').includes(name))throw new Error('CONTAINER_NAME_IN_USE')
 run('docker',['build','--platform','linux/amd64','-f','infra/deployment/Dockerfile','-t','crm-w5-package:test','.'],{timeout:900000})
 run('docker',['run','--rm','-d','--name',name,'--read-only','--cap-drop=ALL','--security-opt=no-new-privileges','--tmpfs','/tmp:size=64m','--tmpfs','/app/.next/cache:size=128m,uid=65532,gid=65532','--health-interval=1s','--health-start-period=1s','-e','PLATFORM_TARGET=LOCAL','-p','127.0.0.1:3188:3000','crm-w5-package:test']);started=true
 let ready=false
 for(let n=0;n<60;n++){try{const r=await fetch('http://127.0.0.1:3188/api/health/live',{signal:AbortSignal.timeout(1000)});if(r.ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,250))}
 if(!ready)throw new Error('CONTAINER_LIVENESS_FAILED')
 let dockerHealthy=false
 for(let n=0;n<30;n++){if(run('docker',['inspect',name,'--format','{{.State.Health.Status}}']).trim()==='healthy'){dockerHealthy=true;break}await new Promise(r=>setTimeout(r,500))}
 if(!dockerHealthy)throw new Error('CONTAINER_HEALTHCHECK_FAILED')
 const r=await fetch('http://127.0.0.1:3188/api/health/ready',{signal:AbortSignal.timeout(3000)})
 if(r.status!==503)throw new Error('CONTAINER_UNCONFIGURED_READINESS_FAILED')
 const user=run('docker',['exec',name,'/nodejs/bin/node','-p','process.getuid()']).trim();if(user==='0')throw new Error('CONTAINER_ROOT_FORBIDDEN')
 const nodeVersion=run('docker',['exec',name,'/nodejs/bin/node','-p','process.versions.node']).trim();if(!nodeVersion.startsWith('24.'))throw new Error('RUNTIME_NODE_MAJOR_MISMATCH')
 console.log(JSON.stringify({status:'PASS',user:'NONROOT',filesystem:'READONLY',liveness:'PASS',docker_healthcheck:'PASS',node_version:nodeVersion,missing_backend:'FAIL_CLOSED',image:run('docker',['image','inspect','crm-w5-package:test','--format','{{.Id}}']).trim(),staging:'NOT_PROVEN',production:'NOT_PROVEN'}))
}catch(e){console.error(JSON.stringify({status:'FAIL',error:safeError(e)}));process.exitCode=1}
finally{if(started)try{run('docker',['stop',name])}catch{process.exitCode=1}}
