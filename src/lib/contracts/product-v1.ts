/** Normal, human-driven application commands; not assistant capabilities. */
export const PRODUCT_VERSION_V1 = 'product.v1' as const
export type CustomerFieldsV1 = {
  account_kind: 'legal_entity' | 'sole_trader'
  legal_name: string
  trade_name?: string | null
  lifecycle?: 'lead' | 'prospect' | 'customer' | 'former_customer'
  assigned_user_id?: string | null
}
export type ContactFieldsV1 = {
  display_name: string
  job_title?: string | null
  email?: string | null
  phone?: string | null
  is_primary?: boolean
}
export type VersionedCommandV1 = { command_id: string; id: string; expected_version: number }
export type ProductCommandInputsV1 = {
  'customer.create': { command_id: string } & CustomerFieldsV1
  'customer.update': VersionedCommandV1 & Partial<CustomerFieldsV1>
  'customer.archive': VersionedCommandV1
  'customer.restore': VersionedCommandV1
  'contact.create': { command_id: string; customer_id: string } & ContactFieldsV1
  'contact.update': VersionedCommandV1 & Partial<ContactFieldsV1>
  'contact.archive': VersionedCommandV1
  'contact.restore': VersionedCommandV1
}
export type ProductOperationV1 = keyof ProductCommandInputsV1
export type ProductReceiptV1 = Readonly<{
  contract_version: 'product.v1'
  command_id: string
  operation: ProductOperationV1
  id: string
  version: number
  status: 'active' | 'inactive' | 'archived'
}>
export type ProductErrorV1 = 'validation' | 'access_denied' | 'not_found' | 'conflict' | 'unavailable' | 'internal_safe'
export type ProductResultV1 = { ok: true; receipt: ProductReceiptV1 } | { ok: false; error: ProductErrorV1 }
export type CustomerEditorV1 = Readonly<{
  contract_version: 'product.v1'; id: string; version: number
  account_kind: CustomerFieldsV1['account_kind']; legal_name: string; trade_name: string | null
  lifecycle: NonNullable<CustomerFieldsV1['lifecycle']>; status: ProductReceiptV1['status']
  source: 'manual' | 'import' | 'integration'; assigned_user_id: string | null
}>
export type ContactEditorV1 = Readonly<{
  id: string; version: number; display_name: string; job_title: string | null
  email: string | null; phone: string | null; is_primary: boolean; status: ProductReceiptV1['status']
}>
export type ContactEditorPageV1 = Readonly<{
  contract_version: 'product.v1'; customer_id: string; items: readonly ContactEditorV1[]; next_id: string | null
}>
