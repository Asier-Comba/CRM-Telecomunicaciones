export interface TaskCollectionRowV1{id:string;version:number;customer_id:string|null;opportunity_id:string|null;title:string;status:'pending'|'in_progress'|'completed'|'cancelled';priority:'low'|'normal'|'high'|null;assigned_user_id:string|null;due_at:string|null;due_on:string|null}
export interface MeetingCollectionRowV1{id:string;version:number;customer_id:string|null;opportunity_id:string|null;title:string;status:'scheduled'|'completed'|'cancelled'|'no_show';assigned_user_id:string|null;starts_at:string;starts_on:string;ends_at:string|null;timezone:string;all_day:boolean;channel:'in_person'|'phone'|'video'|'other'}
/** Safe commercial reads; minor units are decimal strings to preserve bigint precision. */
export interface CustomerRowV1 {
  id: string
  version: number
  display_name: string
  account_kind: "legal_entity" | "sole_trader"
  lifecycle: "lead" | "prospect" | "customer" | "former_customer"
  status: "active" | "inactive" | "archived"
  source: "manual" | "import" | "integration"
  assigned_user_id: string | null
}
export interface ContactRowV1 {
  id: string
  version: number
  customer_id: string
  display_name: string
  job_title: string | null
  status: "active" | "inactive" | "archived"
  is_primary: boolean
  has_email: boolean
  has_phone: boolean
}
export interface OpportunityRowV1 {
  id: string
  version: number
  customer_id: string
  title: string
  status: "open" | "won" | "lost" | "cancelled"
  stage_id: string
  owner_user_id: string | null
  currency: string | null
  amount_minor: string | null
  expected_close_date: string | null
  next_follow_up_at: string | null
  has_next_action: boolean
  source: "manual" | "import" | "integration"
  links: readonly Readonly<{ kind: 'contract' | 'service' | 'plan'; id: string }>[]
}
export interface ActivityRowV1 {
  id: string
  customer_id: string | null
  activity_kind: "created" | "updated" | "contacted" | "status_changed" | "system"
  summary_code: "entity.created" | "entity.updated" | "entity.contacted" | "entity.status_changed" | "system.imported" | "system.synchronized"
  occurred_at: string
  actor_user_id: string | null
  contract_id: string | null
  service_id: string | null
  opportunity_id: string | null
  task_id: string | null
  meeting_id: string | null
}
export interface AssigneeRowV1 {
  user_id: string
  display_name: string
  role: "owner" | "admin" | "member"
}
export interface OperatorRowV1 {
  version: number
  id: string
  code: string
  display_name: string
  status: "active" | "inactive"
  source: "manual" | "import" | "integration"
}
export interface PlanRowV1 {
  version: number
  id: string
  operator_id: string
  code: string
  display_name: string
  service_kind: "mobile" | "fiber" | "fixed_voice" | "data_connectivity" | "other"
  status: "active" | "retired"
}
export interface PlanVersionRowV1 {
  id: string
  plan_id: string
  operator_id: string
  service_kind: "mobile" | "fiber" | "fixed_voice" | "data_connectivity" | "other"
  version_number: number
  valid_from: string
  valid_until: string | null
  currency: string
  recurring_amount_minor: string | null
  plan_status: "active" | "retired"
}
export interface ContractRowV1 {
  id: string
  version: number
  customer_id: string
  operator_id: string
  plan_version_id: string | null
  assigned_user_id: string | null
  status: "draft" | "active" | "ended" | "cancelled"
  source: "manual" | "import" | "integration"
  start_date: string
  end_date: string | null
}
export interface ServiceRowV1 {
  id: string
  version: number
  customer_id: string
  contract_id: string
  operator_id: string
  plan_version_id: string | null
  service_kind: "mobile" | "fiber" | "fixed_voice" | "data_connectivity" | "other"
  display_name: string
  status: "pending" | "active" | "suspended" | "ended" | "cancelled"
  source: "manual" | "import" | "integration"
  activated_on: string | null
  ended_on: string | null
}
export interface LineRowV1 {
  service_kind: "mobile" | "fiber" | "fixed_voice" | "data_connectivity" | "other"
  masked_msisdn: string | null
  sim_id: string | null
  sim_kind: "physical" | "esim" | null
  sim_status: "assigned" | "active" | null
  masked_iccid: string | null
  masked_eid: string | null
  portability_id: string | null
  portability_status: "draft" | "requested" | "scheduled" | "in_progress" | "completed" | "rejected" | "cancelled" | null
  open_commitment_count: number
  next_commitment_ends_on: string | null

  id: string
  version: number
  service_id: string
  customer_id: string
  contract_id: string
  operator_id: string
  plan_version_id: string | null
  display_name: string
  status: "pending" | "active" | "suspended" | "ended" | "cancelled"
  source: "manual" | "import" | "integration"
  activated_on: string | null
  ended_on: string | null
}
export interface RenewalRowV1 {
  id: string
  version: number
  contract_id: string
  customer_id: string
  owner_user_id: string | null
  status: "open" | "completed" | "dismissed" | "not_applicable"
  source: "manual" | "import" | "integration"
  target_on: string
  opens_on: string | null
  closes_on: string | null
  attention_state: "open" | "completed" | "dismissed" | "not_applicable" | "overdue" | "upcoming"
}
export interface PermanenceRowV1 {
  id: string
  version: number
  contract_id: string
  service_id: string | null
  customer_id: string
  status: "open" | "cancelled"
  source: "manual" | "import" | "integration"
  commitment_kind: "minimum_term" | "device" | "subsidy" | "discount" | "other"
  starts_on: string
  ends_on: string
  days_remaining: number
  timing_state: "cancelled" | "expired" | "upcoming" | "current"
}
export interface TelecomCollectionRowsV1 {
  'task.list':TaskCollectionRowV1
  'meeting.list':MeetingCollectionRowV1
  "customer.list": CustomerRowV1
  "contact.list": ContactRowV1
  "opportunity.list": OpportunityRowV1
  "activity.list": ActivityRowV1
  "assignee.list": AssigneeRowV1
  "operator.list": OperatorRowV1
  "operator.get": OperatorRowV1
  "plan.list": PlanRowV1
  "plan.get": PlanRowV1
  "plan_version.list": PlanVersionRowV1
  "plan_version.get": PlanVersionRowV1
  "contract.list": ContractRowV1
  "service.list": ServiceRowV1
  "line.list": LineRowV1
  "renewal.list": RenewalRowV1
  "renewal.get": RenewalRowV1
  "permanence.list": PermanenceRowV1
  "permanence.get": PermanenceRowV1
}
export type TelecomCollectionOperationV1 = keyof TelecomCollectionRowsV1
export interface TelecomCollectionInputsV1 {
  'task.list':Readonly<{limit?:number;after_id?:string;sort?:'id_asc';customer_id?:string;opportunity_id?:string;assigned_user_id?:string;status?:'pending'|'in_progress'|'completed'|'cancelled';priority?:'low'|'normal'|'high';date_from?:string;date_to?:string}>
  'meeting.list':Readonly<{limit?:number;after_id?:string;sort?:'id_asc';customer_id?:string;opportunity_id?:string;assigned_user_id?:string;status?:'scheduled'|'completed'|'cancelled'|'no_show';date_from?:string;date_to?:string}>
  "customer.list": Readonly<{ limit?: number; after_id?: string; sort?: 'id_asc'; status?: "active" | "inactive" | "archived"; lifecycle?: "lead" | "prospect" | "customer" | "former_customer"; assigned_user_id?: string; source?: "manual" | "import" | "integration"; operator_id?: string }>
  "contact.list": Readonly<{ limit?: number; after_id?: string; sort?: 'id_asc'; customer_id?: string; status?: "active" | "inactive" | "archived" }>
  "opportunity.list": Readonly<{ limit?: number; after_id?: string; sort?: 'id_asc'; customer_id?: string; owner_user_id?: string; stage_id?: string; status?: "open" | "won" | "lost" | "cancelled"; currency?: string; expected_close_from?: string; expected_close_to?: string }>
  "activity.list": Readonly<{ limit?: number; after_id?: string; sort?: 'id_asc'; customer_id?: string; kind?: "created" | "updated" | "contacted" | "status_changed" | "system"; entity_kind?: "customer" | "contract" | "service" | "opportunity" | "task" | "meeting"; entity_id?: string; date_from?: string; date_to?: string }>
  "assignee.list": Readonly<{ limit?: number; after_id?: string; sort?: 'id_asc'; role?: "owner" | "admin" | "member" }>
  "operator.list": Readonly<{ limit?: number; after_id?: string; sort?: 'id_asc'; status?: "active" | "inactive"; source?: "manual" | "import" | "integration" }>
  "operator.get": Readonly<{ id: string }>
  "plan.list": Readonly<{ limit?: number; after_id?: string; sort?: 'id_asc'; operator_id?: string; service_kind?: "mobile" | "fiber" | "fixed_voice" | "data_connectivity" | "other"; status?: "active" | "retired" }>
  "plan.get": Readonly<{ id: string }>
  "plan_version.list": Readonly<{ limit?: number; after_id?: string; sort?: 'id_asc'; plan_id?: string; operator_id?: string; service_kind?: "mobile" | "fiber" | "fixed_voice" | "data_connectivity" | "other"; valid_on?: string; status?: "active" | "retired" }>
  "plan_version.get": Readonly<{ id: string }>
  "contract.list": Readonly<{ limit?: number; after_id?: string; sort?: 'id_asc'; customer_id?: string; operator_id?: string; plan_id?: string; assigned_user_id?: string; status?: "draft" | "active" | "ended" | "cancelled"; source?: "manual" | "import" | "integration" }>
  "service.list": Readonly<{ limit?: number; after_id?: string; sort?: 'id_asc'; customer_id?: string; contract_id?: string; operator_id?: string; plan_id?: string; kind?: "mobile" | "fiber" | "fixed_voice" | "data_connectivity" | "other"; status?: "pending" | "active" | "suspended" | "ended" | "cancelled"; source?: "manual" | "import" | "integration" }>
  "line.list": Readonly<{ limit?: number; after_id?: string; sort?: 'id_asc'; customer_id?: string; contract_id?: string; service_id?: string; operator_id?: string; status?: "pending" | "active" | "suspended" | "ended" | "cancelled"; source?: "manual" | "import" | "integration" }>
  "renewal.list": Readonly<{ limit?: number; after_id?: string; sort?: 'id_asc'; customer_id?: string; contract_id?: string; owner_user_id?: string; status?: "open" | "completed" | "dismissed" | "not_applicable"; window_from?: string; window_to?: string }>
  "renewal.get": Readonly<{ id: string }>
  "permanence.list": Readonly<{ limit?: number; after_id?: string; sort?: 'id_asc'; customer_id?: string; contract_id?: string; service_id?: string; status?: "open" | "cancelled"; window_from?: string; window_to?: string }>
  "permanence.get": Readonly<{ id: string }>
}
export type TelecomCollectionPageV1<O extends TelecomCollectionOperationV1> = Readonly<{ contract_version: "telecom.collections.v1"; operation: O; items: readonly TelecomCollectionRowsV1[O][]; next_id: string | null }>
export type TelecomCollectionGetV1<O extends TelecomCollectionOperationV1> = Readonly<{ contract_version: "telecom.collections.v1"; operation: O; record: TelecomCollectionRowsV1[O] }>
