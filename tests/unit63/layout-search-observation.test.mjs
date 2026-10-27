import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

const require=createRequire(import.meta.url),ts=require('typescript')
const file=new URL('../../scripts/security/supabase-local/product-browser-acceptance.mjs',import.meta.url)
const addedImport="import {observePortfolioBoundedSearchV1 as observeLayoutSearchV1} from './portfolio-bounded-search-observation-v1.mjs'\n"
const text=readFileSync(file,'utf8').replaceAll('\r\n','\n'),withoutImport=text.replace(addedImport,'')
const source=ts.createSourceFile('product-browser-acceptance.mjs',withoutImport,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS)
let block
function visit(node){if(ts.isIfStatement(node)&&node.expression.getText(source)==="name==='portfolio'"){assert.equal(block,undefined);block=node.thenStatement}ts.forEachChild(node,visit)}
visit(source);assert.ok(block)
function awaits(node){const result=[];function collect(n){if(ts.isAwaitExpression(n))result.push(n.getText(source));ts.forEachChild(n,collect)}collect(node);return result}
const hash=value=>createHash('sha256').update(value).digest('hex')
const actionTry=block.statements.find(node=>ts.isTryStatement(node)&&awaits(node.tryBlock).length===3)
assert.ok(actionTry)
const fragment=withoutImport.slice(block.statements[0].getStart(source),actionTry.end)

test('only the authorized portfolio observation changes; every original action, assertion and budget remains intact',()=>{
 assert.equal(text.split(addedImport).length,2)
 assert.equal(hash(withoutImport.slice(0,block.getStart(source))+'{OBSERVATION_SCOPE}'+withoutImport.slice(block.end)),'0931198f1a9ec2b5831e1d17e263426d4a6638a2b30ee18ab0d7997429a45890')
 assert.equal(awaits(block).length,8)
 assert.equal(hash(JSON.stringify(awaits(block))),'0bffc18700551d01ed91fea3c577d26cfb1200997276eec69fa16cda4c50b963')
 assert.equal(actionTry.catchClause,undefined)
 assert.ok(actionTry.finallyBlock)
})

async function exercise({failAt,observerThrows=false,finishThrows=false,snapshot,report={}}={}){
 const calls=[],original=new Error('synthetic original action failure'),context={page:{},report,width:390,origin:'http://127.0.0.1:3109',uiContract:'10000000-0000-4000-8000-000000000001'}
 let finishes=0
 const action=async stage=>{calls.push(stage);if(stage===failAt)throw original}
 context.page.getByLabel=(name,options)=>{assert.equal(name,'Consultar cartera local');assert.deepEqual({...options},{exact:true});return{fill:async query=>{assert.equal(query,'W2 UI');return action('fill')}}}
 context.page.getByRole=(role,options)=>{assert.equal(role,'button');assert.deepEqual({...options},{name:'Consultar cartera',exact:true});return{click:()=>action('submit')}}
 context.expect=()=>({toBeEnabled:()=>action('ready')})
 context.observeLayoutSearchV1=()=>{if(observerThrows)throw Error('synthetic observer failure');return{finish(){finishes++;if(finishThrows)throw Error('synthetic observer finish failure');return snapshot??{document_changed:false,truncated:false,rows:[]}}}}
 let error
 try{await runInNewContext('(async()=>{'+fragment+'})()',context)}catch(e){error=e}
 return{calls,error,original,report,finishes}
}

test('success preserves the three original actions and emits only closed current-search counters',async()=>{
 const poison='synthetic private query/token/id/header/body'
 const r=await exercise({snapshot:{document_changed:false,truncated:false,private:poison,rows:[{kind:'search',status:'ok',failed:false,query:poison,body:poison},{kind:'search',status:'pending',failed:false},{kind:'expected_contract',status:'server_error',failed:true,private:poison}]}})
 assert.equal(r.error,undefined);assert.deepEqual(r.calls,['fill','submit','ready']);assert.equal(r.finishes,1)
 const result=JSON.parse(JSON.stringify(r.report.w2_portfolio_layout_search_observations))
 assert.deepEqual(result,[{contract:'w2.portfolio-layout-search-headers.v1',width:390,phase:'query_ready',observed:true,document_changed:false,truncated:false,requests:2,responses:1,failures:0,pending:1,status_counts:{ok:1,client_error:0,server_error:0,other:0}}])
 assert.ok(!JSON.stringify(r.report).includes(poison))
})
for(const [stage,phase]of [['fill','query_fill'],['submit','query_submit'],['ready','query_ready']])test(`original ${stage} failure is preserved with its exact phase and no retry`,async()=>{
 const r=await exercise({failAt:stage,snapshot:{document_changed:false,truncated:false,rows:stage==='ready'?[{kind:'search',status:'pending',failed:true}]:[]}})
 assert.equal(r.error,r.original);assert.deepEqual(r.calls,['fill','submit','ready'].slice(0,['fill','submit','ready'].indexOf(stage)+1));assert.equal(r.finishes,1)
 assert.equal(r.report.w2_ui_action_step,'layout:portfolio:390:'+phase)
 const sample=r.report.w2_portfolio_layout_search_observations[0];assert.equal(sample.phase,phase);assert.equal(sample.requests,stage==='ready'?1:0);assert.equal(sample.failures,stage==='ready'?1:0)
})
for(const option of ['observerThrows','finishThrows'])test(`${option} cannot prevent or replace the original outcome`,async()=>{
 const success=await exercise({[option]:true});assert.equal(success.error,undefined);assert.deepEqual(success.calls,['fill','submit','ready'])
 const failure=await exercise({[option]:true,failAt:'submit'});assert.equal(failure.error,failure.original);assert.deepEqual(failure.calls,['fill','submit'])
})
test('document changes discard old search evidence and capture is bounded to three widths',async()=>{
 const changed=await exercise({snapshot:{document_changed:true,truncated:true,rows:[{kind:'search',status:'ok',failed:false}]}})
 const sample=changed.report.w2_portfolio_layout_search_observations[0];assert.equal(sample.document_changed,true);assert.equal(sample.requests,0);assert.equal(sample.truncated,true)
 const report={w2_portfolio_layout_search_observations:[{},{},{}]},bounded=await exercise({report});assert.equal(bounded.finishes,1);assert.equal(report.w2_portfolio_layout_search_observations.length,3);assert.deepEqual(bounded.calls,['fill','submit','ready'])
})
