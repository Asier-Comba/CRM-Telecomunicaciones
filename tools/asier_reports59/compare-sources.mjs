import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
const git = (...args) => execFileSync('git', ['-c', `safe.directory=${root.replaceAll('\\','/')}`, ...args], { cwd:root, maxBuffer:32*1024*1024 })
const show = (ref,path) => git('show', `${ref}:${path}`)
const hash = value => createHash('sha256').update(value).digest('hex')
const refs = {
  previous191: 'acb70a692c7ccc07421c27f8815a9f2a91287232',
  candidate191: '3e98b55aec0ab38c3a17974927ec43afd3678b87',
  storage179: 'd9799f6610c9841528040c6437f3a51cea4ee386',
}
const paths = [
  'src/features/portfolio/IntegratedPortfolio.tsx', 'src/features/reports/IntegratedReports.tsx',
  'src/features/product/integration/Provider.tsx', 'src/features/product/integration/repository.ts',
  'src/lib/server/product-dashboard-runtime-v2.ts', 'src/features/reports/TelecomReports.tsx',
  'scripts/security/supabase-local/product-reports-browser.mjs',
  'scripts/security/supabase-local/product-portfolio-reference-read.mjs',
  'scripts/security/supabase-local/product-browser-acceptance.mjs',
  'scripts/security/supabase-local/product-billing-uncertain-browser.mjs',
  'scripts/security/supabase-local/acceptance.mjs', 'scripts/security/supabase-local/run-stack.mjs',
  '.github/workflows/supabase-local.yml',
]
const sources = Object.fromEntries(Object.entries(refs).map(([name,ref]) => {
  const lock = JSON.parse(show(ref,'package-lock.json'))
  const browser = show(ref,'scripts/security/supabase-local/product-browser-acceptance.mjs').toString()
  const suffix = browser.indexOf('async function check(name, action)')
  if(suffix<0)throw Error('CHECK_BOUNDARY_NOT_FOUND')
  return [name, { sha:ref, tree:git('rev-parse',`${ref}^{tree}`).toString().trim(),
    migration_count:git('ls-tree','-r','--name-only',ref,'--','supabase/migrations').toString().trim().split('\n').length,
    lock_versions:Object.fromEntries(['next','zod','react','@playwright/test','@supabase/ssr','@supabase/supabase-js'].map(p=>[p,lock.packages['node_modules/'+p]?.version??null])),
    canonical_blob_sha256:Object.fromEntries(paths.map(path=>[path,hash(show(ref,path))])),
    browser_from_check_function_to_cleanup_sha256:hash(browser.slice(suffix)),
  }]
}))
const safe = path => JSON.parse(readFileSync(path))
const accepted = safe(resolve(root,'../../outputs/Integration-2026-10-26/unit59/w5-comparison/extracted/w4-supabase-safe-evidence.json'))
const current = safe(resolve(root,'../../outputs/Integration-2026-10-26/evidence/supabase-safe-final/w4-supabase-safe-evidence.json'))
const previous = safe(resolve(root,'../../outputs/Integration-2026-10-26/evidence/supabase-safe/w4-supabase-safe-evidence.json'))
const expected = [refs.previous191, refs.candidate191, refs.storage179]
const observations=[previous,current,accepted].map((report,index)=>{
  // Actions may execute the synthetic merge SHA; the separate artifact/run binding
  // establishes head identity. Keep the evidence SHA instead of substituting it.
  const timings=report.w2_ui_check_timings??[]
  return {head:expected[index],evidence_sha:report.sha,migrations:report.migration_count,
    result:report.result,teardown:report.teardown,auth:report.auth,
    w1_backend_checks:report.w1_backend_checks,w2_backend_checks:report.w2_backend_takeover_checks,
    timings:timings.map(({check,elapsed_ms,result})=>({check,elapsed_ms,result})),
    failures:report.w2_ui_failure_details??[],
    server_exit:report.w2_ui_server_exit??null,
  }
})
const result={kind:'BOUNDED_SOURCE_AND_EXISTING_ACCEPTANCE_COMPARISON_NOT_CAUSE_PROOF',sources,
  comparisons:Object.keys(refs).slice(1).map(key=>({from:refs.previous191,to:refs[key],
    changed_files:git('diff','--no-renames','--name-only',refs.previous191,refs[key]).toString().trim().split('\n').filter(Boolean)})),
  evidence:observations,
  exact_browser_order_equal:observations.every(x=>JSON.stringify(x.timings.map(y=>y.check))===JSON.stringify(observations[0].timings.map(y=>y.check))),
  interpretation:'Same report/portfolio source and check-to-cleanup suffix do not establish equal Next startup, runner load or random identities. No response/epoch correlation for original F5; no common cause proven. Storage contract and acceptances stay separate.',
}
const output=process.argv[2]
if(!output)throw Error('OUTPUT_REQUIRED')
writeFileSync(output,JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({sources,order_equal:result.exact_browser_order_equal,acceptance:observations.map(x=>({head:x.head,evidence_sha:x.evidence_sha,total:x.timings.length,pass:x.timings.filter(y=>y.result==='PASS').length,fail:x.timings.filter(y=>y.result==='FAIL').length}))},null,2))
