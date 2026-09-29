/** Exact W1 EntityKindV1 taxonomy; a kind is not authorization or proof of existence. */
export const ENTITY_KINDS_V1_SOURCE = {
  repository: 'Asier-Comba/CRM-Telecomunicaciones',
  branch: 'w1/telecom-domain-v1',
  commit: 'e65f1e802fbcb63f9a1636689b85eb2aa135c592',
  path: 'src/lib/contracts/telecom-v1.ts',
  contractVersion: 'telecom.v1',
} as const

export const ENTITY_KINDS_V1 = Object.freeze([
  'user', 'customer', 'contact', 'operator', 'plan',
  'contract', 'service', 'line', 'commitment',
  'permanence', 'renewal', 'opportunity',
  'opportunity_stage', 'task', 'meeting', 'activity',
  'document', 'incident',
] as const)

export type EntityKindV1 = typeof ENTITY_KINDS_V1[number]

export function isEntityKindV1(value: unknown): value is EntityKindV1 {
  return typeof value === 'string' && ENTITY_KINDS_V1.some((kind) => kind === value)
}
