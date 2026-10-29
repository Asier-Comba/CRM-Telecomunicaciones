function category(result){
 const message=String(result.stderr??'').toLowerCase()
 if(result.error?.code==='ETIMEDOUT')return 'TIMEOUT'
 if(/active endpoints/.test(message))return 'ACTIVE_ENDPOINTS'
 if(/in use|is used by|being used/.test(message))return 'IN_USE'
 if(/not found|no such/.test(message))return 'NOT_FOUND'
 if(/permission denied|access denied/.test(message))return 'PERMISSION_DENIED'
 if(/cannot connect|daemon.*not|connection refused/.test(message))return 'DAEMON_UNAVAILABLE'
 return result.status===0?'NONE':'UNCLASSIFIED'
}
export async function cleanupSwarmLabV1({prefix,services,networks,secret,swarm},raw,pause,removeConfig){
 if(!/^crm-p0-[a-f0-9]{12}$/.test(prefix)||[...services,...networks,...(secret?[secret]:[])].some(name=>!name.startsWith(prefix+'-')))throw Error('OWNED_LAB_RESOURCES_REQUIRED')
 const steps=[];let clean=true
 const record=(name,result)=>{const ok=result.status===0;steps.push({operation:name,ok,exit_code:result.status??null,error:category(result)});if(!ok)clean=false;return result}
 const call=(name,args)=>record(name,raw(args))
 for(const [index,service]of [...services].reverse().entries()){call('service_remove_'+index,['service','rm',service]);steps.at(-1).resource=service}
 if(raw)for(let n=0;n<30;n++){
  const result=raw(['ps','-a','--no-trunc','--filter','label=crm.disposable='+prefix,'--format','{{.ID}}'])
  if(result.status!==0){record('owned_containers_wait',result);break}
  if(!result.stdout.trim()){steps.push({operation:'owned_containers_wait',ok:true,exit_code:0,error:'NONE',observations:n+1});break}
  const ids=result.stdout.trim().split('\n')
  if(ids.length>64||ids.some(id=>!/^[a-f0-9]{64}$/.test(id))){clean=false;steps.push({operation:'owned_containers_validate',ok:false,exit_code:0,error:'CONTAINER_IDENTITIES_UNCONFIRMED'});break}
  for(const id of ids){
   const identity=call('owned_container_inspect',['container','inspect','--format','{{index .Config.Labels "crm.disposable"}}|{{index .Config.Labels "com.docker.swarm.service.name"}}|{{.State.Running}}|{{.State.Status}}',id])
   steps.at(-1).resource=id
   if(identity.status!==0)continue
   const [label,service,running,status,...extra]=identity.stdout.trim().split('|')
   if(label!==prefix||!services.includes(service)||extra.length||!['true','false'].includes(running)){
    clean=false;Object.assign(steps.at(-1),{ok:false,error:'CONTAINER_OWNERSHIP_UNCONFIRMED'});continue
   }
   steps.at(-1).state=status
   if(running==='false'&&['exited','dead','created'].includes(status)){
    call('stopped_owned_container_remove',['container','rm',id]);steps.at(-1).resource=id;steps.at(-1).state=status
   }
  }
  if(n===29){clean=false;steps.push({operation:'owned_containers_wait',ok:false,exit_code:0,error:'OWNED_CONTAINERS_REMAIN',observations:n+1})}
  await pause()
 }
 if(secret){call('secret_remove',['secret','rm',secret]);steps.at(-1).resource=secret}
 for(const [index,network]of [...networks].reverse().entries()){call('network_remove_'+index,['network','rm',network]);steps.at(-1).resource=network}
 const absence={}
 if(swarm){
  for(const [kind,args]of [['services',['service','ls']],['networks',['network','ls']],['secrets',['secret','ls']],['containers',['ps','-a']]]){
   const result=call('readback_'+kind,[...args,'--filter','label=crm.disposable='+prefix,'--format','{{.ID}}'])
   absence[kind]=result.status!==0?'UNKNOWN':result.stdout.trim()===''?'ABSENT':'PRESENT'
   if(absence[kind]!=='ABSENT')clean=false
  }
  call('swarm_leave',['swarm','leave','--force'])
  const state=call('swarm_state_readback',['info','--format','{{.Swarm.LocalNodeState}}'])
  absence.swarm=state.status!==0?'UNKNOWN':state.stdout.trim()==='inactive'?'ABSENT':'PRESENT';if(absence.swarm!=='ABSENT')clean=false
 }
 try{await removeConfig();steps.push({operation:'owned_config_remove',ok:true,exit_code:null,error:'NONE'})}catch{clean=false;steps.push({operation:'owned_config_remove',ok:false,exit_code:null,error:'OWNED_CONFIG_REMOVE_FAILED'})}
 return {ok:clean,steps,absence}
}
