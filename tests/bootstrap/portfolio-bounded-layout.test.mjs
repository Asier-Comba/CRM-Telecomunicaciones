import {test} from 'node:test'
import assert from 'node:assert/strict'
import {EventEmitter} from 'node:events'
import {portfolioBoundedLayout} from '../../scripts/security/supabase-local/product-portfolio-bounded-layout.mjs'

for(const failure of [null,'fill','click','button_enabled'])test('bounded layout keeps original actions and exception: '+failure,async()=>{
 const page=new EventEmitter(),calls=[],original=Error('PRIVATE_CALL_LOG_MUST_NOT_ENTER_SAFE_REPORT'),report={}
 page.url=()=> 'http://127.0.0.1:3109/portfolio';page.mainFrame=()=>page
 const act=async phase=>{calls.push(phase);if(phase===failure)throw original}
 page.getByLabel=(name,options)=>{assert.equal(name,'Consultar cartera local');assert.deepEqual(options,{exact:true});return{fill:async value=>{assert.equal(value,'W2 UI');await act('fill')}}}
 page.getByRole=(role,options)=>{assert.equal(role,'button');assert.deepEqual(options,{name:'Consultar cartera',exact:true});return{click:()=>act('click')}}
 const expect=()=>({toBeEnabled:()=>act('button_enabled')})
 const input={page,expect,origin:'http://127.0.0.1:3109',width:390,expectedContractId:'10000000-0000-4000-8000-000000000001',report}
 if(failure)await assert.rejects(portfolioBoundedLayout(input),error=>error===original)
 else await portfolioBoundedLayout(input)
 const phases=['fill','click','button_enabled'],count=failure?phases.indexOf(failure)+1:3
 assert.deepEqual(calls,phases.slice(0,count))
 const row=report.w2_portfolio_bounded_layout_observations[0]
 assert.equal(row.completed,!failure);assert.equal(row.phase,failure??'button_enabled')
 assert.deepEqual(row.phases.map(p=>p.phase),calls)
 assert.equal(row.render_acceptance,'NOT_MEASURED_BUTTON_ENABLED_IS_NOT_RESULT_READBACK')
 assert.ok(!JSON.stringify(report).includes('PRIVATE_CALL_LOG'))
 for(const event of ['request','response','requestfailed','framenavigated'])assert.equal(page.listenerCount(event),0)
})

test('diagnostic initialization failure cannot stop the three original actions',async()=>{
 const calls=[],report={},page={url(){throw Error('OBSERVER_UNAVAILABLE')},getByLabel(){return{fill:async()=>calls.push('fill')}},getByRole(){return{click:async()=>calls.push('click')}}}
 await portfolioBoundedLayout({page,expect:()=>({toBeEnabled:async()=>calls.push('button_enabled')}),origin:'http://127.0.0.1:3109',width:1440,expectedContractId:'10000000-0000-4000-8000-000000000001',report})
 assert.deepEqual(calls,['fill','click','button_enabled']);assert.equal(report.w2_portfolio_bounded_layout_observations[0].transport,null)
})
