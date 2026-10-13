import {cleanupAssistantGroundingFixturesV2} from './assistant-grounding-fixture-cleanup-v2.mjs'
/** Attempt every original cleanup and the unchanged owned metadata fixture.
 * No callback error or owned identifier leaves this closed observation. */
export async function cleanupAssistantGroundingFixturesV3({caseCleanup,invoiceCleanup,equipmentCleanup,documentCleanup,primaryFailure}){
 if(documentCleanup!==null&&typeof documentCleanup!=='function')throw Error('W3_READ_GROUNDING_CLEANUP_CONFIGURATION')
 const prior=await cleanupAssistantGroundingFixturesV2({caseCleanup,invoiceCleanup,equipmentCleanup,primaryFailure})
 let documentStatus='NO_OWNED_HANDLE'
 if(documentCleanup!==null){try{await documentCleanup();documentStatus='PASS'}catch{documentStatus='FAIL'}}
 return Object.freeze({contract:'w3.grounding-owned-fixture-cleanup.v3',case_status:prior.case_status,invoice_status:prior.invoice_status,equipment_status:prior.equipment_status,document_status:documentStatus,
  primary_failure:prior.primary_failure,failed:prior.failed||documentStatus==='FAIL'})
}
