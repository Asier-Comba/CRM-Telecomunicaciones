import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync,mkdirSync,writeFileSync,rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { portability } from '../../scripts/platform/portability-gate.mjs'
test('portability rejects runtime project/personal literals while excluding examples in comments',()=>{const root=mkdtempSync(join(tmpdir(),'w4-portable-'));mkdirSync(join(root,'src'));try{const file=join(root,'src/config.ts');for(const text of ['const url="https://abcdefghijklmnopqrst.supabase.co"','const owner="synthetic@gmail.com"','const DEVELOPER_USER_ID="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"']){writeFileSync(file,text);assert.equal(portability(root).result,'FAIL')}writeFileSync(file,'// old example synthetic@gmail.com\n/* https://abcdefghijklmnopqrst.supabase.co */\nconst owner = process.env.COMPANY_OWNER');assert.equal(portability(root).result,'PASS')}finally{rmSync(root,{recursive:true,force:true})}})
