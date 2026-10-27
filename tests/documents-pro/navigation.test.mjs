import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readDocumentView,documentViewUrl,documentNavigationKey,readDocumentBackStack,documentTargetHref,documentFormat,documentSize} from '../../src/features/documents/document-navigation.ts'
const a='10000000-0000-4000-8000-000000000001',b='20000000-0000-4000-8000-000000000002'
test('a shared or reloaded target page preserves status and a bounded real cursor without titles or tokens',()=>{
  const view={target:{kind:'service',id:a},status:'archived',after:b,page:3}
  const url=documentViewUrl('http://127.0.0.1/documents?customer='+a+'&query=PRIVATE_FILE_NAME&token=PRIVATE_VALUE#PRIVATE_HASH',view)
  assert.equal(url.includes('customer='),false);assert.equal(url.includes('PRIVATE'),false)
  const decoded=readDocumentView(new URL(url,'http://127.0.0.1').search)
  assert.deepEqual(decoded,{view,invalid:false})
})
test('invalid targets duplicate parameters and contradictory cursors never fall back to another company',()=>{
  for(const query of [`?customer=${a}&customer=${b}`,`?customer=${a}&doc_kind=line`,`?doc_target=${a}`,`?customer=${a}&doc_after=${b}`,`?customer=${a}&doc_page=9`,`?customer=${a}&doc_status=all`,`?customer=${a}&doc_after=bad&doc_page=2`,`?doc_after=${b}&doc_page=2`]){
    const result=readDocumentView(query);assert.equal(result.invalid,true,query);assert.equal(result.view.target,null);assert.equal(result.view.after,null)
  }
})
test('back history is view state bound to actor/workspace/role/query and current cursor',()=>{
  const view={target:{kind:'customer',id:a},status:'active',after:b,page:3}
  const saved={contract:'documents.navigation.v1',scope:'actor-A/workspace-A/owner',query:documentNavigationKey(view),after:b,page:3,back:[null,a]}
  assert.deepEqual(readDocumentBackStack(saved,saved.scope,view),[null,a])
  assert.deepEqual(readDocumentBackStack(saved,'actor-B/workspace-B/owner',view),[])
  for(const patch of [{status:'archived'},{after:a},{page:2},{target:{kind:'customer',id:b}}])assert.deepEqual(readDocumentBackStack(saved,saved.scope,{...view,...patch}),[])
  assert.deepEqual(readDocumentBackStack({...saved,back:Array(33).fill(a),page:40},saved.scope,{...view,page:40}),[])
})
test('context links are closed local CRM destinations; invoice and injected URLs are never invented',()=>{
  assert.equal(documentTargetHref({kind:'customer',id:a}),'/clients/'+a)
  assert.equal(documentTargetHref({kind:'service_case',id:a}),'/cases/'+a)
  assert.equal(documentTargetHref({kind:'invoice',id:a}),null)
  assert.equal(documentTargetHref({kind:'customer',id:'javascript:alert(1)'}),null)
  assert.throws(()=>documentViewUrl('javascript:alert(1)',{target:null,status:'active',after:null,page:1}))
})
test('presentation distinguishes unavailable metadata and uses measured bytes only',()=>{
  assert.equal(documentFormat('application/pdf'),'PDF');assert.equal(documentFormat(null),'Formato no disponible')
  assert.equal(documentSize(70),'70 B');assert.equal(documentSize(10485760),'10 MiB');assert.equal(documentSize(null),'Tamaño no disponible')
})
