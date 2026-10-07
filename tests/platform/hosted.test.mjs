import {test} from 'node:test'
import assert from 'node:assert/strict'
import {desiredAuth,compareAuth,hostedGuard,configureAuth} from '../../scripts/platform/hosted-bootstrap.mjs'
import {portabilityScan} from '../../scripts/platform/boundary.mjs'
const c={environment:'STAGING',app_origin:'https://app.example.invalid',supabase_project_ref:'a'.repeat(20),auth:{redirect_urls:['https://app.example.invalid/auth/callback']}}
test('hosted adapters are never executed by missing credentials or a production target',()=>{
 assert.throws(()=>hostedGuard({...c,environment:'PROD'},{}),/STAGING_TARGET_GUARD/)
 assert.throws(()=>hostedGuard(c,{}),/STAGING_TARGET_GUARD/)
})
test('Auth config compares exact security settings with no values in results',async()=>{
 const auth=desiredAuth(c,{SMTP_PASSWORD:'canary_password',SMTP_USER:'canary_user'})
 assert.equal(compareAuth(auth,c).status,'PASS');assert.ok(!JSON.stringify(compareAuth(auth,c)).includes('canary'))
 assert.equal(compareAuth({...auth,mailer_autoconfirm:true},c).status,'BLOCKED')
 const calls=[]
 const transport=async(url,options)=>{calls.push(options.method);return {ok:true,json:async()=>auth}}
 assert.equal((await configureAuth(c,{},transport)).status,'PASS');assert.deepEqual(calls,['PATCH','GET'])
 await assert.rejects(()=>configureAuth(c,{},async()=>({ok:false})),/AUTH_CONFIG_WRITE_FAILED/)
})
test('deployable files have no personal machine paths or project refs',()=>{assert.equal(portabilityScan().status,'PASS')})
