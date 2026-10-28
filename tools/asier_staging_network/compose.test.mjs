import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url),yaml=require('js-yaml')
const spec=yaml.load(readFileSync(new URL('./compose.proposed.yaml',import.meta.url),'utf8'))
const names=Object.keys(spec.services),app=spec.services['crm-telecom-staging'],ingress=spec.services['crm-telecom-ingress'],egress=spec.services['crm-telecom-egress']
const networks=service=>Array.isArray(service.networks)?service.networks:Object.keys(service.networks)
test('proposed Compose gives only ingress access to the existing shared network',()=>{
 assert.deepEqual(names,['crm-telecom-staging','crm-telecom-ingress','crm-telecom-egress'])
 assert.deepEqual(networks(app),['crm-private']);assert.deepEqual(app.dns,['127.0.0.1'])
 assert.deepEqual(networks(ingress),['crm-private','easypanel']);assert.deepEqual(networks(egress),['crm-private','crm-outbound'])
 assert.equal(spec.networks['crm-private'].internal,true);assert.equal(spec.networks.easypanel.external,true)
 for(const service of Object.values(spec.services)){assert.equal(service.ports,undefined);assert.equal(service.privileged,undefined);assert.equal(service.volumes,undefined)}
})
test('all roles reuse one required immutable image and closed configuration with no secret in App or egress',()=>{
 for(const service of Object.values(spec.services)){
  assert.equal(service.image,spec['x-crm-runtime'].image);assert.match(service.image,/APP_IMAGE:\?/)
  assert.equal(service.user,'65532:65532');assert.equal(service.read_only,true);assert.deepEqual(service.cap_drop,['ALL'])
  assert.equal(service.environment.PRODUCT_STAGING_PRIVATE_EGRESS_ENABLED,'true')
  for(const name of ['PRODUCT_DOCUMENT_LIBRARY_ENABLED','PRODUCT_DOCUMENT_CONTENT_ENABLED','PRODUCT_DOCUMENT_MAINTENANCE_ENABLED','AI_ENABLED','CRM_EMAIL_ENABLED'])assert.equal(service.environment[name],'false')
 }
 assert.equal(app.command,undefined);assert.deepEqual(ingress.command,['tools/asier_staging_network/runtime.mjs','ingress']);assert.deepEqual(egress.command,['tools/asier_staging_network/runtime.mjs','egress'])
 assert.equal(app.secrets,undefined);assert.equal(egress.secrets,undefined);assert.deepEqual(ingress.secrets,['crm-staging-ingress'])
 assert.match(spec.secrets['crm-staging-ingress'].file,/CRM_INGRESS_CREDENTIAL_FILE:\?/)
 for(const helper of [ingress,egress]){assert.ok(helper.healthcheck.test.at(-1).includes('127.0.0.1'));assert.equal(helper.healthcheck.test.at(-1).includes('supabase'),false);assert.equal(helper.healthcheck.test.at(-1).includes('3000'),false)}
})
