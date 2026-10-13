import {createDurableNativeFixtureV1} from '../../platform/durable-native-fixture.mjs'
import {bindOwnedResourceRestartV1,closedOwnedConsumerPhaseV1} from './owned-resource-restart-channel-v1.mjs'
import {execFileSync,fork,spawnSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {loadOwnedConsumerMigrationsV1,loadOwnedConsumerGrants86V1} from './owned-consumer-migrations-v1.mjs'
const fail=()=>Error('OWNED_RESOURCE_BUSINESS_CONSUMER_UNAVAILABLE')
const diagnostic={stage:'RESOURCE_CREATE',lastObservedPhase:null,migration:null,teardown:'NOT_RUN'}
async function main(){
 let resource,relay,child,closed=false
 const mode=process.env.TELECOM_NATIVE_CONSUMER_MIGRATION_CLOSURE
 try{
  // W5 creates the only resource. W2 applies its own existing bootstrap/schema.
  resource=await createDurableNativeFixtureV1()
  diagnostic.stage='BOOTSTRAP'
  const container=resource.environment.TELECOM_NATIVE_TEST_CONTAINER
  if(resource.contract!=='telecom.native-resource.v1'||!/^[a-f0-9]{64}$/.test(container))throw fail()
  const env={PATH:process.env.PATH,CI:'true',GITHUB_ACTIONS:'true',NODE_ENV:'test',APP_ENV:'test',ALLOW_PRODUCTION_TESTS:'false',
   DOCKER_HOST:'unix:///var/run/docker.sock',DOCKER_CONTEXT:'',TELECOM_NATIVE_TEST_CONTAINER:container,TELECOM_NATIVE_RESOURCE_RESTART_CHANNEL:'true'}
  const sql=content=>{
   const result=spawnSync('docker',['exec','-i','-u','postgres',container,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d','telecom_test'],
    {env,input:content,encoding:'utf8',timeout:60000,maxBuffer:65536,windowsHide:true})
   if(result.status!==0||result.error)throw fail()
  }
  const root=new URL('../../../',import.meta.url)
  sql(readFileSync(new URL('scripts/security/native-postgres/bootstrap.sql',root),'utf8'))
  sql(readFileSync(new URL('scripts/security/ephemeral-postgres/storage-stub.sql',root),'utf8'))
  diagnostic.stage='MIGRATIONS'
  if(mode!==undefined&&mode!==''&&mode!=='delivered_grants_86'&&mode!=='require_grants_86')throw fail()
  const closure=mode==='require_grants_86'?loadOwnedConsumerGrants86V1(root):loadOwnedConsumerMigrationsV1(root,mode==='delivered_grants_86'?mode:'directory')
  for(const migration of closure.migrations){diagnostic.migration=migration.name;sql(migration.sql)}
  diagnostic.migration=null;diagnostic.stage='SYNTHETIC_BASE_SEED'
  sql("set app.environment='test';\n"+readFileSync(new URL('supabase/seeds/synthetic_portfolio.sql',root),'utf8'))
  const fixture=fileURLToPath(new URL('./assistant-safe-completion-races.mjs',import.meta.url))
  let output='',overflow=false
  diagnostic.stage='BUSINESS_FIXTURE'
  child=fork(fixture,[],{env,execArgv:['--experimental-transform-types'],stdio:['ignore','pipe','pipe','ipc']})
  relay=bindOwnedResourceRestartV1(child,()=>resource.restart())
  const timer=setTimeout(()=>child.kill('SIGKILL'),300000)
  child.stdout.on('data',bytes=>{output+=bytes.toString();if(Buffer.byteLength(output)>1048576){overflow=true;child.kill('SIGKILL')}})
  // Drain private error bytes without retaining or exporting them.
  child.stderr.on('data',()=>{})
  const code=await new Promise(resolve=>{child.once('exit',resolve);child.once('error',()=>resolve(-1))})
  clearTimeout(timer);diagnostic.lastObservedPhase=closedOwnedConsumerPhaseV1(output);if(code!==0||overflow)throw fail()
  const records=output.split(/\r?\n/).flatMap(line=>{try{return[JSON.parse(line)]}catch{return[]}})
  const observations=records.filter(row=>row.kind==='durable_v3_owned_resource_committed_restart_observation')
  if(observations.length!==1)throw fail()
  const observed=observations[0]
  if(observed.positiveEffectCount!==1||['committedLedgerUnchanged','originalAudit13Unchanged','preEffectBaselinePreserved','freshAdmittedConnection','authorizedReplayUnchanged','originalExpiredGrantPreserved','independentRestartBoundaryV3'].some(k=>observed[k]!==true)
   ||observed.full23!=='NOT_RUN'||observed.verifiedAbsence!=='NOT_RUN'||observed.businessAiWrites!=='OFF')throw fail()
  diagnostic.stage='RESOURCE_CLOSE';await relay.close();await resource.close();closed=true;diagnostic.teardown='PASS'
  const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();if(!/^[a-f0-9]{40}$/.test(source))throw fail()
  console.log(JSON.stringify({contract:'assistant.owned-resource-committed-restart.v1',source,result:'PASS',migrations:closure.count,migrationClosure:closure.closure,
   resource:'telecom.native-resource.v1',businessScenario:'completion_primitive',...observed,teardown:'PASS',release:'NOT_ACCEPTED'}))
 }finally{
  if(child?.exitCode===null)child.kill('SIGKILL')
  try{await relay?.close()}finally{if(resource&&!closed){await resource.close();diagnostic.teardown='PASS'}}
 }
}
try{await main()}catch(error){
 const category=error?.message==='OWNED_CONSUMER_MIGRATION_CLOSURE_REJECTED'?error.message:/^NATIVE_RESOURCE_IMAGE_PULL_(?:RATE_LIMITED|TLS_FAILED|AUTH_UNAVAILABLE|REFERENCE_UNAVAILABLE|NETWORK_UNAVAILABLE|OUTPUT_LIMIT|TIMEOUT|UNAVAILABLE)$/.test(error?.message??'')?error.message:'OWNED_RESOURCE_BUSINESS_CONSUMER_UNAVAILABLE'
 console.log(JSON.stringify({contract:'assistant.owned-resource-consumer-failure.v1',result:'FAIL',category,...diagnostic,full23:'NOT_RUN',businessAiWrites:'OFF',release:'NOT_ACCEPTED'}))
 console.error(category);process.exitCode=1
}
