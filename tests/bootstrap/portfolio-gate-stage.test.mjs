import test from 'node:test'
import assert from 'node:assert/strict'
import {currentPortfolioGateStage} from '../../scripts/security/supabase-local/product-portfolio-reference-read.mjs'
const destination='http://127.0.0.1:3109/portfolio?kind=contract&id=00000000-0000-4000-8000-000000000001'
function page({url=destination,value=null,present=true}={}){
 let evaluations=0,attributes=0
 return{evaluate:async(fn,expected)=>{
  evaluations++
  const document={querySelector:selector=>{assert.equal(selector,'[data-crm-access-stage]');return present?{getAttribute:key=>{attributes++;assert.equal(key,'data-crm-access-stage');return value}}:null},get cookie(){throw Error('private cookies must not be read')},get body(){throw Error('private document must not be read')}}
  return new Function('location','document','expected',`return (${fn.toString()})(expected)`)({href:url},document,expected)
 },counts:()=>({evaluations,attributes})}
}
test('closed lifecycle markers distinguish hydration, pending user read and closed errors without private document reads',async()=>{
 for(const value of ['before_effect','legacy_checking','user_pending','user_returned','client_unavailable','access_error']){
  const fixture=page({value});assert.equal(await currentPortfolioGateStage(fixture,destination),value);assert.deepEqual(fixture.counts(),{evaluations:1,attributes:1})
 }
 const absent=page({present:false});assert.equal(await currentPortfolioGateStage(absent,destination),'not_present');assert.deepEqual(absent.counts(),{evaluations:1,attributes:0})
})
test('a subsequent document is not used as evidence of the requested document',async()=>{
 const fixture=page({url:destination+'&changed=1',value:'user_pending'})
 assert.equal(await currentPortfolioGateStage(fixture,destination),'document_changed');assert.deepEqual(fixture.counts(),{evaluations:1,attributes:0})
})
test('unexpected marker, browser result and disposed execution errors yield only an unavailable code, without retry',async()=>{
 for(const value of ['synthetic-private-detail',null,{},'user_pending synthetic-private-detail'])assert.equal(await currentPortfolioGateStage(page({value}),destination),'unavailable')
 let calls=0
 assert.equal(await currentPortfolioGateStage({evaluate:async()=>{calls++;throw Error('synthetic private execution detail')}},destination),'unavailable');assert.equal(calls,1)
 assert.equal(await currentPortfolioGateStage({evaluate:async()=>({private:'synthetic'})},destination),'unavailable')
})
