import test from 'node:test'
import assert from 'node:assert/strict'
import {runSwarmLab} from './swarm-lab.mjs'
test('ordinary execution cannot initialize Swarm or create network resources',async()=>{
 await assert.rejects(runSwarmLab({}),/SWARM_LAB_NOT_AUTHORIZED/)
})
