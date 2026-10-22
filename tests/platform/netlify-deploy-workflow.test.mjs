import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'

const yaml=createRequire(import.meta.url)('js-yaml')
const source=readFileSync(new URL('../../.github/workflows/w5-netlify-staging-deploy.yml',import.meta.url),'utf8')
const wf=yaml.load(source)
const steps=job=>wf.jobs[job].steps
const text=value=>JSON.stringify(value)

test('manual only, serialized, read-only token',()=>{
 assert.deepEqual(Object.keys(wf.on),['workflow_dispatch'])
 assert.deepEqual(wf.permissions,{contents:'read',actions:'read'})
 assert.equal(wf.concurrency['cancel-in-progress'],false)
})

test('source gates run before and without any secret, and never degrade to a warning',()=>{
 const verify=wf.jobs['verify-source']
 assert.equal(verify.environment,undefined)
 assert.ok(!text(verify).includes('secrets.'))
 const gates=text(steps('verify-source'))
 for(const gate of ['owned-consumer-migration-profile87.test.mjs','inventory.mjs --check','platform.mjs verify','npm run typecheck','rev-parse HEAD^{tree}'])assert.ok(gates.includes(gate),gate)
 assert.ok(!/::warning::/.test(source),'no gate may downgrade to a warning')
 assert.ok(text(steps('verify-source')).includes('lacks the profile87 closure test'))
})

test('deploy and rollback read secrets only inside the protected staging environment',()=>{
 for(const job of ['deploy','rollback']){assert.equal(wf.jobs[job].environment,'staging');assert.ok(text(wf.jobs[job]).includes('secrets.NETLIFY_AUTH_TOKEN'))}
 assert.deepEqual(wf.jobs.deploy.needs,'verify-source')
})

test('deploy re-checks the reviewed tree, pins adapter and CLI by integrity, and binds smoke checks to its own deploy',()=>{
 const deploy=text(steps('deploy'))
 assert.ok(deploy.includes('rev-parse HEAD^{tree}'))
 assert.match(wf.env.NETLIFY_CLI_INTEGRITY,/^sha512-[A-Za-z0-9+/]{86}==$/)
 assert.match(wf.env.NEXT_ADAPTER_INTEGRITY,/^sha512-[A-Za-z0-9+/]{86}==$/)
 assert.match(wf.env.NEXT_ADAPTER_VERSION,/^\d+\.\d+\.\d+$/);assert.match(wf.env.NETLIFY_CLI_VERSION,/^\d+\.\d+\.\d+$/)
 assert.ok(deploy.includes('d.site_id!==site'),'deploy.json must belong to the configured site')
 assert.ok(deploy.includes('DEPLOY_URL')&&deploy.includes('getDeploy'),'smoke must use the new deploy permalink and its state')
 assert.ok(deploy.includes('[ \\"$code\\" = \\"401\\" ]'))
})

test('rollback republishes a recorded deploy without rebuilding',()=>{
 const rollback=text(steps('rollback'))
 assert.ok(rollback.includes('restoreSiteDeploy'));assert.ok(!rollback.includes('--build'))
 assert.ok(rollback.includes('[0-9a-f]{24}'))
})

test('every third-party action is pinned to a full commit SHA',()=>{
 const uses=[...source.matchAll(/uses:\s*(\S+)/g)].map(m=>m[1])
 assert.ok(uses.length>0)
 for(const ref of uses)assert.match(ref,/^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/,ref)
})

test('eligibility runs from the trusted workflow ref before the candidate is checked out',()=>{
 const list=steps('verify-source'),names=list.map(s=>s.name??'')
 const trusted=names.indexOf('Trusted eligibility policy (workflow ref)'),gate=list.findIndex(s=>(s.run??'').includes('deploy-eligibility.mjs')),candidate=names.indexOf('Exact reviewed source')
 assert.ok(trusted>=0&&gate>trusted&&candidate>gate)
 assert.equal(list[trusted].with.path,'trusted');assert.equal(list[trusted].with.ref,undefined)
 assert.ok(list[gate].run.includes('policy=trusted/infra/platform/staging-deploy-policy.json')&&list[gate].run.includes('node trusted/scripts/platform/deploy-eligibility.mjs evaluate'))
 assert.ok(!text(list[gate]).includes('secrets.'))
 assert.equal(list[candidate].with.ref,'${{ inputs.sha }}')
})
