/** Presentation boundary only; grants no authority and contains no contact/fiscal PII. */
export type AiEntityReference = Readonly<{kind:'customer'|'contract'|'service'|'line'|'opportunity'|'invoice';id:string}>
export type AiSource = Readonly<{id:string;label:string;asOf:string|null;coverage:'complete'|'partial'|'unavailable'}>
export type AiUiBlock =
  | {kind:'text';text:string}
  | {kind:'table';columns:readonly string[];rows:readonly (readonly (string|number|null)[])[]}
  | {kind:'metric';label:string;value:number|null;unit:string;sourceIds:readonly string[]}
  | {kind:'entity';reference:AiEntityReference;label:string;sourceIds:readonly string[]}
  | {kind:'partiality';text:string;sourceIds:readonly string[]}
  | {kind:'navigation';reference:AiEntityReference;label:string}
  | {kind:'proposed_action';proposalId:string;operation:string;summary:string;requiresConfirmation:true;executed:false;expiresAt:string}
export type AiUiEvent =
  | {kind:'message_start';threadId:string;messageId:string}
  | {kind:'block';messageId:string;block:AiUiBlock}
  | {kind:'sources';messageId:string;sources:readonly AiSource[]}
  | {kind:'progress';messageId:string;state:'reading'|'reviewing'|'awaiting_confirmation'|'executing'}
  | {kind:'result';messageId:string;state:'completed'|'partial'|'unavailable'|'denied'|'cancelled';receiptId?:string}
  | {kind:'error';messageId:string;code:'validation'|'access_denied'|'conflict'|'unavailable'|'internal_safe';retryable:boolean}
export type AiUiRequest = {threadId:string;messageId:string;text:string;selectedContext:readonly AiEntityReference[];requestId:string}
export function validAiEntityReference(value: unknown): value is AiEntityReference {
  if(!value || typeof value!=='object'||Array.isArray(value))return false
  const v=value as Record<string,unknown>
  return Object.keys(v).sort().join(',')==='id,kind' && ['customer','contract','service','line','opportunity','invoice'].includes(v.kind as string) && typeof v.id==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.id)
}
