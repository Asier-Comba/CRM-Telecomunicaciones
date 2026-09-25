import {
  CAPABILITY_CONTRACT_VERSION,
  type CapabilityDefinition,
  type StructuredValue,
  type ValueSchema,
} from './contracts.js'
import { schemaContainsSensitiveKey } from './schema.js'

const CAPABILITY_NAME = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9_]*){2,}$/

const MAX_SCHEMA_DEPTH = 6
const MAX_OBJECT_PROPERTIES = 100

function assertBoundedSchema(schema: ValueSchema, depth = 0): void {
  if (depth > MAX_SCHEMA_DEPTH) throw new Error('schema_too_deep')
  if (schema.type === 'string') {
    if (!Number.isInteger(schema.maxLength) || schema.maxLength < 1) throw new Error('unbounded_string_schema')
    if (schema.minLength !== undefined && (!Number.isInteger(schema.minLength) || schema.minLength < 0 || schema.minLength > schema.maxLength)) {
      throw new Error('invalid_string_bound')
    }
    if (schema.enum && (schema.enum.length === 0 || new Set(schema.enum).size !== schema.enum.length || schema.enum.some((value) => value.length > schema.maxLength))) {
      throw new Error('invalid_string_enum')
    }
  }
  if (schema.type === 'number' && schema.minimum !== undefined && schema.maximum !== undefined && schema.minimum > schema.maximum) {
    throw new Error('invalid_number_bound')
  }
  if (schema.type === 'array') {
    if (!Number.isInteger(schema.maxItems) || schema.maxItems < 0 || schema.maxItems > 500) {
      throw new Error('invalid_array_bound')
    }
    assertBoundedSchema(schema.items, depth + 1)
  }
  if (schema.type === 'object') {
    if (schema.additionalProperties !== false) throw new Error('open_object_schema_forbidden')
    const propertyNames = Object.keys(schema.properties)
    if (propertyNames.length > MAX_OBJECT_PROPERTIES) throw new Error('too_many_schema_properties')
    if (new Set(schema.required).size !== schema.required.length) throw new Error('duplicate_required_property')
    if (schema.required.some((key) => !Object.prototype.hasOwnProperty.call(schema.properties, key))) {
      throw new Error('invalid_required_property')
    }
    Object.values(schema.properties).forEach((property) => assertBoundedSchema(property, depth + 1))
  }
}

function assertContract(definition: CapabilityDefinition): void {
  if (definition.contractVersion !== CAPABILITY_CONTRACT_VERSION) throw new Error('unsupported_contract_version')
  if (!CAPABILITY_NAME.test(definition.name)) throw new Error('invalid_capability_name')
  if (!definition.description.trim()) throw new Error('missing_capability_description')
  if (!definition.permission.trim()) throw new Error('missing_capability_permission')
  if (definition.inputSchema.additionalProperties !== false) throw new Error('open_input_schema_forbidden')
  if (typeof definition.authorize !== 'function') throw new Error('missing_resource_authorizer')
  assertBoundedSchema(definition.inputSchema)
  assertBoundedSchema(definition.outputSchema)
  if (schemaContainsSensitiveKey(definition.inputSchema) || schemaContainsSensitiveKey(definition.outputSchema)) {
    throw new Error('sensitive_schema_key_forbidden')
  }
  if (definition.tenantScope.source !== 'server_context' || definition.tenantScope.modelMayChooseWorkspace) {
    throw new Error('invalid_tenant_scope')
  }

  const write = definition.accessClass !== 'READ'
  if (write !== definition.idempotencyRequired) throw new Error('invalid_idempotency_policy')
  if (definition.accessClass === 'READ' && definition.confirmationPolicy !== 'none') {
    throw new Error('read_confirmation_forbidden')
  }
  if (
    (definition.accessClass === 'SENSITIVE_WRITE' || definition.accessClass === 'IRREVERSIBLE') &&
    definition.confirmationPolicy !== 'preview_confirm'
  ) {
    throw new Error('confirmation_required_for_risky_write')
  }
}

export class CapabilityRegistry {
  readonly #definitions = new Map<string, CapabilityDefinition>()

  register<I extends Record<string, unknown>, O extends StructuredValue>(definition: CapabilityDefinition<I, O>): void {
    assertContract(definition)
    if (this.#definitions.has(definition.name)) throw new Error('duplicate_capability')
    this.#definitions.set(definition.name, definition as CapabilityDefinition)
  }

  get(name: string): CapabilityDefinition | null {
    return this.#definitions.get(name) ?? null
  }

  list(): readonly CapabilityDefinition[] {
    return [...this.#definitions.values()]
  }
}
