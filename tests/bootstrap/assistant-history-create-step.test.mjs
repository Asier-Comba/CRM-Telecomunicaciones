import test from 'node:test'
import assert from 'node:assert/strict'
import {historyCreateStepObservation} from '../../scripts/security/supabase-local/assistant-history-create-step.mjs'

const display={any_page_busy:true,title_disabled:true,retry_present:false,create_present:true,create_disabled:true,uncertain_alert:false,selected_heading_present:false}
const sample=()=>({phase:'CREATE_SELECTED_THREAD',route_drained:true,create_attempts:2,same_first_two_inputs:true,upstream_status:200,replay_status:200,receipt_passed:true,persisted_thread_count:1,seeded_turns:0,display:{...display}})

test('history create observation preserves unobserved data and distinguishes replay, SQL, heading and seeding failures',()=>{
 for(const phase of ['CREATE_REPLAY_CLICK','CREATE_REPLAY_RESPONSE','CREATE_REPLAY_BODY','CREATE_REPLAY_IDENTITY','CREATE_RECEIPT','CREATE_PERSISTED_THREAD','CREATE_SELECTED_THREAD','CREATE_SEED_START','CREATE_SEED_FINISH']){
  const input=sample();input.phase=phase
  const result=historyCreateStepObservation(input)
  assert.equal(result.phase,phase);assert.equal(result.scope,'CURRENT_SYNTHETIC_HISTORY_CREATE_AFTER_ROUTE_DRAIN')
  assert.equal(result.persisted_thread_count,1);assert.equal(result.display.selected_heading_present,false)
  assert.ok(Object.isFrozen(result)&&Object.isFrozen(result.display));input.display.any_page_busy=false;assert.equal(result.display.any_page_busy,true)
 }
 const unknown=historyCreateStepObservation({...sample(),phase:'CREATE_REPLAY_RESPONSE',replay_status:null,receipt_passed:null,persisted_thread_count:null,display:null})
 assert.equal(unknown.replay_status,null);assert.equal(unknown.receipt_passed,null);assert.equal(unknown.persisted_thread_count,null);assert.equal(unknown.display,null)
 assert.equal(historyCreateStepObservation({...sample(),phase:'CREATE_PERSISTED_THREAD',persisted_thread_count:0}).persisted_thread_count,0)
 assert.equal(historyCreateStepObservation({...sample(),phase:'CREATE_SEED_FINISH',seeded_turns:11}).seeded_turns,11)
})

test('history create observation rejects private fields, getters, invalid status/counters and contradictory proof markers',()=>{
 let getters=0
 const hostile=sample();Object.defineProperty(hostile,'phase',{enumerable:true,get(){getters++;return 'CREATE_SELECTED_THREAD'}})
 const hostileDisplay=sample();Object.defineProperty(hostileDisplay.display,'title_disabled',{enumerable:true,get(){getters++;return true}})
 for(const input of [hostile,hostileDisplay,{...sample(),cookie:'synthetic-private-cookie'},
  {...sample(),phase:'../../private-error'},{...sample(),route_drained:false},{...sample(),create_attempts:21},
  {...sample(),create_attempts:1,same_first_two_inputs:false},{...sample(),same_first_two_inputs:null},
  {...sample(),upstream_status:600},{...sample(),replay_status:0},{...sample(),receipt_passed:true,replay_status:503},
  {...sample(),receipt_passed:false},{...sample(),persisted_thread_count:Number.MAX_SAFE_INTEGER+1},
  {...sample(),seeded_turns:12},{...sample(),seeded_turns:1,persisted_thread_count:0},
  {...sample(),display:{...display,error:'synthetic-private-error'}},{...sample(),display:{...display,create_present:false}},
  {...sample(),display:{...display,retry_present:'private-data'}}])assert.equal(historyCreateStepObservation(input),null)
 assert.equal(getters,0)
})
