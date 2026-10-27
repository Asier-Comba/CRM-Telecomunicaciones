import {test} from 'node:test'
import assert from 'node:assert/strict'
import {initialLibraryInput,readLibraryHistory,libraryUrl,libraryDateFilter} from '../../src/features/documents/library-navigation.ts'
const customer='10000000-0000-4000-8000-000000000001',cursor='A'.repeat(40)
test('library view history contains only scoped validated filters/cursors, never rows or an authority override',()=>{
 const input={status:'active',sort:'created_desc',limit:20,cursor},value={contract:'documents.library.navigation.v2',scope:'A',input,page:2,back:[null]}
 assert.deepEqual(readLibraryHistory(value,'A'),{input,page:2,back:[null]});assert.equal(readLibraryHistory(value,'B'),null)
 for(const patch of [{rows:[{file_name:'PRIVATE'}]},{page:1},{back:Array(33).fill(cursor)},{input:{...input,workspace_id:customer}}])assert.equal(readLibraryHistory({...value,...patch},'A'),null)
})
test('library URLs never serialize document query, cursor or raw titles; customer context covers ancestry',()=>{
 const input={...initialLibraryInput({kind:'customer',id:customer}),query:'PRIVATE_TEXT',cursor}
 assert.equal(input.customer_id,customer);assert.equal(input.target,undefined)
 const url=libraryUrl(input);assert.equal(url,'/documents?customer='+customer);assert.equal(url.includes('PRIVATE'),false);assert.equal(url.includes(cursor),false)
})
test('date filters reject invalid calendar days and inclusive upper date is the next local midnight',()=>{
 assert.throws(()=>libraryDateFilter('2026-02-31'));assert.equal(libraryDateFilter(''),undefined)
 const a=new Date(libraryDateFilter('2026-10-27')),b=new Date(libraryDateFilter('2026-10-27',true));assert.equal(a.getDate(),27);assert.equal(a.getHours(),0);assert.equal(b.getDate(),28);assert.equal(b.getHours(),0)
})
