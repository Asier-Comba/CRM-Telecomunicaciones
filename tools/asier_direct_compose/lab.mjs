import {spawnSync} from 'node:child_process'
import {mkdtempSync,writeFileSync,rmSync,lstatSync,chmodSync} from 'node:fs'
import {join} from 'node:path'
import {randomBytes} from 'node:crypto'
import {resolve4} from 'node:dns/promises'
import {localDockerCallV1} from '../asier_staging_network/local-docker.mjs'
const env=process.env
if(process.platform!=='linux'||env.GITHUB_ACTIONS!=='true'||env.RUNNER_ENVIRONMENT!=='github-hosted'||env.GITHUB_EVENT_NAME!=='pull_request'||env.GITHUB_REPOSITORY!=='Asier-Comba/CRM-Telecomunicaciones'||!env.RUNNER_TEMP||!/^[a-f0-9]{40}$/.test(env.EXPECTED_SOURCE??''))throw Error('DISPOSABLE_ONLY')
const dir=mkdtempSync(join(env.RUNNER_TEMP,'crm-direct-')),docker=localDockerCallV1(env,dir),project='crm-direct-lab-'+env.EXPECTED_SOURCE.slice(0,12)
const report={source:env.EXPECTED_SOURCE,status:'FAIL',checks:[],cleanup:false,STAGING_DEPLOYED:false,RELEASE_NOT_ACCEPTED:true,scope:'SYNTHETIC_APP_REAL_GATEWAYS_COMPOSE'}
function call(args,options={}){const r=docker(args,options);if(r.status!==0)throw Error('DOCKER_OPERATION_FAILED');return r.stdout.trim()}
const compose=(...args)=>call(['compose','-p',project,'-f',join(dir,'compose.json'),...args])
let swarm=false,started=false,sentinel
try{
 const g=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'});if(g.stdout.trim()!==env.EXPECTED_SOURCE)throw Error('SOURCE_MISMATCH')
 if(!lstatSync('/var/run/docker.sock').isSocket()||call(['ps','-aq'])||call(['info','--format','{{.Swarm.LocalNodeState}}'])!=='inactive')throw Error('EMPTY_ENGINE_REQUIRED')
 call(['swarm','init','--advertise-addr','127.0.0.1']);swarm=true
 const image='node:24.21.0-trixie-slim@sha256:c83040f7e24bacea68e58a0b96a484ba430bf24abb2973eab7ba4701144b7b63'
 call(['pull',image],{timeout:180000})
 const username='crm_lab',password=randomBytes(36).toString('base64url'),secret=join(dir,'ingress.json')
 writeFileSync(secret,JSON.stringify({username,password}),{mode:0o400});chmodSync(secret,0o444)
 const networks={'private':{driver:'overlay',attachable:true,internal:true},shared:{driver:'overlay',attachable:true},outbound:{driver:'overlay',attachable:true}}
 const services={}
 for(const role of ['app','ingress','egress']){
 const name=role==='app'?'crm-telecom-staging':'crm-telecom-'+role
 services[name]={image,pull_policy:'never',user:'65532:65532',read_only:true,cap_drop:['ALL'],security_opt:['no-new-privileges:true'],mem_limit:role==='app'?'768m':'256m',cpus:role==='app'?0.75:0.25,environment:{CRM_DISPOSABLE_SWARM_FIXTURE:'true'},working_dir:'/candidate',volumes:[process.cwd()+':/candidate:ro',...role==='ingress'?[secret+':/run/secrets/crm-lab-ingress:ro']:[]],command:['node','--experimental-transform-types','tools/asier_staging_network/swarm-fixture.mjs',role],networks:role==='app'?{private:{aliases:[name]}}:role==='ingress'?{private:{},shared:{aliases:[name]}}:{private:{aliases:[name]},outbound:{}},...role==='app'?{dns:['127.0.0.1'],dns_opt:['timeout:1','attempts:1']}:{}}}
 writeFileSync(join(dir,'compose.json'),JSON.stringify({services,networks}),{mode:0o600})
 started=true;compose('up','--no-build','--pull','never','-d')
 const ids=JSON.parse(compose('ps','--format','json').split('\n').filter(Boolean).map(l=>l).join('\n').startsWith('[')?compose('ps','--format','json'):'['+compose('ps','--format','json').split('\n').join(',')+']')
 const id=role=>ids.find(v=>v.Service===role).ID
 const inspect=c=>JSON.parse(call(['inspect',c]))[0]
 const app=id('crm-telecom-staging'),ingress=id('crm-telecom-ingress'),egress=id('crm-telecom-egress')
 for(const [c,m,cpu,n]of [[app,805306368,750000000,1],[ingress,268435456,250000000,2],[egress,268435456,250000000,2]]){
 const i=inspect(c);if(i.HostConfig.Memory!==m||i.HostConfig.NanoCpus!==cpu||!i.HostConfig.ReadonlyRootfs||Object.keys(i.NetworkSettings.Networks).length!==n||i.HostConfig.PortBindings&&Object.keys(i.HostConfig.PortBindings).length)throw Error('PHYSICAL_SPEC_MISMATCH')
 }
 report.checks.push('three_roles_limits_no_ports_readonly','private_app_network_only')
 sentinel=call(['run','-d','--name',project+'-sentinel','--network',project+'_shared','--network-alias','crm-telecom-ingress-canary','--mount','type=bind,source='+process.cwd()+',target=/candidate,readonly','--workdir','/candidate','--env','CRM_DISPOSABLE_SWARM_FIXTURE=true',image,'node','tools/asier_staging_network/swarm-fixture.mjs','canary'])
 const before=inspect(sentinel).Id,canaryIp=inspect(sentinel).NetworkSettings.Networks[project+'_shared'].IPAddress,appIp=inspect(app).NetworkSettings.Networks[project+'_private'].IPAddress
 const ip=(await resolve4('zgwotxnyqzfuzcnmgvtn.supabase.co'))[0]
 // Probe uses the established real gateway boundary tests, no hosted credentials/writes.
 function probe(c,input){const r=docker(['exec','-i',c,'node','--experimental-transform-types','tools/asier_staging_network/swarm-probe.mjs'],{input:JSON.stringify(input)});const p=JSON.parse(r.stdout);report.checks.push(...p.checks);if(r.status!==0||p.result!=='PASS')throw Error(p.failed_check??'PROBE_FAILED')}
 // Container readiness is a bounded TCP wait, not retrying failed acceptance.
 for(const c of [ingress,egress])call(['exec',c,'node','-e','let n=0;function p(){const s=require("node:net").connect(8080,"127.0.0.1");s.on("connect",()=>{s.destroy();process.exit(0)});s.on("error",()=>{if(++n>40)process.exit(1);setTimeout(p,250)})}p()'])
 // External canary joins only this lab shared network.
 probe(sentinel,{kind:'outside',canaryIp,appIp,supabaseIp:ip,username,password})
 probe(app,{kind:'internal',canaryIp,supabaseIp:ip})
 compose('up','--no-build','--pull','never','--force-recreate','-d','crm-telecom-staging')
 if(inspect(sentinel).Id!==before)throw Error('FOREIGN_PROJECT_CHANGED')
 report.checks.push('recreate_does_not_change_foreign_container')
 compose('down');started=false
 if(inspect(sentinel).Id!==before)throw Error('FOREIGN_CONTAINER_REMOVED')
 report.checks.push('stop_remove_owned_project_preserves_foreign_container')
 report.status='PASS'
}catch(e){report.error=/^[A-Z0-9_]+$/.test(e.message)?e.message:'LAB_FAILED'}
finally{
 try{if(sentinel)call(['rm','-f',sentinel]);if(started)compose('down');if(swarm)call(['swarm','leave','--force']);report.cleanup=call(['ps','-aq'])===''}catch{report.cleanup=false}
 if(!report.cleanup)report.status='FAIL'
 writeFileSync(join(env.RUNNER_TEMP,'direct-compose.safe.json'),JSON.stringify(report))
 rmSync(dir,{recursive:true,force:true})
}
console.log(JSON.stringify(report));if(report.status!=='PASS')process.exitCode=1
