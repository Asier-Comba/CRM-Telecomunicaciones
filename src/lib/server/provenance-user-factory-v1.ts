import 'server-only'
import {createProductUserPortV1}from './product-user-factory-v1'
import {ProvenanceServiceV1}from './provenance-service-v1'
export async function createProvenanceUserServiceV1(){const p=await createProductUserPortV1();return p?new ProvenanceServiceV1(p):null}
