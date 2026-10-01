import { readFileSync } from 'node:fs'
import { validateEnvironment, policyDiff } from './policy.mjs'
try {
  if (process.argv[2] === '--policy-diff') console.log(JSON.stringify(policyDiff()))
  else {
    const errors=validateEnvironment(process.env.TARGET_ENV,JSON.parse(readFileSync(process.argv[2], 'utf8')),process.env)
    console.log(JSON.stringify({result:errors.length?'FAIL':'PASS',errors,scope:'STRUCTURAL_CONFIG_ONLY_NOT_OPERATIONAL_ACCEPTANCE'}))
    if(errors.length) process.exitCode=1
  }
} catch { console.log('{"result":"FAIL","errors":["CONFIG_UNREADABLE"]}'); process.exitCode=1 }
