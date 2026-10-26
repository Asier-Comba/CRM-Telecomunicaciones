import {spawnSync} from 'node:child_process'
import {randomBytes} from 'node:crypto'
import {mkdtempSync,writeFileSync,realpathSync,lstatSync,rmSync} from 'node:fs'
import {join,dirname,resolve} from 'node:path'
import {networkInterfaces} from 'node:os'
import {runnerAllowed,assertEmptyDaemon,labImage,labResourceId,ownedResource} from './network-policy.mjs'

const checks=[],resources=[],nonce=randomBytes(8).toString('hex'),prefix='crm-net50-'+nonce
const label='crm.telecom.networklab='+nonce
let swarmCreated=false,scratch,tempRoot,failed=false,untrackedCreation=false
const prove=(value,name)=>{if(!value)throw new Error(name);checks.push({name,status:'PASS'})}
function run(bin,args,timeout=120000){
 const r=spawnSync(bin,args,{encoding:'utf8',timeout,maxBuffer:4*1024*1024})
 if(r.status!==0)throw new Error('LAB_COMMAND_FAILED')
 return r.stdout.trim()
}
const docker=(...args)=>run('docker',args)
const inspect=(kind,id)=>JSON.parse(docker(kind==='network'?'network':'container','inspect',id))[0]
const probe=(role,...args)=>JSON.parse(docker('exec',prefix+'-'+role,'node','/lab/network-fixture.mjs',...args))
function own(kind,name,id){if(!labResourceId(id,kind)){untrackedCreation=true;throw new Error('LAB_ID_INVALID')}resources.push({kind,name,id});return name}
function network(role){const name=prefix+'-'+role;return own('network',name,docker('network','create','--driver','overlay','--attachable','--internal','--opt','encrypted','--label',label,name))}
function container(role,networkName,alias=role){
 const name=prefix+'-'+role
 const mounts=['--mount','type=bind,src='+resolve('scripts/deployment')+',dst=/lab,readonly']
 if(role==='supabase')mounts.push('--mount','type=bind,src='+join(scratch,'cert.pem')+',dst=/cert.pem,readonly','--mount','type=bind,src='+join(scratch,'key.pem')+',dst=/key.pem,readonly')
 if(role==='app')mounts.push('--mount','type=bind,src='+join(scratch,'cert.pem')+',dst=/ca.pem,readonly')
 return own('container',name,docker('run','-d','--name',name,'--label',label,'--network',networkName,'--network-alias',alias,'--user',process.getuid()+':'+process.getgid(),'--read-only','--cap-drop=ALL','--security-opt=no-new-privileges','--memory','96m','--cpus','0.25','--pids-limit','64','--tmpfs','/tmp:size=8m',...mounts,labImage,'node','/lab/network-fixture.mjs',role))
}
async function until(check){
 for(let i=0;i<40;i++){try{if(check())return}catch{}await new Promise(r=>setTimeout(r,250))}
 throw new Error('LAB_READINESS_FAILED')
}
let source_sha=null,result={},phase='PRECHECK'
try{
 if(!runnerAllowed(process.env,process.platform))throw new Error('GITHUB_HOSTED_LINUX_LAB_ONLY')
 prove(process.getuid()>0,'HOST_RUNNER_NONROOT')
 assertEmptyDaemon({swarm:docker('info','--format','{{.Swarm.LocalNodeState}}'),containers:docker('ps','-aq').split('\n').filter(Boolean).length})
 prove(true,'INITIAL_DAEMON_EMPTY_AND_NOT_SWARM')
 source_sha=run('git',['rev-parse','HEAD'])
 tempRoot=realpathSync(process.env.RUNNER_TEMP)
 scratch=mkdtempSync(join(tempRoot,'crm-net50-'))
 run('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(scratch,'key.pem'),'-out',join(scratch,'cert.pem'),'-days','1','-subj','/CN=supabase.fixture.test','-addext','subjectAltName=DNS:supabase.fixture.test'])
 phase='PINNED_FIXTURE_IMAGE';run('docker',['pull',labImage],300000)
 const address=Object.values(networkInterfaces()).flat().find(x=>x?.family==='IPv4'&&!x.internal)?.address
 if(!address)throw new Error('RUNNER_INTERFACE_REQUIRED')
 phase='OWN_SWARM_INIT';docker('swarm','init','--advertise-addr',address);swarmCreated=true
 prove(true,'SWARM_INITIALIZED_ON_EMPTY_RUNNER')
 phase='OWN_NETWORKS_AND_CONTAINERS'
 const global=network('global'),privateNet=network('private'),out=network('out')
 container('app',privateNet);container('victim',global);container('front',global)
 container('ingress',global);docker('network','connect','--alias','ingress',privateNet,prefix+'-ingress')
 container('egress',privateNet);docker('network','connect',out,prefix+'-egress')
 container('supabase',out,'supabase.fixture.test')
 phase='READINESS_AND_INGRESS'
 await until(()=>probe('app','get','http://app:3000').body==='synthetic-crm')
 await until(()=>probe('victim','get','http://victim:3000').body==='synthetic-victim')
 await until(()=>probe('victim','get','http://ingress:8080','admitted').body==='synthetic-crm')
 prove(true,'FIXED_INGRESS_REACHES_APP')
 prove(probe('victim','get','http://ingress:8080').status===403,'UNADMITTED_INGRESS_DENIED')
 prove(probe('victim','get','http://front:8081').reachable===true,'FRONT_FIXTURE_ALIVE')
 // Causal negative: reproduces the existing shared-overlay exposure only on owned fixtures.
 phase='CAUSAL_SHARED_OVERLAY'
 docker('network','connect',global,prefix+'-app')
 prove(probe('app','get','http://victim:3000').body==='synthetic-victim','SHARED_OVERLAY_REPRODUCES_LATERAL_ACCESS')
 docker('network','disconnect',global,prefix+'-app')
 phase='CANDIDATE_LATERAL_DENIALS'
 const victimIP=inspect('container',prefix+'-victim').NetworkSettings.Networks[global].IPAddress
 const frontIP=inspect('container',prefix+'-front').NetworkSettings.Networks[global].IPAddress
 const upstreamIP=inspect('container',prefix+'-supabase').NetworkSettings.Networks[out].IPAddress
 prove(probe('app','get','http://victim:3000').reachable===false,'LATERAL_DNS_DENIED_AFTER_ISOLATION')
 prove(probe('app','tcp',victimIP,'3000').connected===false,'LATERAL_IP_DENIED_AFTER_ISOLATION')
 prove(probe('app','tcp',frontIP,'8081').connected===false,'APP_CANNOT_USE_SHARED_PROXY_AS_LATERAL_RELAY')
 prove(probe('app','tcp',upstreamIP,'8443').connected===false,'DIRECT_UPSTREAM_BYPASS_DENIED')
 phase='CANDIDATE_TLS_EGRESS'
 await until(()=>probe('app','tunnel','supabase.fixture.test:8443','supabase.fixture.test').upstream===true)
 const positive=probe('app','tunnel','supabase.fixture.test:8443','supabase.fixture.test')
 prove(positive.tls_authorized===true&&positive.upstream===true,'EXACT_EGRESS_TLS_VERIFIED')
 prove(probe('app','tunnel','victim:3000','supabase.fixture.test').status===403,'EGRESS_OTHER_HOST_DENIED')
 prove(probe('app','tunnel','supabase.fixture.test:443','supabase.fixture.test').status===403,'EGRESS_OTHER_PORT_DENIED')
 prove(probe('app','tunnel','supabase.fixture.test:8443','wrong.fixture.test').tls_rejected===true,'WRONG_TLS_HOST_REJECTED')
 prove(Object.keys(inspect('container',prefix+'-app').NetworkSettings.Networks).length===1,'APP_ONLY_ON_PRIVATE_OVERLAY')
 phase='CONTAINER_BOUNDARIES'
 for(const item of resources.filter(x=>x.kind==='container')){
  const c=inspect('container',item.id)
  prove(c.HostConfig.ReadonlyRootfs&&!c.HostConfig.Privileged&&c.HostConfig.CapDrop.includes('ALL')&&c.HostConfig.SecurityOpt.includes('no-new-privileges')&&c.Config.User.split(':')[0]!=='0'&&Object.keys(c.HostConfig.PortBindings??{}).length===0,'CONTAINER_BOUNDARY_'+item.name.slice(prefix.length+1).toUpperCase())
 }
 result={status:'PASS',scope:'DISPOSABLE_SWARM_NETWORK_TOPOLOGY_ONLY',source_sha,checks,image:labImage,hosted_isolation:'NOT_PROVEN',actual_supabase:'NOT_CONTACTED',actual_traefik:'NOT_TESTED',dns_exfiltration:'NOT_PROVEN',production:'NOT_AUTHORIZED'}
}catch(e){failed=true;result={status:'FAIL',scope:'DISPOSABLE_SWARM_NETWORK_TOPOLOGY_ONLY',source_sha,phase,checks,error:/^[A-Z0-9_]+$/.test(e.message)?e.message:'NETWORK_LAB_FAILURE'}}
finally{
 let clean=!untrackedCreation
 for(const item of resources.reverse()){
  try{
   const object=inspect(item.kind,item.id),normalized=item.kind==='container'?{Id:object.Id,Labels:object.Config.Labels}:object
   if(!ownedResource(normalized,item.id,nonce,item.kind))throw new Error('OWNERSHIP_MISMATCH')
   if(item.kind==='container')docker('rm','--force',item.id)
   else{let removed=false;for(let i=0;i<20;i++){try{docker('network','rm',item.id);removed=true;break}catch{await new Promise(r=>setTimeout(r,250))}}if(!removed)throw new Error('NETWORK_TEARDOWN_FAILED')}
  }catch{clean=false}
 }
 if(swarmCreated){try{if(docker('service','ls','-q'))throw new Error('UNEXPECTED_SERVICES');docker('swarm','leave','--force')}catch{clean=false}}
 if(scratch){try{if(dirname(realpathSync(scratch))!==tempRoot||lstatSync(scratch).isSymbolicLink())throw new Error('SCRATCH_SCOPE_INVALID');rmSync(scratch,{recursive:true,force:true})}catch{clean=false}}
 result.teardown=clean?'PASS':'FAIL'
 if(!clean)failed=true
 const summary=JSON.stringify(result,null,2)
 console.log(summary)
 // Safe metadata only, no certificate/key, raw logs, provider values or swarm token.
 if(runnerAllowed(process.env,process.platform))writeFileSync('network-isolation.safe.json',summary+'\n')
 if(failed)process.exitCode=1
}
