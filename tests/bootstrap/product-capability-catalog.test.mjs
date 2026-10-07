import {EQUIPMENT_RPC_V1}from '../../src/lib/server/equipment-runtime-v1.ts'
import {SERVICE_LOCATION_RPC_V1}from '../../src/lib/server/service-location-runtime-v1.ts'
import {SERVICE_COMMERCIAL_RPC_V1}from '../../src/lib/server/telecom-service-commercial-runtime-v1.ts'
import {SIM_RPC_V1}from '../../src/lib/server/sim-runtime-v1.ts'
import {CASE_RPC_V1}from '../../src/lib/server/case-runtime-v1.ts'
import {PORTABILITY_RPC_V1}from '../../src/lib/server/portability-runtime-v1.ts'
import {IDENTIFIER_RPC_V1}from '../../src/lib/server/identifiers-runtime-v1.ts'
import {CATALOG_RPC_V1}from '../../src/lib/server/catalog-runtime-v1.ts'
import {TELECOM_COLLECTION_SPECS_V1}from '../../src/lib/server/telecom-collection-specs-v1.ts'
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DOCUMENT_MAINTENANCE_RPC_V1}from '../../src/lib/server/document-maintenance-service-v1.ts'
import {SETTINGS_RPC_V1}from '../../src/lib/server/settings-runtime-v1.ts'
import {AUTOMATIONS_RPC_V1}from '../../src/lib/server/automations-runtime-v1.ts'
import {NOTIFICATIONS_RPC_V1}from '../../src/lib/server/notifications-runtime-v1.ts'
import {INBOX_RPC_V1}from '../../src/lib/server/inbox-runtime-v1.ts'
import {IMPORTJOB_RPC_V1}from '../../src/lib/server/importjob-runtime-v1.ts'
import {BILLING_ARTIFACT_RPC_V1}from '../../src/lib/server/billing-artifact-runtime-v1.ts'
import {DOCUMENT_CONTENT_RPC_V1}from '../../src/lib/server/document-content-runtime-v1.ts'
import {DOCUMENT_RPC_V1}from '../../src/lib/server/document-runtime-v1.ts'
import {PORTFOLIO_RPC_V1}from '../../src/lib/server/portfolio-runtime-v1.ts'
import {TEAM_RPC_V1} from '../../src/lib/server/team-runtime-v1.ts'
import {BILLING_RPC_V1} from '../../src/lib/server/billing-runtime-v1.ts'
import {BILLING_QUERY_RPC_V1} from '../../src/lib/server/billing-query-runtime-v1.ts'
import {PRODUCT_RPC_V1} from '../../src/lib/server/product-runtime-v1.ts'
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8')
const catalog=JSON.parse(read('docs/master/contracts/product-capabilities.json'))
const environmentNames=new Set(JSON.parse(read('docs/master/contracts/product-environment.json')).entries.map(e=>e.name))
test('capability catalog covers registered product transport and explicit RPC privileges',()=>{
 const writes=catalog.operations.filter(o=>o.kind==='write'&&o.version==='product.v1')
 assert.deepEqual(writes.map(o=>o.name).sort(),Object.keys(PRODUCT_RPC_V1).sort())
 const http=read('src/lib/server/product-http-v1.ts')
 const reads=http.match(/!\[([^\]]+)\]\.includes\(op\)/)[1].match(/'[^']+'/g).map(x=>x.slice(1,-1))
 assert.deepEqual(catalog.operations.filter(o=>o.kind==='read'&&o.version.startsWith('product.')).map(o=>o.name).sort(),reads.sort())
 assert.deepEqual(catalog.operations.filter(o=>o.kind==='write'&&o.version==='billing.v1').map(o=>o.name).sort(),Object.keys(BILLING_RPC_V1).sort())
 assert.deepEqual(catalog.operations.filter(o=>o.kind==='read'&&o.version==='billing.v1'&&o.name!=='invoice.pdf').map(o=>o.name).sort(),Object.keys(BILLING_QUERY_RPC_V1).sort())
 assert.equal(new Set(catalog.operations.map(o=>o.name)).size,catalog.operations.length)
 assert.deepEqual(catalog.operations.filter(o=>o.kind==='write'&&o.version==='team.v1').map(o=>o.name).sort(),Object.keys(TEAM_RPC_V1).sort())
 assert.deepEqual(catalog.operations.filter(o=>o.kind==='read'&&o.version==='team.v1').map(o=>o.name),['member.list','member.invite_list'])
 assert.deepEqual(catalog.operations.filter(o=>o.kind==='write'&&o.version==='portfolio.v1').map(o=>o.name).sort(),Object.keys(PORTFOLIO_RPC_V1).sort())
 assert.deepEqual(catalog.operations.filter(o=>o.kind==='read'&&o.version==='portfolio.v1').map(o=>o.name),['portfolio.get'])
 assert.deepEqual(catalog.operations.filter(o=>o.kind==='write'&&o.version==='document.v1').map(o=>o.name).sort(),Object.keys(DOCUMENT_RPC_V1).sort())
 assert.deepEqual(catalog.operations.filter(o=>o.kind==='read'&&o.version==='document.v1').map(o=>o.name).sort(),['document.get_metadata','document.list'])
 assert.deepEqual(catalog.operations.filter(o=>o.kind==='write'&&o.version==='document.content.v1').map(o=>o.name).sort(),Object.keys(DOCUMENT_CONTENT_RPC_V1).sort())
 assert.deepEqual(catalog.operations.filter(o=>o.kind==='write'&&o.version==='billing.artifact.v1').map(o=>o.name).sort(),Object.keys(BILLING_ARTIFACT_RPC_V1).sort())
 assert.deepEqual(catalog.operations.filter(o=>o.kind==='write'&&o.version==='importjob.v1').map(o=>o.name),Object.keys(IMPORTJOB_RPC_V1))
 assert.deepEqual(catalog.operations.filter(o=>o.kind==='write'&&o.version==='inbox.v1').map(o=>o.name).sort(),Object.keys(INBOX_RPC_V1).sort())
 assert.deepEqual(catalog.operations.filter(o=>o.kind==='write'&&o.version==='notifications.v1').map(o=>o.name).sort(),Object.keys(NOTIFICATIONS_RPC_V1).sort())
 assert.deepEqual(catalog.operations.filter(o=>o.kind==='write'&&o.version==='automations.v1').map(o=>o.name).sort(),Object.keys(AUTOMATIONS_RPC_V1).sort())
 assert.deepEqual(catalog.operations.filter(o=>o.kind==='write'&&o.version==='settings.v1').map(o=>o.name).sort(),Object.keys(SETTINGS_RPC_V1).sort())
 assert.deepEqual(catalog.operations.filter(o=>o.version==='telecom.collections.v1').map(o=>o.name).sort(),Object.keys(TELECOM_COLLECTION_SPECS_V1).sort())
 assert.deepEqual(catalog.operations.filter(o=>o.version==='identifiers.v1').map(o=>o.name).sort(),Object.keys(IDENTIFIER_RPC_V1).sort())
 assert.deepEqual(catalog.operations.filter(o=>o.version==='catalog.v1').map(o=>o.name).sort(),Object.keys(CATALOG_RPC_V1).sort())
 assert.deepEqual(catalog.operations.filter(o=>o.version==='portability.v1').map(o=>o.name).sort(),Object.keys(PORTABILITY_RPC_V1).sort())
 assert.deepEqual(catalog.operations.filter(o=>o.version==='case.v1').map(o=>o.name).sort(),Object.keys(CASE_RPC_V1).sort())
 assert.deepEqual(catalog.operations.filter(o=>o.version==='equipment.v1').map(o=>o.name).sort(),Object.keys(EQUIPMENT_RPC_V1).sort())
 assert.deepEqual(catalog.operations.filter(o=>o.version==='service_location.v1').map(o=>o.name).sort(),Object.keys(SERVICE_LOCATION_RPC_V1).sort())
 assert.deepEqual(catalog.operations.filter(o=>o.version==='sim.v1').map(o=>o.name).sort(),Object.keys(SIM_RPC_V1).sort())
 const manifest=JSON.parse(read('scripts/security/native-postgres/function-privileges.json'))
 for(const operation of catalog.operations){
  const privilege=manifest.functions.find(f=>f.signature.startsWith('public.'+operation.rpc+'('))
  assert.ok(privilege,operation.rpc)
  assert.equal(privilege.authenticated,true);assert.equal(privilege.anon,false)
  assert.equal(privilege.public,false);assert.equal(privilege.service_role,false)
  assert.equal(operation.transport.enabled_by_default,false)
  for(const flag of [operation.transport.enable_flag,operation.transport.additional_enable_flag,operation.transport.origin_flag].filter(Boolean))assert.ok(environmentNames.has(flag),'undeclared transport environment flag: '+flag)
  assert.ok(operation.input_type);assert.ok(operation.output_type)
  if(operation.kind==='write'){
   assert.equal(operation.rpc,(operation.version==='equipment.v1'?EQUIPMENT_RPC_V1:operation.version==='service_location.v1'?SERVICE_LOCATION_RPC_V1:operation.version==='telecom.service_commercial.v1'?SERVICE_COMMERCIAL_RPC_V1:operation.version==='sim.v1'?SIM_RPC_V1:operation.version==='case.v1'?CASE_RPC_V1:operation.version==='portability.v1'?PORTABILITY_RPC_V1:operation.version==='identifiers.v1'?IDENTIFIER_RPC_V1:operation.version==='catalog.v1'?CATALOG_RPC_V1:['document.integrity.v1','document.cleanup.v1'].includes(operation.version)?DOCUMENT_MAINTENANCE_RPC_V1:operation.version==='settings.v1'?SETTINGS_RPC_V1:operation.version==='automations.v1'?AUTOMATIONS_RPC_V1:operation.version==='notifications.v1'?NOTIFICATIONS_RPC_V1:operation.version==='inbox.v1'?INBOX_RPC_V1:operation.version==='importjob.v1'?IMPORTJOB_RPC_V1:operation.version==='billing.artifact.v1'?BILLING_ARTIFACT_RPC_V1:operation.version==='billing.v1'?BILLING_RPC_V1:operation.version==='team.v1'?TEAM_RPC_V1:operation.version==='portfolio.v1'?PORTFOLIO_RPC_V1:operation.version==='document.v1'?DOCUMENT_RPC_V1:operation.version==='document.content.v1'?DOCUMENT_CONTENT_RPC_V1:PRODUCT_RPC_V1)[operation.name])
   assert.equal(operation.idempotency.key,'command_id')
   assert.equal(operation.cas.required,operation.version==='identifiers.v1'?operation.name==='identifier.retire':operation.version==='catalog.v1'?['operator.update','operator.activate','operator.deactivate','plan.update_metadata','plan.change_status','plan_version.create'].includes(operation.name):operation.version==='automations.v1'?!['automation.create','automation.process_pending'].includes(operation.name):operation.version==='inbox.v1'?operation.name!=='conversation.create_internal':operation.version==='billing.v1'?operation.name!=='invoice.create_draft':operation.version==='team.v1'?operation.name!=='member.invite_intent':operation.version==='portfolio.v1'?(!operation.name.endsWith('.create_manual')&&operation.name!=='contract.record_renewal'):operation.version==='document.content.v1'?operation.name!=='document.request_upload':!operation.name.endsWith('.create'))
   assert.equal(operation.allowed_roles.includes('viewer'),operation.name==='settings.profile_update')
   assert.equal(operation.assistant_future,['equipment.v1','service_location.v1','telecom.service_commercial.v1','sim.v1','case.v1','portability.v1','identifiers.v1','catalog.v1'].includes(operation.version)?'FUTURE_AI_ACTION_CANDIDATE':'durable_Issue10_confirmation_required_not_registered')
  }
  if(operation.ui_safe)assert.equal(operation.supabase_tested,true)
 }
})
