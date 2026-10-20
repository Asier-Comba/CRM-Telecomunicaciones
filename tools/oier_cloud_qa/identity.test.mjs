import {test} from 'node:test'
import assert from 'node:assert/strict'
import {matchesServerIdentity,flightFramesFromScripts} from './identity.mjs'
const actor={id:'actor-a',workspaceId:'tenant-a',role:'member'}
const props={integrated:true,actorId:actor.id,workspaceId:actor.workspaceId,role:actor.role,children:'$4'}
const row=p=>JSON.stringify(['$','$L2',null,p])
const frames=(p=props)=>[[0],[1,'2:I[101,["chunks/app.js"],"ProductProvider"]\n'],[1,'3:'+row(p)+'\n']]
test('server provider must match all three identity fields and integrated mode',()=>{
 assert.equal(matchesServerIdentity(frames(),actor),true)
 for(const [key,value] of [['integrated',false],['actorId','actor-b'],['workspaceId','tenant-b'],['role','owner']])assert.equal(matchesServerIdentity(frames({...props,[key]:value}),actor),false)
})
test('unbound user data, duplicate providers and incomplete/changed wire cannot authorize writes',()=>{
 for(const f of [[],null,[[1,'3:'+row(props)+'\n']],[[1,'2:I[101,[],"OtherComponent"]\n3:'+row(props)+'\n']], [...frames(),[1,'5:'+row(props)+'\n']],[[1,'2:I[invalid\n3:'+row(props)+'\n']]])assert.equal(matchesServerIdentity(f,actor),false)
})
test('chunk boundaries and nested elements work without evaluating serialized content',()=>{
 const wire='2:I[101,[],"ProductProvider"]\n3:'+JSON.stringify({children:['$','div',null,{children:JSON.parse(row(props))}]})+'\n'
 assert.equal(matchesServerIdentity([[1,wire.slice(0,13)],[1,wire.slice(13)]],actor),true)
 assert.equal(matchesServerIdentity([[1,wire.replace('"ProductProvider"','"ProductProvider();throw Error()"')]],actor),false)
})
test('immutable Next script literals survive buffer clearing; arbitrary code is refused',()=>{
 const scripts=frames().filter(v=>v[0]===1).map(v=>'self.__next_f.push('+JSON.stringify(v)+')')
 assert.equal(matchesServerIdentity(flightFramesFromScripts(scripts),actor),true)
 assert.deepEqual(flightFramesFromScripts(['self.__next_f.push(globalThis.credentials)','self.__next_f.push([1,"x"]);throw Error()']),[])
})
