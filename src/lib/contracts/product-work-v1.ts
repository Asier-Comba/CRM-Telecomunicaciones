import type { VersionedCommandV1 } from './product-v1'
export type TaskFieldsV1 = { title: string; due_at?: string | null; priority?: 'low' | 'normal' | 'high' | null; assigned_user_id?: string | null }
export type MeetingFieldsV1 = { title: string; starts_at: string; ends_at?: string | null; timezone: string; all_day?: boolean; channel?: 'in_person' | 'phone' | 'video' | 'other'; assigned_user_id?: string | null }
export type OpportunityFieldsV1 = { title: string; owner_user_id?: string | null; amount_minor?: number | null; currency?: 'EUR' | 'USD' | 'GBP' | null; next_follow_up_at?: string | null; expected_close_date?: string | null; next_action?: string | null; contract_id?: string | null; service_id?: string | null; plan_id?: string | null }
type NewCommand = { command_id: string; customer_id?: string | null; opportunity_id?: string | null }
export type ProductWorkInputsV1 = {
 'task.create': NewCommand & TaskFieldsV1
 'task.update': VersionedCommandV1 & Partial<TaskFieldsV1>
 'task.start': VersionedCommandV1; 'task.complete': VersionedCommandV1; 'task.reopen': VersionedCommandV1; 'task.cancel': VersionedCommandV1
 'meeting.create': NewCommand & MeetingFieldsV1
 'meeting.update': VersionedCommandV1 & Partial<MeetingFieldsV1>
 'meeting.reschedule': VersionedCommandV1 & { starts_at: string; ends_at: string; timezone?: string; all_day?: boolean }
 'meeting.complete': VersionedCommandV1; 'meeting.cancel': VersionedCommandV1; 'meeting.no_show': VersionedCommandV1
 'opportunity.create': { command_id: string; customer_id: string; stage_id: string } & OpportunityFieldsV1
 'opportunity.update': VersionedCommandV1 & Partial<OpportunityFieldsV1>
 'opportunity.assign': VersionedCommandV1 & { owner_user_id: string }
 'opportunity.change_stage': VersionedCommandV1 & { stage_id: string }
 'opportunity.win': VersionedCommandV1 & { stage_id: string }
 'opportunity.lose': VersionedCommandV1 & { stage_id: string; close_reason_code: string }
 'opportunity.reopen': VersionedCommandV1 & { stage_id: string }
 'opportunity.archive': VersionedCommandV1
}
export type WorkStatusV1 = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'scheduled' | 'no_show' | 'open' | 'won' | 'lost'
