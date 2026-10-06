import {decodeBoundedImportCsvV1} from './import-csv-v1.ts'
import {parseIdentifierInputV1} from './identifiers-runtime-v1.ts'
import type {EncryptedImportStagingV1,ImportStagingRefV1} from './import-staging-disposable-v1.ts'
import type {SafeImportReferencePortV1} from './telecom-import-mapping-v1.ts'

export type ProtectedImportStageV1=Readonly<{contract_version:'protected_telecom_import.v1';total_rows:number;staging:ImportStagingRefV1;production_ready:false;status:'encrypted_disposable_staging_only'}>
const kinds={line:'lines',service:'services',contract:'contracts',sim:'sims'} as const
const command='00000000-0000-4000-8000-000000000001'
const invalid=()=>{throw new Error('PROTECTED_TELECOM_IMPORT_INVALID')}
/** No preview/row DTO, raw-value digest, logging or canonical apply escapes this seam. */
export async function stageProtectedTelecomImportV1(jobId:string,bytes:Uint8Array,adapter:EncryptedImportStagingV1,port:SafeImportReferencePortV1,objectId?:string):Promise<ProtectedImportStageV1>{
 if(adapter.health().provider!=='disposable-local'||adapter.health().production_ready)throw new Error('PROTECTED_TELECOM_IMPORT_NOT_CONFIGURED')
 const grant=await adapter.authorize(jobId,'stage')
 const scope=await port.resolve()
 if(!scope||scope.workspaceId!==grant.workspaceId||scope.actorId!==grant.actorId||!['owner','admin'].includes(scope.role))throw new Error('PROTECTED_TELECOM_IMPORT_ACCESS_DENIED')
 const records=decodeBoundedImportCsvV1(bytes)
 if(records.length<2||records[0].join(',')!=='entity_kind,entity_id,identifier_kind,canonical_value'||records[0].length!==4)invalid()
 const slots=new Set<string>(),values=new Set<string>()
 for(const row of records.slice(1)){
  if(row.length!==4)invalid()
  const input=parseIdentifierInputV1('identifier.create_manual',{command_id:command,entity_kind:row[0],entity_id:row[1],identifier_kind:row[2],canonical_value:row[3]})
  if(!input)invalid()
  const entityKind=input!.entity_kind!,entityId=input!.entity_id!,identifierKind=input!.identifier_kind!
  const slot=entityKind+':'+entityId+':'+identifierKind,value=identifierKind+':'+input!.canonical_value
  if(slots.has(slot)||values.has(value))invalid()
  slots.add(slot);values.add(value)
  const record=await port.lookup(grant.workspaceId,kinds[entityKind],entityId)
  if(!record||record.id!==entityId||record.kind!==kinds[entityKind]||record.workspaceId!==grant.workspaceId)throw new Error('PROTECTED_TELECOM_IMPORT_REFERENCE_INVALID')
 }
 const current=await port.resolve()
 if(!current||current.workspaceId!==grant.workspaceId||current.actorId!==grant.actorId||!['owner','admin'].includes(current.role))throw new Error('PROTECTED_TELECOM_IMPORT_ACCESS_DENIED')
 const staging=await adapter.put(grant,bytes,objectId)
 return Object.freeze({contract_version:'protected_telecom_import.v1',total_rows:records.length-1,staging,production_ready:false,status:'encrypted_disposable_staging_only'})
}
