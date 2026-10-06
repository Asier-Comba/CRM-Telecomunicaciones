import 'server-only'
import { createProductUserPortV1 } from './product-user-factory-v1'
import { TelecomCollectionServiceV1 } from './telecom-collection-service-v1'
import { TelecomReadsServiceV1 } from './telecom-reads-service-v1'
/** Current-cookie authorized service adapters. No raw DB path in planner. */
export async function createAssistantProductReadersV2() {
  const port = await createProductUserPortV1(); if (!port) return null
  const collections = new TelecomCollectionServiceV1(port), reports = new TelecomReadsServiceV1(port)
  return { collection: (operation: string, input: unknown) => collections.read(operation, input),
    report: (operation: string, input: unknown) => reports.execute(operation, input) }
}
