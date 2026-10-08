import 'server-only'
import {createProductUserPortV1}from './product-user-factory-v1'
import {NotificationServiceV1}from './notifications-service-v1'
export async function createNotificationUserServiceV1(){const p=await createProductUserPortV1();return p?new NotificationServiceV1(p):null}
