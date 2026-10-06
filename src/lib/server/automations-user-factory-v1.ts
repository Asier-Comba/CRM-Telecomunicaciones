import 'server-only'
import {createProductUserPortV1}from './product-user-factory-v1'
import {AutomationServiceV1}from './automations-service-v1'
export async function createAutomationUserServiceV1(){const p=await createProductUserPortV1();return p?new AutomationServiceV1(p):null}
