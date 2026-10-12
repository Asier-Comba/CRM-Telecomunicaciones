import 'server-only'
import { createProductUserPortV1 } from './product-user-factory-v1'
import { TelecomCollectionServiceV1 } from './telecom-collection-service-v1'
import { TelecomReadsServiceV1 } from './telecom-reads-service-v1'
import { BillingAnalyticsServiceV1 } from './billing-analytics-service-v1'
import {BillingServiceV1} from './billing-service-v1'
import {createAssistantPortabilityListReaderV1} from './assistant-portability-list-reader-v1'
import {createAssistantCaseListReaderV1} from './assistant-case-list-reader-v1'
/** Current-cookie authorized service adapters. No raw DB path in planner. */
export async function createAssistantProductReadersV2() {
  const port = await createProductUserPortV1(); if (!port) return null
  const collections = new TelecomCollectionServiceV1(port), reports = new TelecomReadsServiceV1(port)
  const billing = new BillingAnalyticsServiceV1(port)
  const invoices=new BillingServiceV1(port)
  const portabilities=createAssistantPortabilityListReaderV1(port)
  const cases=createAssistantCaseListReaderV1(port)
  return { collection: (operation: string, input: unknown) => collections.read(operation, input),
    report: (operation: string, input: unknown) => reports.execute(operation, input),
    billingAnalytics: (operation: string, input: unknown) => billing.execute(operation, input),
    billingInvoices:(operation:'invoice.list',input:unknown)=>invoices.read(operation,input),
    portabilities:(operation:'portability.list',input:unknown)=>portabilities(operation,input),
    cases:(operation:'case.list',input:unknown)=>cases(operation,input) }
}
