import {readFileSync} from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {directConfiguration,directPreflight} from './contract.mjs'
import {fixture} from './synthetic-fixture.mjs'
const yaml=createRequire(import.meta.url)('js-yaml')
function model(){
 const c=yaml.load(readFileSync(new URL('../asier_staging_network/compose.proposed.yaml',import.meta.url),'utf8'))
 c.name='crm-inmobiliario_crm-telecom-runtime'
 for(const n of ['crm-private','crm-outbound'])c.networks[n].name=c.name+'_'+n
 for(const s of Object.values(c.services)){if(Array.isArray(s.networks))s.networks=Object.fromEntries(s.networks.map(n=>[n,null]))}
 return c
}
test('identity adaptation preserves original and all nonidentity controls',()=>{
 const original=model(),before=JSON.stringify(original),adapted=directConfiguration(original)
 assert.equal(JSON.stringify(original),before)
 assert.equal(adapted.name,'crm-telecom-direct')
 assert.deepEqual(adapted.services['crm-telecom-staging'],original.services['crm-telecom-staging'])
 assert.deepEqual(adapted.services['crm-telecom-egress'],original.services['crm-telecom-egress'])
 assert.deepEqual(adapted.networks.easypanel,original.networks.easypanel)
 const denied=directPreflight({configuration:adapted})
 assert.equal(denied.status,'BLOCKED');assert.equal(denied.deploying_authorized,false)
})
for(const [name,mutate]of Object.entries({
 foreignProject:c=>{c.name='foreign'},foreignNetwork:c=>{c.networks['crm-private'].name='easypanel'},foreignAlias:c=>{c.services['crm-telecom-ingress'].networks.easypanel.aliases=['foreign']},publishedPort:c=>{c.services['crm-telecom-staging'].ports=['3000:3000']},foreignVolume:c=>{c.services['crm-telecom-egress'].volumes=['other:/data']},hostNetwork:c=>{c.services['crm-telecom-staging'].network_mode='host'},extraService:c=>{c.services.foreign={image:'other'}}
}))test('direct adapter never approves '+name,()=>{
 const input=fixture();assert.equal(directPreflight(input).status,'CONFIGURATION_CHECKED');mutate(input.configuration);const result=directPreflight(input);assert.equal(result.status,'BLOCKED');assert.equal(result.deploying_authorized,false)
})
test('PROPOSED policy stays blocking even with consistent synthetic identity',()=>{const i=fixture();i.policy.status='PROPOSED';assert.equal(directPreflight(i).status,'BLOCKED')})
test('source converter must not sanitize malformed IPAM into acceptance',()=>{const c=model();c.networks['crm-private'].ipam=[];assert.throws(()=>directConfiguration(c))})
for(const kind of ['sameID','unrecordedID','wrongDriver','wrongInternal','nameInsteadOfID'])test('recorded network identity rejects '+kind,()=>{
 const i=fixture();assert.equal(directPreflight(i).status,'CONFIGURATION_CHECKED')
 if(kind==='sameID')i.networks[1].Id=i.networks[0].Id
 if(kind==='unrecordedID')i.networks[0].CreatedId='z'.repeat(25)
 if(kind==='wrongDriver')i.networks[0].Driver='bridge'
 if(kind==='wrongInternal')i.networks[0].Internal=false
 if(kind==='nameInsteadOfID')i.configuration.networks['crm-private'].name=i.networks[0].Name
 assert.equal(directPreflight(i).status,'BLOCKED')
})
