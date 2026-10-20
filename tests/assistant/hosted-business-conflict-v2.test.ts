import test from 'node:test'
import assert from 'node:assert/strict'
import {ConversationServiceV2} from '../../src/assistant/conversation-service-v2.ts'
const id='10000000-0000-4000-8000-000000000001',turn='20000000-0000-4000-8000-000000000001'
for(const code of ['40001','PT409'])test('assistant conversations retain safe conflict and current authority for '+code,async()=>{
 let reads=0,calls=0
 const scope={actorId:'actor',workspaceId:'workspace',scopeEpoch:'epoch_1',role:'member'}
 const service=new ConversationServiceV2({authority:async()=>{reads++;return scope},invoke:async()=>{calls++;return{data:null,error:{code,message:'private provider detail'}}}})
 assert.deepEqual(await service.execute('turn.start',{id,turn_id:turn,text:'Lee tareas'}),{ok:false,error:'conflict'})
 assert.equal(reads,2);assert.equal(calls,1)
})
