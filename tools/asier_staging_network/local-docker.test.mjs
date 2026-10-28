import test from 'node:test'
import assert from 'node:assert/strict'
import {resolve} from 'node:path'
import {localDockerCallV1,localPlatformEnvironmentV1,runnerDockerSocketV1} from './local-docker.mjs'
const base={PATH:'synthetic-path',RUNNER_TEMP:resolve('owned-runner')},config=resolve('owned-runner','crm-docker-owned')
test('remote Docker selectors are rejected before any engine call, even on an empty daemon',()=>{
 let calls=0
 for(const name of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_CONFIG','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH','CONTAINER_HOST','SSH_AUTH_SOCK']){
  const env={...base,[name]:'unapproved-selection'}
  assert.throws(()=>localDockerCallV1(env,config,()=>calls++),/ALTERNATIVE_ENGINE_SELECTION_FORBIDDEN/)
  assert.throws(()=>localPlatformEnvironmentV1(env,config),/ALTERNATIVE_ENGINE_SELECTION_FORBIDDEN/)
 }
 assert.equal(calls,0)
})
test('every Docker call pins the local socket and empty owned config with a closed environment',()=>{
 let captured
 const call=localDockerCallV1({...base,SUPABASE_ACCESS_TOKEN:'synthetic-excluded',GITHUB_TOKEN:'synthetic-excluded'},config,(bin,args,options)=>{captured={bin,args,options};return{status:0}})
 call(['info'],{env:{DOCKER_HOST:'cannot-override'},shell:true})
 assert.equal(captured.bin,'docker');assert.deepEqual(captured.args,['--host',runnerDockerSocketV1,'--config',config,'info'])
 assert.equal(captured.options.shell,false);assert.deepEqual(Object.keys(captured.options.env).sort(),['HOME','LANG','LC_ALL','PATH','TMPDIR'])
 const sdk=localPlatformEnvironmentV1(base,config)
 assert.equal(sdk.DOCKER_HOST,runnerDockerSocketV1);assert.equal(sdk.DOCKER_CONFIG,config);assert.equal(sdk.DOCKER_CONTEXT,undefined)
})
