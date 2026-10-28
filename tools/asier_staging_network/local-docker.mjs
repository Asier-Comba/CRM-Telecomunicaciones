import {spawnSync} from 'node:child_process'
import {isAbsolute} from 'node:path'

export const runnerDockerSocketV1='unix:///var/run/docker.sock'
function cleanEnvironment(env,config){
 if(Object.keys(env).some(name=>(name.startsWith('DOCKER_')||['CONTAINER_HOST','SSH_AUTH_SOCK'].includes(name))&&env[name]))throw Error('ALTERNATIVE_ENGINE_SELECTION_FORBIDDEN')
 if(!isAbsolute(config)||!env.PATH||!env.RUNNER_TEMP)throw Error('OWNED_DOCKER_CONFIGURATION_REQUIRED')
 return {PATH:env.PATH,HOME:env.RUNNER_TEMP,TMPDIR:env.RUNNER_TEMP,LANG:'C',LC_ALL:'C'}
}
export function localPlatformEnvironmentV1(env,config){
 return {...cleanEnvironment(env,config),DOCKER_HOST:runnerDockerSocketV1,DOCKER_CONFIG:config}
}
export function localDockerCallV1(env,config,spawn=spawnSync){
 const childEnv=cleanEnvironment(env,config)
 return (args,options={})=>spawn('docker',['--host',runnerDockerSocketV1,'--config',config,...args],{encoding:'utf8',timeout:60000,maxBuffer:2*1024*1024,...options,env:childEnv,shell:false})
}
