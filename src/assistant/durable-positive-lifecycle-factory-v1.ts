import { CapabilityRegistry } from './registry.ts'
import { createDurableCommandMaterialProducerV1, createDurableMaterialReservationPortV1 } from './durable-command-material.ts'
import { createDurableResultMaterialProducerV1, type ResultRegistrationV1 } from './durable-result-material.ts'
import { createDurableBusinessOutboxPortV1, type EffectWorkerAuthorityV1 } from './durable-business-outbox-port.ts'
import { createDurableCompletionPortV1 } from './durable-completion-port.ts'
import { createDurableUnconfirmedReservationPortV1 } from './durable-unconfirmed-reservation-port.ts'
import { createDurablePositiveReconciliationPortV1 } from './durable-positive-reconciliation-port.ts'
import { DurableReservationUnavailable } from './durable-reservation-port.ts'

type Dependencies<F extends (...args: never[]) => unknown> = Parameters<F>[0]
type Material = Dependencies<typeof createDurableCommandMaterialProducerV1>
type Result = Dependencies<typeof createDurableResultMaterialProducerV1>
type Business = Dependencies<typeof createDurableBusinessOutboxPortV1>
type Completion = Dependencies<typeof createDurableCompletionPortV1>
type Unconfirmed = Dependencies<typeof createDurableUnconfirmedReservationPortV1>
type Positive = Dependencies<typeof createDurablePositiveReconciliationPortV1>
type Reservation = Dependencies<typeof createDurableMaterialReservationPortV1>
export type PositiveLifecycleRpcV1 = Parameters<Reservation['invoke']>[0] | Parameters<Business['invoke']>[0]
  | Parameters<Completion['invoke']>[0] | Parameters<Unconfirmed['invoke']>[0] | Parameters<Positive['invoke']>[0]
export type PositiveLifecycleFactoryDependenciesV1 = {
  registry: CapabilityRegistry
  registrations: readonly ResultRegistrationV1[]
  currentWorker(): Promise<EffectWorkerAuthorityV1 | null>
  loadDraft: Material['loadDraft']
  loadOutcome: Result['loadOutcome']
  loadCommand: Completion['loadCommand']
  loadReservationCommand: Unconfirmed['loadCommand']
  loadConfirmationOrigin: NonNullable<Completion['loadConfirmationOrigin']>
  loadOutbox: Business['loadOutbox']
  verifyReceipt: Business['verifyReceipt']
  invoke(name: PositiveLifecycleRpcV1, input: Readonly<Record<string, string>>, signal?: AbortSignal): Promise<{ data: unknown; error: unknown }>
}

/** W2/W3 composition over existing typed physical ports. The transport and every
 * private loader are server-owned dependencies, never model/browser input.
 * Eleven method names are wired; verified absence remains deliberately denied.
 * This is neither the full business driver nor a production activation. */
export function createDurablePositiveLifecycleFactoryV1(raw: PositiveLifecycleFactoryDependenciesV1) {
  const fail = () => new DurableReservationUnavailable()
  const names = ['registry', 'registrations', 'currentWorker', 'loadDraft', 'loadOutcome', 'loadCommand',
    'loadReservationCommand', 'loadConfirmationOrigin', 'loadOutbox', 'verifyReceipt', 'invoke'] as const
  if (!raw || typeof raw !== 'object' || Object.getPrototypeOf(raw) !== Object.prototype) throw fail()
  const descriptors = Object.getOwnPropertyDescriptors(raw)
  if (Reflect.ownKeys(descriptors).length !== names.length || names.some(name => !descriptors[name]
    || !('value' in descriptors[name]) || !descriptors[name].enumerable)) throw fail()
  // Snapshot admitted data values once; no accessor or Proxy get substitution.
  const deps = Object.fromEntries(names.map(name => [name, descriptors[name].value])) as PositiveLifecycleFactoryDependenciesV1
  if (!(deps.registry instanceof CapabilityRegistry) || !Array.isArray(deps.registrations) || !deps.registrations.length
    || deps.registrations.length > 100 || names.slice(2).some(name => typeof deps[name] !== 'function')) throw fail()
  const registrations = deps.registrations.map(registration => {
    if (!registration || typeof registration !== 'object' || Object.getPrototypeOf(registration) !== Object.prototype) throw fail()
    const fields = Object.getOwnPropertyDescriptors(registration)
    const keys = ['dispatcher', 'capability', 'schemaVersion', 'authorizeResult'] as const
    if (Reflect.ownKeys(fields).length !== keys.length || keys.some(key => !fields[key]
      || !('value' in fields[key]) || !fields[key].enumerable)) throw fail()
    return Object.freeze(Object.fromEntries(keys.map(key => [key, fields[key].value]))) as ResultRegistrationV1
  })
  Object.freeze(registrations)
  const currentWorker = deps.currentWorker
  const material = createDurableCommandMaterialProducerV1({ registry: deps.registry, registrations,
    authority: currentWorker, loadDraft: deps.loadDraft })
  // Completion cannot admit a quarantined record. Positive reconciliation uses
  // a separate opt-in brand, preserving the original boundary's default denial.
  const resultDeps = { registry: deps.registry, registrations, authority: currentWorker, loadOutcome: deps.loadOutcome }
  const completionProducer = createDurableResultMaterialProducerV1(resultDeps)
  const reconciliationProducer = createDurableResultMaterialProducerV1({ ...resultDeps, allowVerifiedReconciliation: true })
  const reservation = createDurableMaterialReservationPortV1({ authority: currentWorker, producer: material, invoke: deps.invoke })
  const business = createDurableBusinessOutboxPortV1({ reservation, currentWorker, producer: material,
    loadOutbox: deps.loadOutbox, verifyReceipt: deps.verifyReceipt, invoke: deps.invoke })
  const completion = createDurableCompletionPortV1({ business, currentWorker, producer: completionProducer,
    loadCommand: deps.loadCommand, loadConfirmationOrigin: deps.loadConfirmationOrigin, invoke: deps.invoke })
  const unconfirmed = createDurableUnconfirmedReservationPortV1({ completion, currentWorker, producer: material,
    loadCommand: deps.loadReservationCommand, invoke: deps.invoke })
  const port = createDurablePositiveReconciliationPortV1({ reservation: unconfirmed, currentWorker,
    producer: reconciliationProducer, loadCommand: deps.loadCommand, invoke: deps.invoke })
  return Object.freeze({ contract: 'assistant.durable-positive-lifecycle.v1' as const, port: Object.freeze(port),
    verifiedCompleted: true as const, verifiedAbsence: false as const, businessEffectsEnabled: false as const })
}
