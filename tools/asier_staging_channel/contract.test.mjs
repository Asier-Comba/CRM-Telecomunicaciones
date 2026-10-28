import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {publicBuildIdentity,imageTag,imageRepository,validateReceipt,channelReadiness,destination} from './contract.mjs'
const source='a'.repeat(40),tree='b'.repeat(40),h='c'.repeat(64)
const values={NEXT_PUBLIC_APP_URL:'https://staging.example.invalid',NEXT_PUBLIC_SUPABASE_URL:'https://db.example.invalid',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_SYNTHETIC_ONLY_123456789'}
test('build identity binds each exact public value; aliases, secret keys and extra inputs fail',()=>{
 const first=publicBuildIdentity(values)
 for(const field of Object.keys(values))assert.notEqual(publicBuildIdentity({...values,[field]:field.endsWith('KEY')?values[field]+'x':values[field]+'.example'}),first)
 for(const bad of [{...values,SUPABASE_SERVICE_ROLE_KEY:'synthetic'},{...values,NEXT_PUBLIC_SUPABASE_ANON_KEY:'synthetic'},{...values,NEXT_PUBLIC_APP_URL:'http://localhost:3000'},{...values,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_secret_synthetic'}])assert.throws(()=>publicBuildIdentity(bad),/STAGING_PUBLIC_BINDINGS_INVALID/)
 const jwt=role=>['e30',Buffer.from(JSON.stringify({role})).toString('base64url'),'synthetic'].join('.')
 assert.equal(typeof publicBuildIdentity({...values,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:jwt('anon')}),'string')
 assert.throws(()=>publicBuildIdentity({...values,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:jwt('service_role')}))
})
test('tags bind full source and full public configuration; digest receipt rejects config ID confusion',()=>{
 assert.equal(imageTag(source,h),`${imageRepository}:sha-${source}-config-${h}`)
 for(const bad of ['main','latest',source.slice(0,7),'$(synthetic)'])assert.throws(()=>imageTag(bad,h))
 const expected={source,tree,lockfile_sha256:h,dockerfile_sha256:h,public_build_sha256:h},receipt={version:'staging.image.receipt.v1',...expected,image_config_digest:'sha256:'+'d'.repeat(64),manifest_digest:'sha256:'+'e'.repeat(64),image_reference:imageRepository+'@sha256:'+'e'.repeat(64),visibility:'private'}
 assert.deepEqual(validateReceipt(receipt,expected),receipt)
 for(const delta of [{image_reference:imageTag(source,h)},{image_reference:imageRepository+'@'+receipt.image_config_digest},{visibility:'public'},{source:'f'.repeat(40)},{public_build_sha256:'f'.repeat(64)},{manifest_digest:'IMAGE_BUILT'},{extra:'synthetic'}])assert.throws(()=>validateReceipt({...receipt,...delta},expected))
})
test('all seven independent gates stay closed; a report never grants publish or deploy authority',()=>{
 const blocked=channelReadiness({runtimePolicy:{status:'PROPOSED',reviews:{w2:'PENDING',w5:'PENDING',w4:'PENDING'}}})
 assert.equal(blocked.status,'BLOCKED');assert.equal(blocked.blockers.length,7)
 const report=channelReadiness({runtimePolicy:{status:'ACCEPTED',reviews:{w2:'ACCEPTED',w5:'ACCEPTED',w4:'ACCEPTED'}},originAccepted:true,publicBindingAccepted:true,networkAccepted:true,privateAccessAccepted:true,schemaAccepted:true,independentReleaseAccepted:true})
 assert.equal(report.status,'REQUIRES_EXISTING_PROMOTION_GATE');assert.equal(report.publishing_authorized,false);assert.equal(report.deploying_authorized,false)
 assert.deepEqual(destination,{project:'crm-inmobiliario',service:'crm-telecom-staging',port:3000})
})
test('publication workflow is manual and inert pending exact review, with no VPS credential or alternate entrypoint',()=>{
 const text=readFileSync(new URL('../../.github/workflows/private-staging-channel.yml',import.meta.url),'utf8')
 assert.match(text,/workflow_dispatch:/);assert.doesNotMatch(text,/pull_request_target:|packages: write|:latest(?:\s|$)|EASYPANEL_TOKEN|server\.js|APP_ENV: (local|dev)/)
 assert.match(text,/if: false/);assert.match(text,/infra\/deployment\/Dockerfile/);assert.match(text,/scripts\/platform\/promotion\.mjs/)
})
