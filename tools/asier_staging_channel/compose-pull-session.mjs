import {dirname,isAbsolute,join,resolve,basename} from 'node:path'
import {imageTag,validateReceipt} from './contract.mjs'
import {registryImageEvidence} from './oci-evidence.mjs'
import {privatePackageBound} from './publisher.mjs'
import {localDockerCallV1,runnerDockerSocketV1} from '../asier_staging_network/local-docker.mjs'

/** Preparation-only prefetch adapter. Trusted target/config/receipt ports are
 * mandatory; no native command, filesystem or credential port is supplied.
 * On a future authorized target, config inspection must use realpath/lstat and
 * verify an empty owned 0700 directory. Never synthesize those facts from JSON.
 * No Compose/start/service-update command is representable by this protocol.
 */
export async function prefetchComposeImageV1({receipt,expected,actor,token,env,ports}={}){
 const result={version:'staging.compose.prefetch.v1',result:'FAIL',pull:'NOT_ATTEMPTED',image_reference:null,credential_cleanup:'NOT_CREATED',publishing_authorized:false,deploying_authorized:false,error:null}
 let config,call,loginAttempted=false
 try{
  expected=Object.freeze({...expected});env=Object.freeze({...env})
  const verified=validateReceipt(receipt,expected)
  if(typeof actor!=='string'||!/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(actor)||typeof token!=='string'||token.length<16||/[\r\n\0]/.test(token)||typeof env?.RUNNER_TEMP!=='string'||!isAbsolute(env.RUNNER_TEMP))throw Error('PULL_INPUT_INVALID')
  for(const name of ['authorizePull','assertLocalTarget','verifyReceipt','readPackage','readImage','createConfig','removeConfig','configAbsent','spawn'])if(typeof ports?.[name]!=='function')throw Error('PULL_TRUSTED_PORTS_REQUIRED')
  // Reject inherited selectors before config creation, authentication or engine contact.
  localDockerCallV1(env,join(env.RUNNER_TEMP,'crm-compose-pull-preflight'),ports.spawn)
  if(await ports.authorizePull({receipt:verified,socket:runnerDockerSocketV1})!==true)throw Error('PULL_NOT_AUTHORIZED')
  if(await ports.assertLocalTarget(runnerDockerSocketV1)!==true)throw Error('PULL_TARGET_UNVERIFIED')
  if(await ports.verifyReceipt(verified,expected)!==true)throw Error('PULL_RECEIPT_UNVERIFIED')
  if(!privatePackageBound(await ports.readPackage()))throw Error('PULL_PRIVATE_PACKAGE_REQUIRED')
  // Reuse existing tag reader, but compare BOTH immutable digests with the receipt.
  const proof=registryImageEvidence({...await ports.readImage(imageTag(verified.source,verified.public_build_sha256)),expected})
  if(proof.manifest_digest!==verified.manifest_digest||proof.image_config_digest!==verified.image_config_digest)throw Error('PULL_REGISTRY_BINDING_MISMATCH')
  config=Object.freeze({...await ports.createConfig(resolve(env.RUNNER_TEMP))})
  if(!config||typeof config.path!=='string'||!isAbsolute(config.path)||dirname(resolve(config.path))!==resolve(env.RUNNER_TEMP)||!basename(config.path).startsWith('crm-compose-pull-')||config.realpath!==config.path||config.mode!==0o700||config.isDirectory!==true||config.isSymlink!==false||config.empty!==true)throw Error('PULL_CONFIG_UNVERIFIED')
  call=localDockerCallV1(env,config.path,ports.spawn)
  const command=(args,input)=>{const outcome=call(args,{input});if(outcome.status!==0)throw Error('PULL_DOCKER_FAILED');return outcome.stdout?.trim()??''}
  loginAttempted=true;command(['login','ghcr.io','--username',actor,'--password-stdin'],token+'\n')
  result.pull='OUTCOME_UNKNOWN'
  command(['pull','--platform','linux/amd64',verified.image_reference])
  result.pull='PULLED_NOT_YET_VERIFIED'
  const actual=JSON.parse(command(['image','inspect',verified.image_reference,'--format','{{json .}}']))
  if(actual.Id!==verified.image_config_digest||actual.Os!=='linux'||actual.Architecture!=='amd64'||!Array.isArray(actual.RepoDigests)||!actual.RepoDigests.includes(verified.image_reference))throw Error('PULL_LOCAL_IMAGE_MISMATCH')
  if(!privatePackageBound(await ports.readPackage()))throw Error('PULL_PRIVATE_PACKAGE_CHANGED')
  result.result='PASS';result.pull='VERIFIED_LOCAL_DIGEST';result.image_reference=verified.image_reference
 }catch(error){
  const allowed=new Set(['PULL_INPUT_INVALID','PULL_TRUSTED_PORTS_REQUIRED','PULL_NOT_AUTHORIZED','PULL_TARGET_UNVERIFIED','PULL_RECEIPT_UNVERIFIED','PULL_PRIVATE_PACKAGE_REQUIRED','PULL_REGISTRY_BINDING_MISMATCH','PULL_CONFIG_UNVERIFIED','PULL_DOCKER_FAILED','PULL_LOCAL_IMAGE_MISMATCH','PULL_PRIVATE_PACKAGE_CHANGED','ALTERNATIVE_ENGINE_SELECTION_FORBIDDEN'])
  result.error=allowed.has(error?.message)?error.message:'PULL_SAFE_FAILURE'
 }finally{
  if(config){
   let clean=true
   if(loginAttempted){try{if(call(['logout','ghcr.io']).status!==0)clean=false}catch{clean=false}}
   // Never recursively remove an unverified path returned by a failed config port.
   const owned=typeof config.path==='string'&&isAbsolute(config.path)&&dirname(resolve(config.path))===resolve(env.RUNNER_TEMP)&&basename(config.path).startsWith('crm-compose-pull-')&&config.realpath===config.path&&config.isDirectory===true&&config.isSymlink===false
   if(owned){try{await ports.removeConfig(config.path)}catch{clean=false}try{if(await ports.configAbsent(config.path)!==true)clean=false}catch{clean=false}}else clean=false
   result.credential_cleanup=clean?'PASS':'FAIL'
   if(!clean){result.result='FAIL';result.error='PULL_CREDENTIAL_CLEANUP_FAILED'}
  }
 }
 return result
}
