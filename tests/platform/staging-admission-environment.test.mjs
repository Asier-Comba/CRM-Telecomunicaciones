import {test} from 'node:test'
import assert from 'node:assert/strict'
import {validValue,validateEnvironment} from '../../scripts/platform/config.mjs'
import {inventory} from '../../scripts/platform/inventory.mjs'
import {parseStagingUserIdsV1} from '../../src/lib/server/product-staging-admission-v1.ts'

const a='10000000-0000-4000-8000-000000000001',b='20000000-0000-4000-9000-000000000002'
const many=n=>Array.from({length:n},(_,i)=>`${String(i+1).padStart(8,'0')}-0000-4000-8000-000000000000`).join(',')

test('platform uuid_csv accepts exactly what the product admission parser accepts (staging)',()=>{
 const cases=[a,`${a},${b}`,many(64),many(65),`${a},${a}`,'*',`${a},*`,`${a}, ${b}`,` ${a}`,`${a},`,`,${a}`,a.toUpperCase(),
  'not-a-uuid','00000000-0000-0000-0000-000000000000','10000000-0000-6000-8000-000000000001','10000000-0000-4000-c000-000000000001',
  `${a};${b}`,`${a}\n${b}`,'',' ']
 for(const value of cases){
  const product=parseStagingUserIdsV1(value)!==null
  assert.equal(validValue('uuid_csv',value,'STAGING'),product,JSON.stringify(value))
 }
 assert.equal(validValue('uuid_csv',many(64),'STAGING'),true)
 assert.equal(validValue('uuid_csv',many(65),'STAGING'),false)
})

test('uuid_csv is rejected outside staging even when well formed',()=>{
 for(const target of ['LOCAL','DEV','PROD'])assert.equal(validValue('uuid_csv',a,target),false,target)
})

const staging={PLATFORM_TARGET:'STAGING',NODE_ENV:'production',AUTH_EMAIL_ENABLED:'false',PRODUCT_V1_ENABLED:'true'}
const codes=env=>validateEnvironment(env,env.PLATFORM_TARGET).errors

test('enabled staging admission requires a valid cohort; disabled admission does not',()=>{
 assert.ok(codes({...staging,PRODUCT_STAGING_INTEGRATION:'true'}).includes('MISSING_PRODUCT_STAGING_USER_IDS'))
 assert.ok(codes({...staging,PRODUCT_STAGING_INTEGRATION:'true',PRODUCT_STAGING_USER_IDS:`${a},${a}`}).includes('INVALID_PRODUCT_STAGING_USER_IDS'))
 assert.ok(codes({...staging,PRODUCT_STAGING_INTEGRATION:'true',PRODUCT_STAGING_USER_IDS:'*'}).includes('INVALID_PRODUCT_STAGING_USER_IDS'))
 const ok=codes({...staging,PRODUCT_STAGING_INTEGRATION:'true',PRODUCT_STAGING_USER_IDS:`${a},${b}`})
 assert.ok(!ok.some(c=>/PRODUCT_STAGING|STAGING_ADMISSION/.test(c)),ok.join(','))
 assert.ok(!codes({...staging,PRODUCT_STAGING_INTEGRATION:'false'}).some(c=>/PRODUCT_STAGING/.test(c)))
 assert.ok(codes({...staging,PRODUCT_STAGING_INTEGRATION:'TRUE',PRODUCT_STAGING_USER_IDS:a}).includes('INVALID_PRODUCT_STAGING_INTEGRATION'))
})

test('staging admission is forbidden in every other target and never echoes values',()=>{
 for(const target of ['LOCAL','DEV','PROD']){
  const r=validateEnvironment({PLATFORM_TARGET:target,PRODUCT_STAGING_INTEGRATION:'true',PRODUCT_STAGING_USER_IDS:a},target)
  assert.ok(r.errors.includes('STAGING_ADMISSION_OUTSIDE_STAGING'),target)
  assert.ok(r.errors.includes('INVALID_PRODUCT_STAGING_USER_IDS'),target)
  assert.ok(!JSON.stringify(r).includes(a))
 }
})

test('inventory declares both admission bindings staging-only with the product contract semantics',()=>{
 const entries=new Map(inventory().entries.map(e=>[e.name,e]))
 const flag=entries.get('PRODUCT_STAGING_INTEGRATION'),ids=entries.get('PRODUCT_STAGING_USER_IDS')
 assert.deepEqual(flag.target,['STAGING']);assert.equal(flag.type,'boolean');assert.equal(flag.secret,false)
 assert.deepEqual(ids.target,['STAGING']);assert.equal(ids.type,'uuid_csv');assert.equal(ids.secret,true)
 assert.deepEqual(ids.required_when,{name:'PRODUCT_STAGING_INTEGRATION',equals:'true'})
 assert.ok(entries.has('OPENAI_PROJECT_ID'),'still consumed by scripts/assistant/eval-live-v2.ts')
 assert.ok(!entries.has('AI_PROVIDER'),'no remaining runtime consumer')
})
