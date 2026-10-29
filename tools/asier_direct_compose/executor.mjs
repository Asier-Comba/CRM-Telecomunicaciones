import {spawnSync} from 'node:child_process'
import {readFileSync,lstatSync} from 'node:fs'
import {join,resolve} from 'node:path'
import {protectedSession,sha256} from './session.mjs'
import {directPreflight,project} from './contract.mjs'
// Preparation only. No up/stop/down executor. Compose binary is standalone,
// avoiding a dynamically discovered Docker CLI plugin.
export async function executePreparation(directory,inventory,operation,spawn=spawnSync){
 if(!['config','dry-run'].includes(operation))throw Error('EXECUTION_NOT_AUTHORIZED')
 directory=resolve(directory)
 const required=['compose-bin','compose.json','interpolation.env','receipt.json','expected.json','policy.json','binding.json']
 if(JSON.stringify(Object.keys(inventory).sort())!==JSON.stringify([...required].sort()))throw Error('COMPLETE_INVENTORY_REQUIRED')
 return protectedSession(directory,inventory,verify=>{
 const json=n=>JSON.parse(readFileSync(join(directory,n+'.json'),'utf8'))
 const report=directPreflight({configuration:json('compose'),receipt:json('receipt'),expected:json('expected'),policy:json('policy'),binding:json('binding')})
 if(report.status!=='CONFIGURATION_CHECKED')throw Error('DIRECT_PREFLIGHT_BLOCKED')
 if(lstatSync(join(directory,'compose-bin')).mode&0o100?false:true)throw Error('PINNED_EXECUTOR_NOT_EXECUTABLE')
 verify()
 const args=['--project-name',project,'--project-directory',directory,'--env-file',join(directory,'interpolation.env'),'--file',join(directory,'compose.json'),...operation==='config'?['config','--format','json']:['--dry-run','up','--no-build','--pull','never','-d']]
 const result=spawn(join(directory,'compose-bin'),args,{env:{PATH:'/usr/bin:/bin',HOME:directory,DOCKER_HOST:'unix:///var/run/docker.sock',DOCKER_CONFIG:join(directory,'empty-docker-config'),COMPOSE_DISABLE_ENV_FILE:'1'},shell:false,encoding:'utf8',timeout:60000,maxBuffer:1048576})
 if(result.status!==0)throw Error('PREPARATION_EXECUTOR_FAILED')
 verify()
 return {status:'PREPARATION_ONLY',operation,output_sha256:sha256(result.stdout),deploying_authorized:false,STAGING_DEPLOYED:false}
 })
}
