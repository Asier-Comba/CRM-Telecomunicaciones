import {test} from 'node:test'
import assert from 'node:assert/strict'
import {validateEnvironment,validValue} from '../../scripts/platform/config.mjs'
import {inventory} from '../../scripts/platform/inventory.mjs'
import {readJson,disposableGuard} from '../../scripts/platform/lib.mjs'
test('manifest covers source names deterministically without values',()=>{
 const m=inventory();assert.deepEqual(m,readJson('infra/platform/environment-manifest.json'))
 for(const e of m.entries){assert.equal(Object.hasOwn(e,'value'),false);assert.equal(typeof e.secret,'boolean');assert.ok(e.consumer.length);assert.ok(e.owner);assert.ok(e.validation_rule)}
 assert.ok(m.entries.length>60)
})
test('missing production fails safely without echoing secrets',()=>{
 const result=validateEnvironment({PLATFORM_TARGET:'PROD',SMTP_PASSWORD:'canary_private'},'PROD')
 assert.equal(result.status,'BLOCKED');assert.ok(result.errors.includes('AUTH_EMAIL_REQUIRED'));assert.ok(!JSON.stringify(result).includes('canary_private'))
})
test('invalid public credentials, origins and unsafe staging mail are blocked',()=>{
 const r=validateEnvironment({PLATFORM_TARGET:'STAGING',NODE_ENV:'production',NEXT_PUBLIC_SUPABASE_URL:'https://project.invalid',NEXT_PUBLIC_SUPABASE_ANON_KEY:'sb_secret_canary',NEXT_PUBLIC_APP_URL:'https://app.invalid',PRODUCT_V1_ORIGIN:'https://wrong.invalid',AUTH_SITE_URL:'https://app.invalid',AUTH_REDIRECT_URLS:'["https://app.invalid/*"]',AUTH_EMAIL_ENABLED:'true',PRODUCT_V1_ENABLED:'true',CRM_EMAIL_ENABLED:'true',NEXT_PUBLIC_OPENAI_API_KEY:'canary'},'STAGING')
 for(const code of ['PRIVATE_KEY_IN_PUBLIC_BINDING','APP_AUTH_ORIGIN_MISMATCH','INVALID_AUTH_REDIRECT_URLS','STAGING_MAIL_ALLOWLIST_REQUIRED','UNREGISTERED_PUBLIC_NEXT_PUBLIC_OPENAI_API_KEY'])assert.ok(r.errors.includes(code),code)
})
test('exact targets and disposable guards reject hosted configurations',()=>{
 assert.throws(()=>disposableGuard({CI:'true',GITHUB_ACTIONS:'true',PLATFORM_TARGET:'PROD'}),/DISPOSABLE/)
 assert.throws(()=>disposableGuard({CI:'true',GITHUB_ACTIONS:'true',PLATFORM_TARGET:'LOCAL',SUPABASE_ACCESS_TOKEN:'canary'}),/HOSTED/)
 assert.equal(validateEnvironment({},'nonsense').status,'BLOCKED')
})
test('URLs have no credentials or wildcard redirects and bounded numeric values',()=>{
 assert.equal(validValue('url','https://user:pass@example.invalid','PROD'),false)
 assert.equal(validValue('url','http://127.0.0.1:54321','PROD'),false)
 assert.equal(validValue('url','http://127.0.0.1:54321','LOCAL'),true)
 assert.equal(validValue('positive_integer','Infinity','PROD'),false)
})
