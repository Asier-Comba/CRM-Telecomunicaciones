/** Cleanup every owned fixture even when another cleanup fails. Raw callback
 * errors never enter evidence; the caller supplies its already closed enum. */
export async function cleanupAssistantGroundingFixturesV1({caseCleanup,invoiceCleanup,primaryFailure}){
 if(![caseCleanup,invoiceCleanup].every(v=>v===null||typeof v==='function')
  ||primaryFailure!==null&&(typeof primaryFailure!=='string'||!/^W3_READ_GROUNDING_[A-Z0-9_]{1,160}$/.test(primaryFailure)))throw Error('W3_READ_GROUNDING_CLEANUP_CONFIGURATION')
 const run=async callback=>{if(callback===null)return 'NO_OWNED_HANDLE';try{await callback();return 'PASS'}catch{return 'FAIL'}}
 const caseStatus=await run(caseCleanup),invoiceStatus=await run(invoiceCleanup)
 return Object.freeze({contract:'w3.grounding-owned-fixture-cleanup.v1',case_status:caseStatus,invoice_status:invoiceStatus,
  primary_failure:primaryFailure,failed:caseStatus==='FAIL'||invoiceStatus==='FAIL'})
}
