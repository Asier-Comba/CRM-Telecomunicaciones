import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {resolve,sep} from 'node:path'
import {EventEmitter} from 'node:events'
import {cleanupOwnedSteps,stopOwnedChild} from './cleanup.mjs'

test('actual lab finalizer reports FAIL after a failed stack teardown and still attempts file cleanup',async()=>{
 const source=readFileSync(new URL('./run.mjs',import.meta.url),'utf8')
 const body=source.slice(source.lastIndexOf('}finally{')+'}finally{'.length).trim().slice(0,-1)
 const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor
 const execute=new AsyncFunction('stopApp','started','command','report','process','projectRoot','resolve','sep','rmSync','writeFileSync','console','cleanupOwnedSteps','dockerConfig',body)
 const report={result:'PASS',checks:[]},process={env:{RUNNER_TEMP:resolve('owned-runner')},exitCode:0};let saved,removed=false
 await execute(async()=>{},true,()=>{throw Error('TEARDOWN_DENIED')},report,process,resolve('owned-runner','crm-p0-schema88-owned'),resolve,sep,()=>{removed=true},(_path,wire)=>{saved=JSON.parse(wire)},{log(){}},cleanupOwnedSteps)
 assert.equal(saved.result,'FAIL');assert.equal(process.exitCode,1);assert.equal(removed,true)
})

test('cleanup attempts independent browser resources even when the context fails',async()=>{
 const calls=[]
 const result=await cleanupOwnedSteps({context:async()=>{calls.push('context');throw Error('CLOSE_FAILED')},browser:async()=>{calls.push('browser')}})
 assert.deepEqual(calls,['context','browser']);assert.equal(result.ok,false);assert.deepEqual(result.result,{context:'FAIL',browser:'PASS'})
})

test('child cleanup waits for confirmed exit after SIGKILL and fails if exit is never observed',async()=>{
 const child=()=>Object.assign(new EventEmitter(),{exitCode:null,signalCode:null,signals:[],kill(signal){this.signals.push(signal);if(signal==='SIGKILL')this.emit('killed');return true}})
 const actual=child();let completed=false
 const pending=stopOwnedChild(actual,{graceMs:10,killMs:100}).then(()=>{completed=true})
 await new Promise(resolve=>actual.once('killed',resolve));assert.equal(completed,false)
 actual.emit('exit',null,'SIGKILL');await pending;assert.deepEqual(actual.signals,['SIGTERM','SIGKILL'])
 await assert.rejects(stopOwnedChild(child(),{graceMs:10,killMs:10}),/CHILD_EXIT_UNCONFIRMED/)
})
