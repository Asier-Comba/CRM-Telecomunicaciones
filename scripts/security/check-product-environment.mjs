import {readFileSync}from 'node:fs'
import {validateProductEnvironmentV1}from '../../src/lib/server/product-environment-v1.ts'
const phase=process.argv[process.argv.indexOf('--environment')+1]
const manifest=JSON.parse(readFileSync('docs/master/contracts/product-environment.json','utf8'))
const result=validateProductEnvironmentV1(manifest,process.env,phase)
console.log(JSON.stringify(result,null,2));if(result.status!=='valid')process.exitCode=1
