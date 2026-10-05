import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizedInvoice } from '../../src/features/billing/integration.ts'
import { blankForm } from '../../src/features/billing/model.ts'
import { validAiEntityReference } from '../../src/features/assistant/w3-ui-contract.ts'
test('invoice UI normalizes exact units, rates and nullable links without authority',()=>{
 const form={...blankForm(),clientId:'10000000-0000-4000-8000-000000000001',items:[{description:'Synthetic',quantity:1.001,unitPrice:1.23,discountRate:2.5,taxRate:21,withholdingRate:0,sortOrder:0}]}
 const draft=normalizedInvoice(form)
 assert.deepEqual(draft.lines,[{description:'Synthetic',quantity_milli:1001,unit_price_minor:123,discount_bps:250,tax_bps:2100,withholding_bps:0}])
 assert.equal(draft.notes,null);assert.equal(Object.hasOwn(draft,'command_id'),false);assert.equal(Object.hasOwn(draft,'workspace_id'),false)
 for(const n of [1.234,-1,Infinity,NaN])assert.throws(()=>normalizedInvoice({...form,items:[{...form.items[0],unitPrice:n}]}),e=>e.code==='validation')
})
test('W3 entity references are closed and cannot carry contact PII or authority',()=>{
 const reference={kind:'customer',id:'10000000-0000-4000-8000-000000000001'}
 assert.equal(validAiEntityReference(reference),true)
 for(const patch of [{email:'private@example.invalid'},{workspace_id:reference.id},{kind:'contact'},{id:'foreign'},{role:'owner'}])assert.equal(validAiEntityReference({...reference,...patch}),false)
})
