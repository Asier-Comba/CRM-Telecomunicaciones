import { readFileSync,readdirSync,existsSync } from 'node:fs'
import { resolve } from 'node:path'
export function portability(root) {
 let scanned=0;const errors=new Set()
 function walk(dir){if(!existsSync(dir))return;for(const ent of readdirSync(dir,{withFileTypes:true})){const path=resolve(dir,ent.name);if(ent.isDirectory())walk(path);else if(/\.(ts|tsx|js|jsx|toml)$/.test(path)){scanned++;const text=readFileSync(path,'utf8').replace(/\/\*[\s\S]*?\*\//g,'').split('\n').filter(l=>!/^\s*(\/\/|#)/.test(l)).join('\n');if(/https?:\/\/[a-z0-9]{20}\.supabase\.co/i.test(text))errors.add('HARDCODED_HOSTED_PROJECT');if(/\b(?:DEVELOPER_USER_ID|DEFAULT_DEVELOPER_ID)\s*[:=]\s*['"][0-9a-f-]{36}['"]/i.test(text))errors.add('DEVELOPER_ID_COUPLING');if(/[a-z0-9._+-]+@(gmail|hotmail|outlook)\.com/i.test(text))errors.add('PERSONAL_EMAIL_IN_ACTIVE_CODE')}}}
 for(const dir of ['src','app'])walk(resolve(root,dir));if(existsSync(resolve(root,'supabase/config.toml'))){scanned++;const text=readFileSync(resolve(root,'supabase/config.toml'),'utf8');if(/https?:\/\/[a-z0-9]{20}\.supabase\.co/i.test(text))errors.add('HARDCODED_HOSTED_PROJECT')}
 return {result:errors.size?'FAIL':'PASS',errors:[...errors].sort(),scannedFiles:scanned,scope:'OBVIOUS_LITERAL_PERSONAL_COUPLING_NOT_SECRET_SCAN'}
}
if(process.argv[1]===new URL(import.meta.url).pathname){const r=portability(process.cwd());console.log(JSON.stringify(r));if(r.errors.length)process.exitCode=1}
