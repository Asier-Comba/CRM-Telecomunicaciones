import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { secretNames } from './policy.mjs'
export function scanClientGraph(root) {
  const files=[]
  let aliasRoot=root
  if(existsSync(resolve(root,'tsconfig.json'))) {
    try { const mapping=JSON.parse(readFileSync(resolve(root,'tsconfig.json'),'utf8')).compilerOptions?.paths?.['@/*']?.[0]; if(mapping?.endsWith('*'))aliasRoot=resolve(root,mapping.slice(0,-1)) } catch { return {errors:['UNREADABLE_ALIAS_POLICY'],clientFilesVisited:0} }
  }
  function walk(dir) { if(!existsSync(dir))return; for(const ent of readdirSync(dir,{withFileTypes:true})) { const p=resolve(dir,ent.name); if(ent.isDirectory())walk(p);else if(/\.[cm]?[jt]sx?$/.test(p))files.push(p) } }
  for(const dir of ['app','components','lib','hooks','src'])walk(resolve(root,dir))
  const errors=new Set(), visited=new Set()
  function visit(file) {
    if(visited.has(file))return;visited.add(file)
    const text=readFileSync(file,'utf8')
    for(const name of secretNames) {
      if(new RegExp(`process\\.env(?:\\.${name}\\b|\\[['\"]${name}['\"]\\])`).test(text) || text.includes(`NEXT_PUBLIC_${name}`))errors.add('CLIENT_SECRET_REFERENCE')
    }
    if(/import\s+['"]server-only['"]/.test(text))errors.add('CLIENT_SERVER_ONLY_IMPORT')
    const matches=text.matchAll(/(?:\b(?:import|export)\s+(?:[^;'"\n]*?\s+from\s*)?|\bimport\s*\()\s*['"]([^'"]+)['"]/g)
    for(const [,spec]of matches) {
      if(!spec.startsWith('.')&&!spec.startsWith('@/'))continue
      const stem=spec.startsWith('@/')?resolve(aliasRoot,spec.slice(2)):resolve(dirname(file),spec)
      const found=[stem,...['.ts','.tsx','.js','.jsx','.mjs','/index.ts','/index.tsx','/index.js'].map(x=>stem+x)].find(x=>existsSync(x)&&statSync(x).isFile())
      if(found)visit(found)
    }
  }
  for(const f of files)if(/^\s*['"]use client['"]/.test(readFileSync(f,'utf8')))visit(f)
  return {errors:[...errors].sort(),scope:'STATIC_LITERAL_IMPORT_AND_ENV_REFERENCE_GUARD',clientFilesVisited:visited.size}
}
if(process.argv[1]===new URL(import.meta.url).pathname) { const r=scanClientGraph(process.cwd()); console.log(JSON.stringify(r));if(r.errors.length)process.exitCode=1 }
