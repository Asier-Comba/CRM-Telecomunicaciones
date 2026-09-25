import {
  CAPABILITY_CONTRACT_VERSION,
  type CapabilityDefinition,
  type StructuredValue,
} from './contracts.js'

const CAPABILITY_NAME = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9_]*){2,}$/

function assertContract(definition: CapabilityDefinition): void {
  if (definition.contractVersion !== CAPABILITY_CONTRACT_VERSION) throw new Error('unsupported_contract_version')
  if (!CAPABILITY_NAME.test(definition.name)) throw new Error('invalid_capability_name')
  if (!definition.description.trim()) throw new Error('missing_capability_description')
  if (!definition.permission.trim()) throw new Error('missing_capability_permission')
  if (definition.inputSchema.additionalProperties !== false) throw new Error('open_input_schema_forbidden')
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
