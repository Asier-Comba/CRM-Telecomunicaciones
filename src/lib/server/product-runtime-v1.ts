import type { ProductCommandInputsV1, ProductOperationV1, ProductReceiptV1 } from '../contracts/product-v1'
import { WORK_RPC_V1, isWorkOperationV1, parseWorkInputV1, validWorkReceiptStatusV1 } from './product-work-runtime-v1.ts'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CUSTOMER = ['account_kind', 'legal_name', 'trade_name', 'lifecycle', 'assigned_user_id']
const CONTACT = ['display_name', 'job_title', 'email', 'phone', 'is_primary']
export const PRODUCT_RPC_V1 = {
  ...WORK_RPC_V1,
  'customer.create': 'product_v1_customer_create', 'customer.update': 'product_v1_customer_update',
  'customer.archive': 'product_v1_customer_archive', 'customer.restore': 'product_v1_customer_restore',
  'contact.create': 'product_v1_contact_create', 'contact.update': 'product_v1_contact_update',
  'contact.archive': 'product_v1_contact_archive', 'contact.restore': 'product_v1_contact_restore',
} as const
export function isProductOperationV1(value: unknown): value is ProductOperationV1 {
  return typeof value === 'string' && Object.hasOwn(PRODUCT_RPC_V1, value)
}
function plain(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  if (proto !== Object.prototype && proto !== null) return false
  return Reflect.ownKeys(value).every(k => typeof k === 'string'
    && Object.getOwnPropertyDescriptor(value, k)?.enumerable === true
    && Object.getOwnPropertyDescriptor(value, k)?.get === undefined
    && Object.getOwnPropertyDescriptor(value, k)?.set === undefined)
}
function uuid(value: unknown): value is string { return typeof value === 'string' && UUID.test(value) }
function text(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\u0000-\u001f\u007f-\u009f]/.test(value)
}
function field(key: string, value: unknown): boolean {
  if (value === null) return ['trade_name', 'assigned_user_id', 'job_title', 'email', 'phone'].includes(key)
  if (['command_id', 'id', 'customer_id', 'assigned_user_id'].includes(key)) return uuid(value)
  if (key === 'expected_version') return Number.isSafeInteger(value) && (value as number) > 0 && (value as number) < 1e15
  if (key === 'is_primary') return typeof value === 'boolean'
  if (key === 'account_kind') return value === 'legal_entity' || value === 'sole_trader'
  if (key === 'lifecycle') return ['lead', 'prospect', 'customer', 'former_customer'].includes(value as string)
  const max = key === 'email' ? 320 : key === 'phone' ? 40 : ['display_name', 'job_title'].includes(key) ? 160 : 200
  return text(value, max) && (key !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    && (key !== 'phone' || value.length >= 3)
}
export function parseProductInputV1<O extends ProductOperationV1>(operation: O, value: unknown): ProductCommandInputsV1[O] | null {
  try {
    if (isWorkOperationV1(operation)) return parseWorkInputV1(operation, value) as ProductCommandInputsV1[O] | null
    if (!isProductOperationV1(operation) || !plain(value)) return null
    const [entity, action] = operation.split('.')
    const fields = entity === 'customer' ? CUSTOMER : CONTACT
    const required = ['command_id', ...(action === 'create'
      ? entity === 'customer' ? ['account_kind', 'legal_name'] : ['customer_id', 'display_name']
      : ['id', 'expected_version'])]
    const allowed = new Set([...required, ...(['create', 'update'].includes(action) ? fields : [])])
    if (required.some(k => !Object.hasOwn(value, k) || value[k] === null)
      || Object.keys(value).some(k => !allowed.has(k) || !field(k, value[k]))
      || new TextEncoder().encode(JSON.stringify(value)).length > 8192) return null
    // Read from own data descriptors only; give repositories a fresh closed object.
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([k, v]) => [k, ['command_id', 'id', 'customer_id', 'assigned_user_id'].includes(k) && typeof v === 'string' ? v.toLowerCase() : v]))) as ProductCommandInputsV1[O]
  } catch { return null }
}
export function parseProductReceiptV1(operation: ProductOperationV1, input: ProductCommandInputsV1[ProductOperationV1], value: unknown): ProductReceiptV1 | null {
  try {
    if (!plain(value) || Object.keys(value).sort().join(',') !== 'command_id,contract_version,id,operation,status,version'
      || value.contract_version !== 'product.v1' || value.operation !== operation
      || value.command_id !== input.command_id || !uuid(value.id)
      || !Number.isSafeInteger(value.version) || (value.version as number) < 1
      || (isWorkOperationV1(operation) ? !validWorkReceiptStatusV1(operation,value.status) : (
        !['active', 'inactive', 'archived'].includes(value.status as string)
        || (operation.endsWith('.archive') && value.status !== 'archived')
        || (operation.endsWith('.restore') && value.status !== 'active')
        || (operation.endsWith('.create') && value.status !== 'active')))
      || (operation.endsWith('.create') && value.version !== 1)
      || ('id' in input && (value.id !== input.id || value.version !== input.expected_version + 1))) return null
    return Object.freeze({ ...value }) as ProductReceiptV1
  } catch { return null }
}
export function parseCustomerEditorV1(id: string, value: unknown): import('../contracts/product-v1').CustomerEditorV1 | null {
  try {
    if (!plain(value) || Object.keys(value).sort().join(',') !== 'account_kind,assigned_user_id,contract_version,id,legal_name,lifecycle,source,status,trade_name,version'
      || value.contract_version !== 'product.v1' || value.id !== id || !uuid(value.id)
      || !field('expected_version', value.version) || !field('account_kind', value.account_kind)
      || !field('legal_name', value.legal_name) || !field('trade_name', value.trade_name)
      || !field('lifecycle', value.lifecycle) || !field('assigned_user_id', value.assigned_user_id)
      || !['active', 'inactive', 'archived'].includes(value.status as string)
      || !['manual', 'import', 'integration'].includes(value.source as string)) return null
    return Object.freeze({ ...value }) as import('../contracts/product-v1').CustomerEditorV1
  } catch { return null }
}
export function parseContactEditorPageV1(customerId: string, limit: number, after: string | null, value: unknown): import('../contracts/product-v1').ContactEditorPageV1 | null {
  try {
    if (!plain(value) || Object.keys(value).sort().join(',') !== 'contract_version,customer_id,items,next_id'
      || value.contract_version !== 'product.v1' || value.customer_id !== customerId
      || !Array.isArray(value.items) || Object.getPrototypeOf(value.items) !== Array.prototype
      || Reflect.ownKeys(value.items).some(k => k !== 'length' && (typeof k !== 'string' || !/^(0|[1-9][0-9]*)$/.test(k) || Object.getOwnPropertyDescriptor(value.items, k)?.get !== undefined || Object.getOwnPropertyDescriptor(value.items, k)?.set !== undefined))
      || value.items.length > limit
      || !(value.next_id === null || uuid(value.next_id))) return null
    let previous = after?.toLowerCase() ?? ''
    const items: import('../contracts/product-v1').ContactEditorV1[] = []
    for (const row of value.items) {
      if (!plain(row) || Object.keys(row).sort().join(',') !== 'display_name,email,id,is_primary,job_title,phone,status,version'
        || !uuid(row.id) || row.id.toLowerCase() <= previous || !field('expected_version', row.version)
        || !field('display_name', row.display_name) || !field('job_title', row.job_title)
        || !field('email', row.email) || !field('phone', row.phone) || !field('is_primary', row.is_primary)
        || !['active', 'inactive', 'archived'].includes(row.status as string)
        || (row.is_primary && row.status !== 'active')) return null
      previous = row.id.toLowerCase()
      items.push(Object.freeze({ ...row }) as import('../contracts/product-v1').ContactEditorV1)
    }
    if (value.next_id !== null && (items.length !== limit || value.next_id !== items.at(-1)?.id)) return null
    return Object.freeze({ contract_version: 'product.v1', customer_id: customerId, items: Object.freeze(items), next_id: value.next_id })
  } catch { return null }
}
