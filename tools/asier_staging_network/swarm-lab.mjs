import {spawnSync} from 'node:child_process'
import {writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {randomBytes} from 'node:crypto'
import {resolve4} from 'node:dns/promises'
import {publicIpv4} from './policy.mjs'

const image='node:24.21.0-trixie-slim@sha256:c83040f7e24bacea68e58a0b96a484ba430bf24abb2973eab7ba4701144b7b63'
export async function runSwarmLab(env=process.env){
 if(process.platform!=='linux'||env.GITHUB_ACTIONS!=='true'||env.GITHUB_EVENT_NAME!=='pull_request'||env.GITHUB_REPOSITORY!=='Asier-Comba/CRM-Telecomunicaciones'||!env.RUNNER_TEMP||!/^[a-f0-9]{40}$/.test(env.EXPECTED_SOURCE??''))throw Error('SWARM_LAB_NOT_AUTHORIZED')
 const report={contract:'crm.private.swarm.lab.v1',scope:'DISPOSABLE_SYNTHETIC_APP_REAL_GATEWAYS',status:'FAIL',source:env.EXPECTED_SOURCE,tree:null,checks:[],recreated:false,cleanup:false,hosted:false,app_image_accepted:false,capacity_accepted:false,error:null}
 const prefix='crm-p0-'+env.EXPECTED_SOURCE.slice(0,12),services=[],networks=[]
 let secret,swarm=false
 const raw=(args,options={})=>spawnSync('docker',args,{encoding:'utf8',timeout:60000,maxBuffer:2*1024*1024,...options})
 const docker=(args,options)=>{const r=raw(args,options);if(r.status!==0)throw Error('LAB_DOCKER_COMMAND_FAILED');return r.stdout.trim()}
 const git=args=>{const r=spawnSync('git',args,{encoding:'utf8',timeout:10000});if(r.status!==0)throw Error('SOURCE_READ_FAILED');return r.stdout.trim()}
 const pause=()=>new Promise(resolve=>setTimeout(resolve,500))
 async function task(service,except){for(let n=0;n<60;n++){const ids=docker(['ps','--filter','label=com.docker.swarm.service.name='+service,'--filter','status=running','--format','{{.ID}}']).split('\n').filter(Boolean);if(ids.length===1&&ids[0]!==except)return ids[0];await pause()}throw Error('LAB_TASK_NOT_READY')}
 const probe=(container,input)=>{const value=JSON.parse(docker(['exec','-i',container,'node','--experimental-transform-types','tools/asier_staging_network/swarm-probe.mjs'],{input:JSON.stringify(input)}));if(value.result!=='PASS'||!Array.isArray(value.checks))throw Error('LAB_PROBE_FAILED');report.checks.push(...value.checks)}
 const address=(container,network)=>{const info=JSON.parse(docker(['inspect',container]))[0];return info.NetworkSettings.Networks[network].IPAddress}
 try{
  if(git(['rev-parse','HEAD'])!==env.EXPECTED_SOURCE)throw Error('SOURCE_MISMATCH')
  report.tree=git(['rev-parse','HEAD^{tree}'])
  if(docker(['ps','-a','--format','{{.ID}}'])||docker(['info','--format','{{.Swarm.LocalNodeState}}'])!=='inactive')throw Error('EMPTY_NON_SWARM_RUNNER_REQUIRED')
  docker(['pull','--platform','linux/amd64',image],{timeout:180000})
  swarm=true;docker(['swarm','init','--advertise-addr','127.0.0.1'])
  const privateNetwork=prefix+'-private',sharedNetwork=prefix+'-shared',outboundNetwork=prefix+'-outbound'
  for(const [name,internal]of [[privateNetwork,true],[sharedNetwork,false],[outboundNetwork,false]]){networks.push(name);docker(['network','create','--driver','overlay','--attachable',...(internal?['--internal']:[]),'--label','crm.disposable='+prefix,name])}
  if(JSON.parse(docker(['network','inspect',privateNetwork]))[0].Internal!==true)throw Error('INTERNAL_NETWORK_REQUIRED')
  report.checks.push('physical_internal_overlay_created')
  const username='crm_lab',password=randomBytes(36).toString('base64url')
  secret=prefix+'-ingress';docker(['secret','create',secret,'-'],{input:JSON.stringify({username,password})})
  const fixture=role=>['node','--experimental-transform-types','tools/asier_staging_network/swarm-fixture.mjs',role]
  const create=(role,nets,extras=[])=>{
   const name=prefix+'-'+role
   services.push(name)
   docker(['service','create','--detach','--no-resolve-image','--name',name,'--label','crm.disposable='+prefix,'--container-label','crm.disposable='+prefix,'--user','65532:65532','--read-only','--cap-drop','ALL','--limit-memory','256M','--limit-cpu','0.25','--endpoint-mode','dnsrr','--mount','type=bind,source='+process.cwd()+',target=/candidate,readonly','--workdir','/candidate','--env','CRM_DISPOSABLE_SWARM_FIXTURE=true',...nets.flatMap(([net,alias])=>['--network','name='+net+',alias='+alias]),...extras,image,...fixture(role)]);return name
  }
  const app=create('app',[[privateNetwork,'crm-telecom-staging']],['--dns','127.0.0.1','--dns-option','timeout:1','--dns-option','attempts:1'])
  const egress=create('egress',[[privateNetwork,'crm-telecom-egress'],[outboundNetwork,'crm-lab-outbound']])
  const ingress=create('ingress',[[privateNetwork,'crm-lab-private-ingress'],[sharedNetwork,'crm-telecom-ingress']],['--secret','source='+secret+',target=crm-lab-ingress'])
  const canary=create('canary',[[sharedNetwork,'crm-lab-canary']])
  await task(egress);await task(ingress)
  const appTask=await task(app),canaryTask=await task(canary),canaryIp=address(canaryTask,sharedNetwork),appIp=address(appTask,privateNetwork)
  const spec=JSON.parse(docker(['service','inspect',app]))[0].Spec.TaskTemplate
  if(JSON.stringify(spec.ContainerSpec.DNSConfig.Nameservers)!=='["127.0.0.1"]'||spec.Networks.length!==1||spec.ContainerSpec.Privileges?.CredentialSpec)throw Error('APP_NETWORK_SPEC_INVALID')
  report.checks.push('service_dns_upstream_loopback_only')
  const answers=await resolve4('zgwotxnyqzfuzcnmgvtn.supabase.co')
  if(!answers.length||!answers.every(publicIpv4))throw Error('SUPABASE_PUBLIC_IPV4_REQUIRED')
  probe(appTask,{kind:'internal',canaryIp,supabaseIp:answers[0]})
  probe(canaryTask,{kind:'outside',canaryIp,appIp,username,password})
  docker(['service','update','--detach','--force',app]);const recreated=await task(app,appTask)
  probe(recreated,{kind:'internal',canaryIp,supabaseIp:answers[0]});report.recreated=true;report.status='PASS'
 }catch(error){report.error=/^[A-Z0-9_]{1,100}$/.test(error?.message??'')?error.message:'LAB_FAILED'}finally{
  let clean=true
  for(const service of services.reverse())if(raw(['service','rm',service]).status!==0)clean=false
  for(let n=0;n<30;n++){const r=raw(['ps','-a','--filter','label=crm.disposable='+prefix,'--format','{{.ID}}']);if(r.status!==0){clean=false;break}if(!r.stdout.trim())break;if(n===29)clean=false;await pause()}
  if(secret&&raw(['secret','rm',secret]).status!==0)clean=false
  for(const network of networks.reverse())if(raw(['network','rm',network]).status!==0)clean=false
  if(swarm&&raw(['swarm','leave','--force']).status!==0)clean=false
  report.cleanup=clean;if(!clean)report.status='FAIL'
  writeFileSync(join(env.RUNNER_TEMP,'staging-swarm.safe.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'})
 }
 return report
}
if(process.argv[1]===fileURLToPath(import.meta.url)){try{const report=await runSwarmLab();console.log(JSON.stringify(report));if(report.status!=='PASS')process.exitCode=1}catch{console.error('SWARM_LAB_NOT_AUTHORIZED');process.exitCode=1}}
