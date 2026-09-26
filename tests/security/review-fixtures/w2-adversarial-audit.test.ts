import assert from 'node:assert/strict'
import test from 'node:test'
import {createMaskedSensitiveField,transitionSensitiveField,toSensitiveCopyIntent} from './w2-sensitive-field.ts'
import {initialOverlayFocusState,transitionOverlayFocus} from './w2-overlay-focus.ts'
import {createActiveTenantCache,transitionTenantCache,readTenantCache} from './w2-tenant-cache.ts'
import {initialAssistantReadState,transitionAssistantRead} from './w2-assistant-read-session.ts'
import {presentLargeCollection} from './w2-large-collection.ts'
import {transitionMutationUi} from './w2-assistant-mutation-ui.ts'
const reveal='cap' as any, copy='copy' as any, request='req' as any
const start=()=>transitionSensitiveField(createMaskedSensitiveField('***123',reveal),{type:'reveal_requested',requestRef:request,capability:reveal})
test('W4 repro expired same-second response accepted by lexical timestamp comparison',()=>{
 const state=transitionSensitiveField(start(),{type:'server_reveal_received',requestRef:request,revealedValue:'synthetic',copyCapability:copy,receivedAt:'2026-09-26T12:00:00.900Z',expiresAt:'2026-09-26T12:00:00Z'})
 assert.equal(state.visibility,'revealed')
 assert.notEqual(toSensitiveCopyIntent(state,copy,'2026-09-26T12:00:00.950Z'),null)
})
test('W4 repro revoked sensitive field accepts stale capability then stale reveal',()=>{
 let state=transitionSensitiveField(start(),{type:'access_revoked'})
 state=transitionSensitiveField(state,{type:'reveal_requested',requestRef:request,capability:reveal})
 state=transitionSensitiveField(state,{type:'server_reveal_received',requestRef:request,revealedValue:'synthetic',copyCapability:copy,receivedAt:'2026-09-26T12:00:00Z',expiresAt:'2026-09-26T12:05:00Z'})
 assert.equal(state.visibility,'revealed')
})
test('W4 repro revoked overlay can reopen from queued open',()=>{
 const revoked=transitionOverlayFocus(initialOverlayFocusState(),{type:'access_revoked'}).state
 const opened=transitionOverlayFocus(revoked,{type:'open',openerId:'protected',fallbackFocusId:'protected',focusableIds:['pii'],initialFocusId:'pii'})
 assert.equal(opened.state.status,'open')
 assert.deepEqual(opened.effects,[{type:'focus',targetId:'pii'}])
})
test('W4 repro consumed request ABA after bounded history eviction',()=>{
 const key={tenantEpoch:'epoch' as any,authenticatedScopeRef:'scope',transportContractVersion:'v1',presentationVersion:'v1',resourceKind:'customer' as const,entityRef:'customer',projectionRef:'summary'}
 let state=createActiveTenantCache<string>('epoch' as any)
 for(let i=0;i<514;i++){
  const ref=`r${i}` as any
  state=transitionTenantCache(state,{type:'request_started',requestRef:ref,key})
  state=transitionTenantCache(state,{type:'request_aborted',requestRef:ref})
 }
 state=transitionTenantCache(state,{type:'request_started',requestRef:'r0' as any,key})
 state=transitionTenantCache(state,{type:'response_committed',requestRef:'r0' as any,key,data:'stale first attempt'})
 assert.equal(readTenantCache(state,key),'stale first attempt')
})
test('W4 stale stream and revoked request remain fenced',()=>{
 let state=transitionAssistantRead(initialAssistantReadState(),{type:'request_requested',requestRef:'new' as any})
 assert.deepEqual(transitionAssistantRead(state,{type:'stream_started',requestRef:'old' as any,sequence:1}),state)
 state=transitionAssistantRead(state,{type:'access_revoked'})
 assert.deepEqual(transitionAssistantRead(state,{type:'request_requested',requestRef:'late' as any}),state)
})
test('W4 repro nonfinite visible count yields inconsistent count',()=>{
 const result=presentLargeCollection({state:'ready',data:[1,2,3],completeness:{kind:'complete'}} as any,NaN)
 assert.equal(Number.isNaN(result.visibleCount),true)
 assert.equal(result.visibleItems.length,0)
})
test('W4 repro operation status regresses within second with mixed precision',()=>{
 const result=transitionMutationUi({status:'review_required',operationRef:'op' as any,updatedAt:'2026-09-26T12:00:00.900Z'}, {type:'operation_status_received',envelope:{operationRef:'op',status:'pending',updatedAt:'2026-09-26T12:00:00Z',nextPollAfterMs:1000} as any})
 assert.equal(result.status,'pending')
 assert.equal((result as any).updatedAt,'2026-09-26T12:00:00Z')
})
