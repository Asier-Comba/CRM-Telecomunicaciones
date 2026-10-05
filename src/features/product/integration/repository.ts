import type {SettingsOperationV1,SettingsInputV1,ProductPreferencesV1,CompanyProfileV1} from '@/lib/contracts/settings-v1'
import {parseSettingsInputV1,parseSettingsReceiptV1,parseSettingsReadV1} from '../../../lib/server/settings-runtime-v1.ts'
import type {SensitiveInputV1,SensitiveResultV1} from '@/lib/contracts/sensitive-v1'
import {parseSensitiveInputV1,parseSensitiveResultV1} from '../../../lib/server/sensitive-runtime-v1.ts'
export type SettingsRead={contract_version:'settings.v1'}&({operation:'settings.profile_get';version:number;profile:ProductPreferencesV1}|{operation:'settings.company_get';version:number;profile:CompanyProfileV1}|{operation:'settings.integrations';integrations:{class:'google_calendar'|'auth_mail'|'crm_mail'|'whatsapp'|'n8n'|'ai_provider'|'storage';status:'not_configured'|'configured'|'unavailable'}[]})
export type SettingsReceipt={contract_version:'settings.v1';operation:SettingsOperationV1;command_id:string;version:number}
import type {NotificationOperationV1,NotificationInputV1,NotificationListInputV1} from '@/lib/contracts/notifications-v1'
import {parseNotificationInputV1,parseNotificationReceiptV1,parseNotificationListInputV1,parseNotificationListV1,parseNotificationCountV1} from '../../../lib/server/notifications-runtime-v1.ts'
import type {AutomationOperationV1,AutomationInputV1,AutomationReadInputV1,AutomationDefinitionV1} from '@/lib/contracts/automations-v1'
import {parseAutomationInputV1,parseAutomationReceiptV1,parseAutomationReadInputV1,parseAutomationReadV1} from '../../../lib/server/automations-runtime-v1.ts'
export type NotificationPage=NonNullable<ReturnType<typeof parseNotificationListV1>>
export type NotificationCount={contract_version:'notifications.v1';operation:'notification.unread_count';version:number;unread_count:number}
export type NotificationReceipt={contract_version:'notifications.v1';operation:NotificationOperationV1;command_id:string;version:number;affected:number;has_more:boolean}
export type AutomationRecord=AutomationDefinitionV1&{id:string;version:number;enabled:boolean;created_at:string;updated_at:string}
export type AutomationRun={id:string;automation_id:string;event_id:string;action_id:'notification.create'|'task.create';definition_version:number;status:'succeeded'|'failed'|'skipped';effect_id:string|null;failure_code:string|null;created_at:string}
export type AutomationRead={contract_version:'automations.v1'}&({operation:'automation.list';items:AutomationRecord[];next_id:string|null}|{operation:'automation.get';record:AutomationRecord}|{operation:'automation.run_history';items:AutomationRun[];next_id:string|null})
export type AutomationReceipt={contract_version:'automations.v1';command_id:string}&({operation:'automation.process_pending';processed:number;succeeded:number;failed:number;skipped:number;has_more:boolean}|{operation:Exclude<AutomationOperationV1,'automation.process_pending'>;id:string;version:number;enabled:boolean})
import type {InboxInputV1,InboxOperationV1,InboxReceiptV1,InboxListInputV1,InboxThreadInputV1} from '@/lib/contracts/inbox-v1'
import {parseInboxInputV1,parseInboxReceiptV1,parseInboxListInputV1,parseInboxListResultV1,parseInboxThreadInputV1,parseInboxThreadResultV1,parseInboxUnreadV1} from '../../../lib/server/inbox-runtime-v1.ts'
export type InboxPage=NonNullable<ReturnType<typeof parseInboxListResultV1>>
export type InboxThread=NonNullable<ReturnType<typeof parseInboxThreadResultV1>>
export type InboxUnread=NonNullable<ReturnType<typeof parseInboxUnreadV1>>
import type {ImportJobRecordV1,ImportJobListInputV1,ImportJobCancelInputV1,ImportJobReceiptV1} from '@/lib/contracts/importjob-v1'
import {parseImportJobIdV1,parseImportJobListV1,parseImportJobCancelV1,parseImportJobGetResultV1,parseImportJobListResultV1,parseImportJobReceiptV1} from '../../../lib/server/importjob-runtime-v1.ts'
import type {BillingArtifactInputV1,BillingArtifactReceiptV1,BillingArtifactReferenceV1} from '@/lib/contracts/billing-artifact-v1'
import {parseBillingArtifactInputV1,parseBillingArtifactReceiptV1,parseBillingArtifactReferenceV1} from '../../../lib/contracts/billing-artifact-runtime-v1.ts'
import type {DocumentContentInputsV1,DocumentContentOperationV1,DocumentContentReceiptV1} from '@/lib/contracts/document-content-v1'
import {parseDocumentContentInputV1,parseDocumentContentReceiptV1} from '../../../lib/server/document-content-runtime-v1.ts'
import type {PortfolioInputsV1,PortfolioOperationV1,PortfolioReceiptV1,PortfolioGetV1,PortfolioKindV1} from '@/lib/contracts/portfolio-v1'
import {parsePortfolioInputV1,parsePortfolioReceiptV1,parsePortfolioGetV1} from '../../../lib/server/portfolio-runtime-v1.ts'
import type { ProductCommandInputsV1, ProductOperationV1, ProductReceiptV1, CustomerEditorV1, ContactEditorPageV1, ProductErrorV1 } from '@/lib/contracts/product-v1'
import type { DashboardInputV2, DashboardV2, GlobalSearchV1 } from '@/lib/contracts/product-dashboard-v2'
import { parseProductInputV1, parseProductReceiptV1, parseCustomerEditorV1, parseContactEditorPageV1 } from '../../../lib/server/product-runtime-v1.ts'
import { parseDashboardV2, parseGlobalSearchV1 } from '../../../lib/server/product-dashboard-runtime-v2.ts'
import type { CalendarInputV1, CalendarPageV1, WorkGetV1, StageCatalogV1 } from '@/lib/contracts/product-queries-v1'
import { parseCalendarPageV1, parseWorkGetV1, parseStageCatalogV1 } from '../../../lib/server/product-query-runtime-v1.ts'
import type { TeamInputsV1, TeamOperationV1, TeamReceiptV1, TeamListV1, TeamListInputV1, TeamInviteListV1 } from '@/lib/contracts/team-v1'
import type {ProvenanceInputV1,ProvenanceResultV1} from '@/lib/contracts/provenance-v1'
import {parseProvenanceInputV1,parseProvenanceResultV1} from '../../../lib/server/provenance-runtime-v1.ts'
import type { DocumentInputsV1, DocumentOperationV1, DocumentReceiptV1, DocumentListInputV1, DocumentListV1, DocumentGetV1 } from '@/lib/contracts/document-v1'
import { parseTeamInputV1, parseTeamReceiptV1, parseTeamListV1, parseTeamInviteListV1 } from '../../../lib/server/team-runtime-v1.ts'
import { parseDocumentInputV1, parseDocumentReceiptV1, parseDocumentListV1, parseDocumentGetV1 } from '../../../lib/server/document-runtime-v1.ts'
import type { BillingInputsV1, BillingOperationV1, BillingReceiptV1, BillingQueriesV1, BillingQueryV1, BillingReadDataV1 } from '@/lib/contracts/billing-v1'
import { parseBillingInputV1, parseBillingReceiptV1 } from '../../../lib/server/billing-runtime-v1.ts'
import { parseBillingQueryV1, parseBillingReadV1 } from '../../../lib/server/billing-query-runtime-v1.ts'

export type ImportJobPage = {contract_version:'importjob.v1';operation:'importjob.list';items:ImportJobRecordV1[];next_id:string|null}
export type UiError = ProductErrorV1 | 'transport_uncertain'
export class ProductUiError extends Error {
  readonly code: UiError
  constructor(code: UiError) { super(code); this.code = code }
}
export const errorText: Record<UiError, string> = {
  validation: 'Revisa los datos introducidos.', access_denied: 'No tienes permiso para esta acción.',
  not_found: 'El registro ya no está disponible.', conflict: 'El registro ha cambiado desde que lo abriste.',
  unavailable: 'Esta función no está disponible ahora.', internal_safe: 'No se pudo completar la acción.',
  transport_uncertain: 'No se pudo confirmar el resultado. Reintenta la misma acción para comprobarlo.',
}
export function safeMessage(error: unknown) {
  return errorText[error instanceof ProductUiError ? error.code : 'internal_safe']
}
export interface ProductRepository {
  settings<O extends SettingsRead['operation']>(operation:O):Promise<Extract<SettingsRead,{operation:O}>>
  settingsCommand(operation:SettingsOperationV1,input:SettingsInputV1):Promise<SettingsReceipt>
  sensitive(input:SensitiveInputV1):Promise<SensitiveResultV1>
  notifications(input:NotificationListInputV1):Promise<NotificationPage>
  notificationCount():Promise<NotificationCount>
  notificationCommand(operation:NotificationOperationV1,input:NotificationInputV1):Promise<NotificationReceipt>
  automation<O extends AutomationRead['operation']>(operation:O,input:AutomationReadInputV1):Promise<Extract<AutomationRead,{operation:O}>>
  automationCommand(operation:AutomationOperationV1,input:AutomationInputV1):Promise<AutomationReceipt>
  inbox(input:InboxListInputV1):Promise<InboxPage>
  inboxThread(input:InboxThreadInputV1):Promise<InboxThread>
  inboxUnread():Promise<InboxUnread>
  inboxCommand(operation:InboxOperationV1,input:InboxInputV1):Promise<InboxReceiptV1>
  readonly mode: 'synthetic' | 'integrated_local'
  command<O extends ProductOperationV1>(operation: O, input: ProductCommandInputsV1[O]): Promise<ProductReceiptV1>
  customer(id: string): Promise<CustomerEditorV1>
  contacts(customerId: string, after?: string | null): Promise<ContactEditorPageV1>
  dashboard(input: DashboardInputV2): Promise<DashboardV2>
  search(query: string): Promise<GlobalSearchV1>
  calendar(input: CalendarInputV1): Promise<CalendarPageV1>
  work(kind: 'task'|'meeting'|'opportunity', id: string): Promise<WorkGetV1>
  stages():Promise<StageCatalogV1>
  portfolio(kind:PortfolioKindV1,id:string):Promise<PortfolioGetV1>
  portfolioCommand<O extends PortfolioOperationV1>(operation:O,input:PortfolioInputsV1[O]):Promise<PortfolioReceiptV1>
  team(input?:TeamListInputV1): Promise<TeamListV1>
  teamInvites(input:TeamListInputV1):Promise<TeamInviteListV1>
  provenance(input:ProvenanceInputV1):Promise<ProvenanceResultV1>
  teamCommand<O extends TeamOperationV1>(operation: O, input: TeamInputsV1[O]): Promise<TeamReceiptV1>
  documents(input: DocumentListInputV1): Promise<DocumentListV1>
  document(id: string): Promise<DocumentGetV1>
  documentCommand<O extends DocumentOperationV1>(operation: O, input: DocumentInputsV1[O]): Promise<DocumentReceiptV1>
  billing<Q extends BillingQueryV1>(operation: Q,input:BillingQueriesV1[Q]):Promise<Extract<BillingReadDataV1,{operation:Q}>>
  billingCommand<O extends BillingOperationV1>(operation:O,input:BillingInputsV1[O]):Promise<BillingReceiptV1>
  importJobs(input:ImportJobListInputV1):Promise<ImportJobPage>
  importJob(id:string):Promise<ImportJobRecordV1>
  cancelImportJob(input:ImportJobCancelInputV1):Promise<ImportJobReceiptV1>
  invoicePdf(id:string):Promise<Blob>
  privateInvoiceReference(id:string):Promise<BillingArtifactReferenceV1>
  persistPrivateInvoice(input:BillingArtifactInputV1):Promise<BillingArtifactReceiptV1>
  privateInvoicePdf(id:string):Promise<Blob>
  contentCommand<O extends DocumentContentOperationV1>(operation:O,input:DocumentContentInputsV1[O]):Promise<DocumentContentReceiptV1>
  uploadDocument(id:string,file:File):Promise<void>
  downloadDocument(id:string,ticketId:string):Promise<Blob>
}
const errors: readonly string[] = ['validation','access_denied','not_found','conflict','unavailable','internal_safe']
function object(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}
async function attachmentFailure(response:Response):Promise<never>{
 let value:unknown;try{value=await response.json()}catch{}
 if(object(value)&&value.ok===false&&Object.keys(value).sort().join(',')==='error,ok'&&errors.includes(value.error as string))throw new ProductUiError(value.error as ProductErrorV1)
 throw new ProductUiError(response.status===403?'access_denied':response.status===404?'not_found':response.status===503?'unavailable':'internal_safe')
}
/** All consumers validate the closed W1 success envelope and operation-specific DTO. */
export class IntegratedLocalProductRepository implements ProductRepository {
  readonly mode = 'integrated_local' as const
  private readonly request: typeof fetch
  constructor(request: typeof fetch = fetch) { this.request = request.bind(globalThis) }
  settings<O extends SettingsRead['operation']>(operation:O){return this.post('queries',operation,{},v=>parseSettingsReadV1(operation,v) as Extract<SettingsRead,{operation:O}>|null,'settings','/api/settings/v1')}
  settingsCommand(operation:SettingsOperationV1,value:SettingsInputV1){const input=parseSettingsInputV1(operation,value);if(!input)return Promise.reject(new ProductUiError('validation'));return this.post('commands',operation,input,v=>parseSettingsReceiptV1(operation,input,v) as SettingsReceipt|null,'settings','/api/settings/v1')}
  sensitive(value:SensitiveInputV1){const input=parseSensitiveInputV1(value);if(!input)return Promise.reject(new ProductUiError('validation'));return this.post('queries','sensitive.get',input,v=>parseSensitiveResultV1(input,v),'sensitive','/api/sensitive/v1')}
  notifications(value:NotificationListInputV1){const input=parseNotificationListInputV1(value);if(!input)return Promise.reject(new ProductUiError('validation'));return this.post('queries','notification.list',input,v=>parseNotificationListV1(input,v),'notifications','/api/notifications/v1')}
  notificationCount(){return this.post('queries','notification.unread_count',{},v=>parseNotificationCountV1(v) as NotificationCount|null,'notifications','/api/notifications/v1')}
  notificationCommand(operation:NotificationOperationV1,value:NotificationInputV1){const input=parseNotificationInputV1(operation,value);if(!input)return Promise.reject(new ProductUiError('validation'));return this.post('commands',operation,input,v=>parseNotificationReceiptV1(operation,input,v) as NotificationReceipt|null,'notifications','/api/notifications/v1')}
  automation<O extends AutomationRead['operation']>(operation:O,value:AutomationReadInputV1){const input=parseAutomationReadInputV1(operation,value);if(!input)return Promise.reject(new ProductUiError('validation'));return this.post('queries',operation,input,v=>parseAutomationReadV1(operation,input,v) as Extract<AutomationRead,{operation:O}>|null,'automations','/api/automations/v1')}
  automationCommand(operation:AutomationOperationV1,value:AutomationInputV1){const input=parseAutomationInputV1(operation,value);if(!input)return Promise.reject(new ProductUiError('validation'));return this.post('commands',operation,input,v=>parseAutomationReceiptV1(operation,input,v) as AutomationReceipt|null,'automations','/api/automations/v1')}
  inbox(value:InboxListInputV1){const input=parseInboxListInputV1(value);if(!input)return Promise.reject(new ProductUiError('validation'));return this.post('queries','inbox.list',input,v=>parseInboxListResultV1(input,v),'inbox','/api/inbox/v1')}
  inboxThread(value:InboxThreadInputV1){const input=parseInboxThreadInputV1(value);if(!input)return Promise.reject(new ProductUiError('validation'));return this.post('queries','inbox.get_thread',input,v=>parseInboxThreadResultV1(input,v),'inbox','/api/inbox/v1')}
  inboxUnread(){return this.post('queries','inbox.unread_summary',{},parseInboxUnreadV1,'inbox','/api/inbox/v1')}
  inboxCommand(operation:InboxOperationV1,value:InboxInputV1){const input=parseInboxInputV1(operation,value);if(!input)return Promise.reject(new ProductUiError('validation'));return this.post('commands',operation,input,v=>parseInboxReceiptV1(operation,input,v),'inbox','/api/inbox/v1')}
  private async post<T>(kind: 'commands' | 'queries', operation: string, input: unknown, parse: (value: unknown) => T | null, family = 'product', endpoint?: string): Promise<T> {
    let response: Response
    try {
      response = await this.request(endpoint ?? `/api/${family==='document-content'?'document/v1/content':family+'/v1'}/${kind}`, {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation, input }),
        signal: AbortSignal.timeout(15000),
      })
    } catch { throw new ProductUiError('transport_uncertain') }
    let value: unknown
    try { value = await response.json() } catch { throw new ProductUiError('internal_safe') }
    if (!object(value)) throw new ProductUiError('internal_safe')
    if (value.ok === false && Object.keys(value).sort().join(',') === 'error,ok' && errors.includes(value.error as string)) {
      throw new ProductUiError(value.error as ProductErrorV1)
    }
    const field = kind === 'commands' ? 'receipt' : 'data'
    if (!response.ok || value.ok !== true || Object.keys(value).sort().join(',') !== [field,'ok'].sort().join(',')) throw new ProductUiError('internal_safe')
    const parsed = parse(value[field])
    if (parsed === null) throw new ProductUiError('internal_safe')
    return parsed
  }
  command<O extends ProductOperationV1>(operation: O, value: ProductCommandInputsV1[O]) {
    const input = parseProductInputV1(operation, value)
    if (!input) return Promise.reject(new ProductUiError('validation'))
    return this.post('commands', operation, input, data => parseProductReceiptV1(operation, input, data))
  }
  customer(id: string) { return this.post('queries','customer.editor',{ id },v => parseCustomerEditorV1(id,v)) }
  contacts(customerId: string, after: string | null = null) {
    return this.post('queries','contact.editors',{ customer_id: customerId, limit: 20, after_id: after },v => parseContactEditorPageV1(customerId,20,after,v))
  }
  dashboard(input: DashboardInputV2) { return this.post('queries','dashboard.get',input,v => parseDashboardV2(input,v)) }
  search(query: string) { const input = { query: query.trim(), limit: 50 }; return this.post('queries','global.search',input,v => parseGlobalSearchV1(input,v)) }
  calendar(input: CalendarInputV1) { return this.post('queries','calendar.list',input,v=>parseCalendarPageV1(input,v)) }
  work(kind: 'task'|'meeting'|'opportunity', id: string) { return this.post('queries','work.get',{kind,id},v=>parseWorkGetV1(kind,id,v)) }
  portfolio(kind:PortfolioKindV1,id:string){const input={kind,id};return this.post('queries','portfolio.get',input,v=>parsePortfolioGetV1(input,v),'portfolio')}
  portfolioCommand<O extends PortfolioOperationV1>(operation:O,value:PortfolioInputsV1[O]){const input=parsePortfolioInputV1(operation,value);if(!input)return Promise.reject(new ProductUiError('validation'));return this.post('commands',operation,input,v=>parsePortfolioReceiptV1(operation,input,v),'portfolio')}
  stages(){const input={limit:100};return this.post('queries','opportunity.stages',input,v=>parseStageCatalogV1(100,null,v))}
  teamInvites(input:TeamListInputV1){return this.post('queries','member.invite_list',input,v=>parseTeamInviteListV1(input,v),'team')}
  provenance(value:ProvenanceInputV1){const input=parseProvenanceInputV1(value);if(!input)return Promise.reject(new ProductUiError('validation'));return this.post('queries','provenance.get',input,v=>parseProvenanceResultV1(input,v),'provenance','/api/provenance/v1')}
  team(input:TeamListInputV1={limit:100}) {return this.post('queries','member.list',input,v=>parseTeamListV1(input,v),'team') }
  teamCommand<O extends TeamOperationV1>(operation: O, value: TeamInputsV1[O]) {
    const input=parseTeamInputV1(operation,value);if(!input)return Promise.reject(new ProductUiError('validation'))
    return this.post('commands',operation,input,v=>parseTeamReceiptV1(operation,input,v),'team')
  }
  documents(input: DocumentListInputV1) { return this.post('queries','document.list',input,v=>parseDocumentListV1(input,v),'document') }
  document(id:string) { return this.post('queries','document.get_metadata',{id},v=>parseDocumentGetV1(id,v),'document') }
  documentCommand<O extends DocumentOperationV1>(operation: O,value:DocumentInputsV1[O]) {
    const input=parseDocumentInputV1(operation,value);if(!input)return Promise.reject(new ProductUiError('validation'))
    return this.post('commands',operation,input,v=>parseDocumentReceiptV1(operation,input,v),'document')
  }
  billing<Q extends BillingQueryV1>(operation:Q,value:BillingQueriesV1[Q]) {
    const input=parseBillingQueryV1(operation,value);if(!input)return Promise.reject(new ProductUiError('validation'))
    return this.post('queries',operation,input,v=>parseBillingReadV1(operation,input,v) as Extract<BillingReadDataV1,{operation:Q}>|null,'billing')
  }
  billingCommand<O extends BillingOperationV1>(operation:O,value:BillingInputsV1[O]) {
    const input=parseBillingInputV1(operation,value);if(!input)return Promise.reject(new ProductUiError('validation'))
    return this.post('commands',operation,input,v=>parseBillingReceiptV1(operation,input,v),'billing')
  }
  contentCommand<O extends DocumentContentOperationV1>(operation:O,value:DocumentContentInputsV1[O]){const input=parseDocumentContentInputV1(operation,value);if(!input)return Promise.reject(new ProductUiError('validation'));return this.post('commands',operation,input,v=>parseDocumentContentReceiptV1(operation,input,v),'document-content')}
  async uploadDocument(id:string,file:File){
    if(!/^[0-9a-f-]{36}$/.test(id)||file.size<1||file.size>10485760||!['application/pdf','image/png','image/jpeg'].includes(file.type))throw new ProductUiError('validation')
    let response:Response;try{response=await this.request(`/api/document/v1/content/upload?id=${id}`,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':file.type},body:file,signal:AbortSignal.timeout(60000)})}catch{throw new ProductUiError('transport_uncertain')}
    let value:unknown;try{value=await response.json()}catch{throw new ProductUiError('internal_safe')}
    if(object(value)&&value.ok===false&&Object.keys(value).sort().join(',')==='error,ok'&&errors.includes(value.error as string))throw new ProductUiError(value.error as ProductErrorV1)
    if(!response.ok||!object(value)||Object.keys(value).sort().join(',')!=='data,ok'||value.ok!==true||!object(value.data)||Object.keys(value.data).sort().join(',')!=='finalized,id,uploaded'||value.data.id!==id||value.data.uploaded!==true||value.data.finalized!==false)throw new ProductUiError('internal_safe')
  }
  async downloadDocument(id:string,ticketId:string){
    let response:Response;try{response=await this.request('/api/document/v1/content/download',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'document.download',input:{id,ticket_id:ticketId}}),signal:AbortSignal.timeout(60000)})}catch{throw new ProductUiError('transport_uncertain')}
    if(!response.ok)return attachmentFailure(response)
    if(!['application/pdf','image/png','image/jpeg'].includes(response.headers.get('content-type')??''))throw new ProductUiError('internal_safe')
    const blob=await response.blob();if(blob.size<1||blob.size>10485760)throw new ProductUiError('internal_safe');return blob
  }
  importJobs(value:ImportJobListInputV1){const input=parseImportJobListV1(value);if(!input)return Promise.reject(new ProductUiError('validation'));return this.post('queries','importjob.list',input,v=>parseImportJobListResultV1(input,v),'import','/api/import/v1')}
  async importJob(id:string){const input=parseImportJobIdV1({id});if(!input)throw new ProductUiError('validation');return(await this.post('queries','importjob.get',input,v=>parseImportJobGetResultV1(input.id,v),'import','/api/import/v1')).record}
  cancelImportJob(value:ImportJobCancelInputV1){const input=parseImportJobCancelV1(value);if(!input)return Promise.reject(new ProductUiError('validation'));return this.post('commands','importjob.cancel',input,v=>parseImportJobReceiptV1(input,v),'import','/api/import/v1')}
  privateInvoiceReference(id:string){return this.post('queries','invoice.private_pdf_reference',{id},v=>parseBillingArtifactReferenceV1(id,v),'billing','/api/billing/v1/private-pdf')}
  persistPrivateInvoice(value:BillingArtifactInputV1){const input=parseBillingArtifactInputV1(value);if(!input)return Promise.reject(new ProductUiError('validation'));return this.post('commands','invoice.persist_private_pdf',input,v=>parseBillingArtifactReceiptV1(input,v),'billing','/api/billing/v1/private-pdf')}
  privateInvoicePdf(id:string){return this.pdfDownload(id,true)}
  invoicePdf(id:string){return this.pdfDownload(id,false)}
  private async pdfDownload(id:string,frozen:boolean){
    let response:Response
    try{response=await this.request(frozen?'/api/billing/v1/private-pdf':'/api/billing/v1/pdf',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:frozen?'invoice.private_pdf':'invoice.pdf',input:{id}}),signal:AbortSignal.timeout(15000)})}catch{throw new ProductUiError('transport_uncertain')}
    if(!response.ok)return attachmentFailure(response)
    if(!/^application\/pdf(?:;|$)/i.test(response.headers.get('content-type')??''))throw new ProductUiError('internal_safe')
    const blob=await response.blob();if(blob.size>2000000 || blob.size<5 || await blob.slice(0,5).text()!=='%PDF-')throw new ProductUiError('internal_safe')
    return blob
  }
}
/** Preview never impersonates a successful persistent write. */
export class SyntheticProductRepository implements ProductRepository {
  readonly mode = 'synthetic' as const
  private unavailable<T>(): Promise<T> { return Promise.reject(new ProductUiError('unavailable')) }
  settings<O extends SettingsRead['operation']>(_operation:O){void _operation;return this.unavailable<Extract<SettingsRead,{operation:O}>>()}
  settingsCommand(_operation:SettingsOperationV1,_input:SettingsInputV1){void _operation;void _input;return this.unavailable<SettingsReceipt>()}
  sensitive(_input:SensitiveInputV1){void _input;return this.unavailable<SensitiveResultV1>()}
  notifications(_input:NotificationListInputV1){void _input;return this.unavailable<NotificationPage>()}
  notificationCount(){return this.unavailable<NotificationCount>()}
  notificationCommand(_operation:NotificationOperationV1,_input:NotificationInputV1){void _operation;void _input;return this.unavailable<NotificationReceipt>()}
  automation<O extends AutomationRead['operation']>(_operation:O,_input:AutomationReadInputV1){void _operation;void _input;return this.unavailable<Extract<AutomationRead,{operation:O}>>()}
  automationCommand(_operation:AutomationOperationV1,_input:AutomationInputV1){void _operation;void _input;return this.unavailable<AutomationReceipt>()}
  inbox(_input:InboxListInputV1){void _input;return this.unavailable<InboxPage>()}
  inboxThread(_input:InboxThreadInputV1){void _input;return this.unavailable<InboxThread>()}
  inboxUnread(){return this.unavailable<InboxUnread>()}
  inboxCommand(_operation:InboxOperationV1,_input:InboxInputV1){void _operation;void _input;return this.unavailable<InboxReceiptV1>()}
  command<O extends ProductOperationV1>(_operation: O, _input: ProductCommandInputsV1[O]) { void _operation; void _input; return this.unavailable<ProductReceiptV1>() }
  customer(_id: string) { void _id; return this.unavailable<CustomerEditorV1>() }
  contacts(_id: string) { void _id; return this.unavailable<ContactEditorPageV1>() }
  dashboard(_input: DashboardInputV2) { void _input; return this.unavailable<DashboardV2>() }
  search(_query: string) { void _query; return this.unavailable<GlobalSearchV1>() }
  calendar(_input: CalendarInputV1) { void _input; return this.unavailable<CalendarPageV1>() }
  work(_kind: 'task'|'meeting'|'opportunity', _id: string) { void _kind; void _id; return this.unavailable<WorkGetV1>() }
  stages(){return this.unavailable<StageCatalogV1>()}
  portfolio(_kind:PortfolioKindV1,_id:string){void _kind;void _id;return this.unavailable<PortfolioGetV1>()}
  portfolioCommand<O extends PortfolioOperationV1>(_operation:O,_input:PortfolioInputsV1[O]){void _operation;void _input;return this.unavailable<PortfolioReceiptV1>()}
  teamInvites(_input:TeamListInputV1){void _input;return this.unavailable<TeamInviteListV1>()}
  provenance(_input:ProvenanceInputV1){void _input;return this.unavailable<ProvenanceResultV1>()}
  team(_input?:TeamListInputV1) {void _input;return this.unavailable<TeamListV1>() }
  teamCommand<O extends TeamOperationV1>(_operation: O,_input:TeamInputsV1[O]) {void _operation;void _input;return this.unavailable<TeamReceiptV1>()}
  documents(_input:DocumentListInputV1) {void _input;return this.unavailable<DocumentListV1>()}
  document(_id:string) {void _id;return this.unavailable<DocumentGetV1>()}
  documentCommand<O extends DocumentOperationV1>(_operation:O,_input:DocumentInputsV1[O]) {void _operation;void _input;return this.unavailable<DocumentReceiptV1>()}
  billing<Q extends BillingQueryV1>(_operation:Q,_input:BillingQueriesV1[Q]){void _operation;void _input;return this.unavailable<Extract<BillingReadDataV1,{operation:Q}>>()}
  billingCommand<O extends BillingOperationV1>(_operation:O,_input:BillingInputsV1[O]){void _operation;void _input;return this.unavailable<BillingReceiptV1>()}
  contentCommand<O extends DocumentContentOperationV1>(_operation:O,_input:DocumentContentInputsV1[O]){void _operation;void _input;return this.unavailable<DocumentContentReceiptV1>()}
  uploadDocument(_id:string,_file:File){void _id;void _file;return this.unavailable<void>()}
  downloadDocument(_id:string,_ticketId:string){void _id;void _ticketId;return this.unavailable<Blob>()}
  importJobs(_input:ImportJobListInputV1){void _input;return this.unavailable<ImportJobPage>()}
  importJob(_id:string){void _id;return this.unavailable<ImportJobRecordV1>()}
  cancelImportJob(_input:ImportJobCancelInputV1){void _input;return this.unavailable<ImportJobReceiptV1>()}
  privateInvoiceReference(_id:string){void _id;return this.unavailable<BillingArtifactReferenceV1>()}
  persistPrivateInvoice(_input:BillingArtifactInputV1){void _input;return this.unavailable<BillingArtifactReceiptV1>()}
  privateInvoicePdf(_id:string){void _id;return this.unavailable<Blob>()}
  invoicePdf(_id:string){void _id;return this.unavailable<Blob>()}
}
/** Keep in the mounted action/editor only. Never persist this object or contact PII. */
export function commandIntent<O extends ProductOperationV1>(operation: O, fields: Omit<ProductCommandInputsV1[O], 'command_id'>) {
  const input = Object.freeze({ ...fields, command_id: crypto.randomUUID() }) as ProductCommandInputsV1[O]
  return { input, execute: (repository: ProductRepository) => repository.command(operation, input) }
}
