import type {EquipmentInputsV1,EquipmentOperationV1,EquipmentReceiptV1,EquipmentReadV1} from '@/lib/contracts/equipment-v1'
import {isEquipmentOperationV1,parseEquipmentInputV1,parseEquipmentReadV1,parseEquipmentReceiptV1} from '../../../lib/server/equipment-runtime-v1.ts'
import type {CatalogInputMapV1,CatalogOperationV1,CatalogReceiptV1,CatalogTermsV1} from '@/lib/contracts/catalog-v1'
import type {CaseInputsV1,CaseOperationV1,CaseReceiptV1,CasePageV1,CaseGetV1,CaseNotePageV1} from '@/lib/contracts/case-v1'
import type {SimInputsV1,SimOperationV1,SimReceiptV1,SimPageV1,SimGetV1,SimHistoryV1} from '@/lib/contracts/sim-v1'
import type {PortabilityInputsV1,PortabilityOperationV1,PortabilityReceiptV1,PortabilityPageV1,PortabilityGetV1} from '@/lib/contracts/portability-v1'
import type {IdentifierInputV1,IdentifierOperationV1,IdentifierReceiptV1,IdentifierRowV1} from '@/lib/contracts/identifiers-v1'
import type {TelecomReadInputsV1,TelecomReadOperationV1,TelecomReadResultV1} from '@/lib/contracts/telecom-reads-v1'
import type {TelecomAttentionInputV1,TelecomAttentionPageV1} from '@/lib/contracts/telecom-attention-v1'
import type {BillingAnalyticsInputV1,BillingAnalyticsOperationV1,BillingAnalyticsResultV1} from '@/lib/contracts/billing-analytics-v1'
import {isCatalogOperationV1,parseCatalogInputV1,parseCatalogResultV1} from '../../../lib/server/catalog-runtime-v1.ts'
import {isCaseOperationV1,parseCaseInputV1,parseCaseResultV1} from '../../../lib/server/case-runtime-v1.ts'
import {isSimOperationV1,parseSimInputV1,parseSimResultV1} from '../../../lib/server/sim-runtime-v1.ts'
import {isPortabilityOperationV1,parsePortabilityInputV1,parsePortabilityResultV1} from '../../../lib/server/portability-runtime-v1.ts'
import {isIdentifierOperationV1,parseIdentifierInputV1,parseIdentifierResultV1} from '../../../lib/server/identifiers-runtime-v1.ts'
import {isTelecomReadOperationV1,parseTelecomReadInputV1,parseTelecomReadResultV1} from '../../../lib/server/telecom-reads-runtime-v1.ts'
import {parseTelecomAttentionInputV1,parseTelecomAttentionResultV1} from '../../../lib/server/telecom-attention-runtime-v1.ts'
import {isBillingAnalyticsOperationV1,parseBillingAnalyticsInputV1,parseBillingAnalyticsResultV1} from '../../../lib/server/billing-analytics-runtime-v1.ts'
export type TelecomInputs=EquipmentInputsV1&CatalogInputMapV1&CaseInputsV1&SimInputsV1&PortabilityInputsV1&TelecomReadInputsV1&Record<IdentifierOperationV1,IdentifierInputV1>&Record<BillingAnalyticsOperationV1,BillingAnalyticsInputV1>&{'telecom.attention':TelecomAttentionInputV1}
export type TelecomOperation=keyof TelecomInputs
export type TelecomResult<O extends TelecomOperation>=
 O extends 'equipment.get'|'equipment.list'|'equipment.history'?Extract<EquipmentReadV1,{operation:O}>:O extends EquipmentOperationV1?EquipmentReceiptV1:
 O extends 'plan_version.terms_get'?Readonly<{contract_version:'catalog.v1';operation:O;record:CatalogTermsV1}>:
 O extends CatalogOperationV1?CatalogReceiptV1:
 O extends 'case.list'?CasePageV1:O extends 'case.get'?CaseGetV1:O extends 'case.note_list'?CaseNotePageV1:O extends CaseOperationV1?CaseReceiptV1:
 O extends 'sim.list'?SimPageV1:O extends 'sim.get'?SimGetV1:O extends 'sim.history'?SimHistoryV1:O extends SimOperationV1?SimReceiptV1:
 O extends 'portability.list'?PortabilityPageV1:O extends 'portability.get'?PortabilityGetV1:O extends PortabilityOperationV1?PortabilityReceiptV1:
 O extends 'identifier.list'?Readonly<{contract_version:'identifiers.v1';operation:O;items:readonly IdentifierRowV1[];next_id:string|null}>:O extends 'identifier.get'?Readonly<{contract_version:'identifiers.v1';operation:O;record:IdentifierRowV1}>:O extends IdentifierOperationV1?IdentifierReceiptV1:
 O extends TelecomReadOperationV1?TelecomReadResultV1<O>:O extends 'telecom.attention'?TelecomAttentionPageV1:O extends BillingAnalyticsOperationV1?BillingAnalyticsResultV1:never
/** Reuse accepted W1 closed validators; the repository remains the sole transport. */
export function telecomBoundary(operation:TelecomOperation,value:unknown):{endpoint:string;input:unknown;parse:(v:unknown)=>unknown|null}|null{
 if(isEquipmentOperationV1(operation)){const input=parseEquipmentInputV1(operation,value);return input?{endpoint:'/api/telecom/equipment/v1',input,parse:v=>operation==='equipment.get'||operation==='equipment.list'||operation==='equipment.history'?parseEquipmentReadV1(operation,input,v):parseEquipmentReceiptV1(operation,input,v)}:null}
 if(isCatalogOperationV1(operation)){const input=parseCatalogInputV1(operation,value);return input?{endpoint:'/api/catalog/v1',input,parse:v=>parseCatalogResultV1(operation,input,v)}:null}
 if(isCaseOperationV1(operation)){const input=parseCaseInputV1(operation,value);return input?{endpoint:'/api/cases/v1',input,parse:v=>parseCaseResultV1(operation,input,v)}:null}
 if(isSimOperationV1(operation)){const input=parseSimInputV1(operation,value);return input?{endpoint:'/api/sims/v1',input,parse:v=>parseSimResultV1(operation,input,v)}:null}
 if(isPortabilityOperationV1(operation)){const input=parsePortabilityInputV1(operation,value);return input?{endpoint:'/api/portability/v1',input,parse:v=>parsePortabilityResultV1(operation,input,v)}:null}
 if(isIdentifierOperationV1(operation)){const input=parseIdentifierInputV1(operation,value);return input?{endpoint:'/api/identifiers/v1',input,parse:v=>parseIdentifierResultV1(operation,input,v)}:null}
 if(isTelecomReadOperationV1(operation)){const input=parseTelecomReadInputV1(operation,value);return input?{endpoint:'/api/telecom/reads/v1',input,parse:v=>parseTelecomReadResultV1(operation,input,v)}:null}
 if(operation==='telecom.attention'){const input=parseTelecomAttentionInputV1(value);return input?{endpoint:'/api/telecom/attention/v1',input,parse:v=>parseTelecomAttentionResultV1(input,v)}:null}
 if(isBillingAnalyticsOperationV1(operation)){const input=parseBillingAnalyticsInputV1(operation,value);return input?{endpoint:'/api/billing/analytics/v1',input,parse:v=>parseBillingAnalyticsResultV1(operation,input,v)}:null}
 return null
}
