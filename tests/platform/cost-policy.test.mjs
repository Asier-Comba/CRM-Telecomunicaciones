import {test} from 'node:test'
import assert from 'node:assert/strict'
import {estimateCost} from '../../scripts/platform/cost-policy.mjs'
import {readJson} from '../../scripts/platform/lib.mjs'
test('unconfigured prices remain missing; monthly and usage bases never silently combine',()=>{
 assert.equal(estimateCost(readJson('infra/platform/cost-policy.json')).status,'CONFIGURATION_MISSING')
 const p={company_approval:'APPROVED',currency:'EUR',items:[{service:'hosting',basis:'fixed_month',price_minor:1234,quantity:2},{service:'auth_mail',basis:'1000_messages',price_minor:345,quantity:3}]};const r=estimateCost(p);assert.deepEqual(r.totals,{MONTHLY:2468,USAGE_PERIOD:1035});assert.equal(r.purchases_performed,false);assert.equal(r.taxes_and_provider_prices_verified,false)
 assert.equal(estimateCost({...p,currency:'EUR/USD'}).status,'CONFIGURATION_MISSING');assert.throws(()=>estimateCost({...p,items:[{...p.items[0],price_minor:Number.MAX_SAFE_INTEGER,quantity:2}]}),/OVERFLOW/)
})
