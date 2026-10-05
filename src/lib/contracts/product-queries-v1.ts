import type { TaskFieldsV1,MeetingFieldsV1,OpportunityFieldsV1 } from './product-work-v1'
export type CalendarKindV1='task'|'meeting'|'renewal'|'permanence'
export type CalendarCursorV1={after_at:string;after_kind:CalendarKindV1;after_id:string}
export type CalendarInputV1={range_start:string;range_end:string;kind?:CalendarKindV1;status?:string;customer_id?:string;assigned_user_id?:string;limit?:number}&Partial<CalendarCursorV1>
export type CalendarEntryV1={kind:CalendarKindV1;id:string;version:number|null;title:string;status:string;customer_id:string|null;assigned_user_id:string|null;at:string;ends_at:string|null;all_day:boolean;date:string|null}
export type CalendarPageV1={contract_version:'product.v1';items:readonly CalendarEntryV1[];next:CalendarCursorV1|null}
type Base={id:string;version:number;status:string;customer_id:string|null}
export type WorkGetV1={contract_version:'product.v1'}&(
 {kind:'task';record:Base&Required<TaskFieldsV1>&{opportunity_id:string|null}}|
 {kind:'meeting';record:Base&Required<MeetingFieldsV1>&{opportunity_id:string|null}}|
 {kind:'opportunity';record:Base&Omit<Required<OpportunityFieldsV1>,'contract_id'|'service_id'|'plan_id'>&{stage_id:string;source:'manual'|'import'|'integration';links:readonly {kind:'contract'|'service'|'plan';id:string}[];history:readonly {version:number;operation:string;occurred_at:string;from_stage_id:string|null;to_stage_id:string;from_status:string|null;to_status:string}[];history_partial:boolean}}
)
export type StageCatalogV1={contract_version:'product.v1';items:readonly {id:string;code:string;display_name:string;position:number;outcome:'won'|'lost'|null;status:'active'|'retired'}[];next_id:string|null}
