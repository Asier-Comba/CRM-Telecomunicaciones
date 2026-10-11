import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import { calendarDate } from '../../src/features/product/model.ts'
import { parseInvoiceText } from '../../src/features/billing/parse.ts'

const require=createRequire(import.meta.url),ts=require('typescript')
const file=resolve(import.meta.dirname,'../../src/features/billing/IntegratedBilling.tsx')
const source=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
// Evaluate the actual date expressions at the UI call sites, then the real
// proposal parser. This is not a browser or database acceptance test.
const sites=[]
function visit(node){
 if(ts.isPropertyAssignment(node)&&node.name.getText(source)==='issueDate')sites.push({name:'draft '+(sites.length+1),expression:node.initializer.getText(source)})
 if(ts.isJsxAttribute(node)&&node.name.getText(source)==='asOf'&&node.initializer&&ts.isJsxExpression(node.initializer)&&node.initializer.expression)sites.push({name:'proposal',expression:node.initializer.expression.getText(source)})
 ts.forEachChild(node,visit)
}
visit(source);assert.equal(sites.length,3)
for(const [instant,expected] of [
 ['2026-10-09T22:30:00Z','2026-10-10'],
 ['2026-06-30T22:30:00Z','2026-07-01'],
 ['2026-12-31T23:30:00Z','2027-01-01'],
 ['2028-02-28T23:30:00Z','2028-02-29'],
 ['2026-10-10T12:30:00Z','2026-10-10'],
])for(const site of sites)test('actual billing date expression '+site.name+' at '+instant,()=>{
 class FixedDate extends Date{constructor(...args){super(...(args.length?args:[instant]))}static now(){return Date.parse(instant)}}
 const day=runInNewContext(site.expression,{Date:FixedDate,calendarDate},{timeout:1000})
 if(site.name==='proposal'){
  const proposal=parseInvoiceText('Factura a Synthetic Date Company por conectividad 100 euros más IVA, vencimiento en 15 días',[{id:'synthetic-date-company',name:'Synthetic Date Company'}],day)
  assert.equal(proposal.draft.clientId,'synthetic-date-company')
  assert.equal(proposal.draft.issueDate,expected)
  const due=new Date(expected+'T12:00:00Z');due.setUTCDate(due.getUTCDate()+15)
  assert.equal(proposal.draft.dueDate,due.toISOString().slice(0,10))
 }else assert.equal(day,expected)
})
