import {readFileSync,mkdirSync,writeFileSync,openSync,closeSync} from 'node:fs'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {preflight,origin,projectRef} from './preflight.mjs'
import {hostedFlow} from './flow.mjs'

const report={contract:'oier.hosted-qa.safe.v1',result:'NOT_RUN',phase:'PREFLIGHT',completed:[],cloudDatabaseIndependentRead:'NOT_RUN',voiceReal:'NOT_RUN',speechStub:'NOT_USED',modelLive:'NOT_RUN',release:'NOT_ACCEPTED',observedMutations:null}
async function main(){
let manifest
try{manifest=JSON.parse(readFileSync(process.env.OIER_CLOUD_QA_MANIFEST,'utf8'))}catch{/* No paths or private input content in evidence. */}
const gate=preflight(manifest)
report.preflight=gate
if(!gate.ok||!process.argv.includes('--run')){
 console.log(JSON.stringify(report,null,2));process.exitCode=gate.ok?0:2
}else{
 const repository=resolve(fileURLToPath(new URL('../..',import.meta.url)))
 const directory=resolve(repository,'../oier-cloud-qa-private',manifest.windowId)
 mkdirSync(directory,{recursive:true})
 // Existing state means REVIEW/RESUME, never another automatic customer/draft creation.
 let lock
 try{lock=openSync(resolve(directory,'run.lock'),'wx');closeSync(lock)}catch(error){report.preflight={ok:false,codes:[error.code==='EEXIST'?'EXISTING_WINDOW_RUN_REQUIRES_REVIEW':'PRIVATE_JOURNAL_LOCK_UNAVAILABLE']};console.log(JSON.stringify(report,null,2));process.exitCode=2}
 if(lock!==undefined){
  const journal={windowId:manifest.windowId,candidateSha:manifest.candidateSha,customerId:null,invoiceId:null,lastDispatch:null}
  const save=()=>writeFileSync(resolve(directory,'private-progress.json'),JSON.stringify(journal,null,2))
  save()
  report.candidateSha=manifest.candidateSha;report.deployId=manifest.deployId;report.siteId=manifest.siteId
  report.origin=origin;report.projectRef=projectRef
  report.deploymentIdentity='EXTERNAL_ASIER_W5_HANDOFF_ATTESTATION_NOT_INDEPENDENT_PROVIDER_INSPECTION'
  report.deploymentEvidenceRef=manifest.deploymentEvidenceRef
  report.approvalRefs=[manifest.integratorReviewRef,manifest.cloudWindowRef]
  let browser,page
  try{
   report.phase='ATTACH_APPROVED_CONTEXT'
   const {chromium}=await import('@playwright/test')
   browser=await chromium.connectOverCDP(process.env.OIER_CLOUD_QA_CDP_URL,{noDefaults:true,timeout:15000})
   const contexts=browser.contexts()
   if(contexts.length!==1||contexts[0].pages().some(p=>!['about:blank',origin,'https://app.netlify.com'].some(allowed=>p.url()===allowed||p.url().startsWith(allowed+'/'))))throw Error('DEDICATED_CONTEXT_REQUIRED')
   page=await contexts[0].newPage();page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(30000)
   await hostedFlow(page,manifest,process.env,journal,save,report)
  }catch{
   // Never print Playwright errors/steps: locator fill diagnostics can contain credentials.
   report.result='FAIL';report.failure='SEE_SAFE_PHASE_NO_RAW_ERROR_OR_AUTH_ARTIFACTS'
  }finally{
   if(page&&report.result.startsWith('HOSTED_UI_API_FLOW_PASS'))await page.close().catch(()=>{})
   else if(page)report.recovery='OWN_QA_PAGE_LEFT_OPEN_FOR_REVIEW_DO_NOT_DUPLICATE_WRITES'
   // Installed CDP implementation disconnects transport; never close the shared context.
   if(browser)await browser.close().catch(()=>{})
   journal.phase=report.phase;journal.result=report.result;save()
   writeFileSync(resolve(directory,'result-safe.json'),JSON.stringify(report,null,2))
  }
  console.log(JSON.stringify(report,null,2));process.exitCode=report.result.startsWith('HOSTED_UI_API_FLOW_PASS')?0:1
 }
}
}
try{await main()}catch{report.result='FAIL';report.failure='RUNNER_LOCAL_PRECONDITION_FAILED_NO_RAW_ERROR';console.log(JSON.stringify(report,null,2));process.exitCode=1}
