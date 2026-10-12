import {cleanupAssistantGroundingFixturesV1} from './assistant-grounding-fixture-cleanup-v1.mjs'
/** Preserve both existing cleanups, then independently attempt owned equipment.
 * Missing handle is not evidence of absence. Never export raw callback errors. */
export async function cleanupAssistantGroundingFixturesV2({caseCleanup,invoiceCleanup,equipmentCleanup,primaryFailure}){
 if(equipmentCleanup!==null&&typeof equipmentCleanup!=='function')throw Error('W3_READ_GROUNDING_CLEANUP_CONFIGURATION')
 const prior=await cleanupAssistantGroundingFixturesV1({caseCleanup,invoiceCleanup,primaryFailure})
 let equipmentStatus='NO_OWNED_HANDLE'
 if(equipmentCleanup!==null){try{await equipmentCleanup();equipmentStatus='PASS'}catch{equipmentStatus='FAIL'}}
 return Object.freeze({contract:'w3.grounding-owned-fixture-cleanup.v2',case_status:prior.case_status,invoice_status:prior.invoice_status,equipment_status:equipmentStatus,
  primary_failure:prior.primary_failure,failed:prior.failed||equipmentStatus==='FAIL'})
}
