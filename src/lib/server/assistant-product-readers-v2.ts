import 'server-only'
import { createProductUserPortV1 } from './product-user-factory-v1'
import { TelecomCollectionServiceV1 } from './telecom-collection-service-v1'
import { TelecomReadsServiceV1 } from './telecom-reads-service-v1'
import { BillingAnalyticsServiceV1 } from './billing-analytics-service-v1'
import { SimServiceV1 } from './sim-service-v1'
/** Current-cookie authorized service adapters. No raw DB path in planner. */
export async function createAssistantProductReadersV2() {
  const port = await createProductUserPortV1(); if (!port) return null
  const collections = new TelecomCollectionServiceV1(port), reports = new TelecomReadsServiceV1(port)
  const billing = new BillingAnalyticsServiceV1(port)
  const sims = new SimServiceV1(port)
  return { collection: (operation: string, input: unknown) => collections.read(operation, input),
    report: (operation: string, input: unknown) => reports.execute(operation, input),
    billingAnalytics: (operation: string, input: unknown) => billing.execute(operation, input),
    simInventory: (operation: string, input: unknown) => operation === 'sim.list' ? sims.execute(operation, input)
      : Promise.resolve({ ok: false as const, error: 'validation' as const }) }
}
