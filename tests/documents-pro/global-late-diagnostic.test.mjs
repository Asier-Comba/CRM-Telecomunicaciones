import {test} from 'node:test'
import assert from 'node:assert/strict'
import {lateFailureCategory,closedLateFailure} from '../../tools/asier_documents_global/late-failure-diagnostic.mjs'
test('late diagnostic retains closed categories only, never exception contents',()=>{
 assert.equal(lateFailureCategory({message:'strict mode violation SECRET_SYNTHETIC'}),'LOCATOR_AMBIGUOUS')
 assert.equal(lateFailureCategory({name:'TimeoutError',message:'SECRET_SYNTHETIC'}),'BOUNDED_WAIT_FAILED')
 assert.equal(lateFailureCategory({message:'SECRET_SYNTHETIC'}),'OTHER_SAFE_FAILURE')
})
test('late diagnostic tries independent bounded counts and boolean observer without payloads',async()=>{
 const locator={count:async()=>2,filter(){return{count:async()=>1}},locator(){return{count:async()=>1}}}
 const page={getByRole(){return locator},locator(selector){if(selector==='[data-document-id]')throw Error('SECRET_SYNTHETIC');return locator},evaluate:async()=>({installed:false,json_consumed:false,settled:false,saw_rows:false})}
 const result=await closedLateFailure(page,{message:'strict mode violation SECRET_SYNTHETIC'})
 assert.deepEqual(result,{category:'LOCATOR_AMBIGUOUS',total_alerts:2,library_denial_alerts:1,next_announcer_alerts:1,document_rows:null,observer:{installed:false,json_consumed:false,settled:false,saw_rows:false}})
 assert.equal(JSON.stringify(result).includes('SECRET_SYNTHETIC'),false)
})
