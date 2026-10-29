import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,realpath,writeFile,readFile,rm,chmod,symlink,link} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,dirname,basename} from 'node:path'
import {createHash} from 'node:crypto'
import {fixedGitProducerCommandV1,parseGitMetadataCapturesV1,gitExecutableMetadataPreflightV1} from './git-producer-preflight.mjs'

const linux={skip:process.platform!=='linux'?'FD-pinned executable fixture requires Linux':false}
const version='2.56.0',valid={version:Buffer.from('git version '+version+'\n'),flagVersion:Buffer.from('git version '+version+'\n'),help:Buffer.from('usage: git cat-file --batch[=<format>] --batch-check[=<format>]'),expectedVersion:version}
const safe=error=>!error.message.includes('PRIVATE_SYNTHETIC')
async function fixture(t,{behavior='normal',mode=0o700}={}){
 const parent=await realpath(tmpdir()),root=await realpath(await mkdtemp(join(parent,'crm-git-metadata-synthetic-')))
 assert.equal(dirname(root),parent);assert.ok(basename(root).startsWith('crm-git-metadata-synthetic-'))
 t.after(()=>rm(root,{force:true,recursive:true}))
 const path=join(root,'git.fixture')
 const script='#!'+process.execPath+'\n'+`
 const args=process.argv.slice(2),behavior=${JSON.stringify(behavior)};
 const error=()=>{process.stderr.write('PRIVATE_SYNTHETIC_PROBE');process.exit(1)};
 let input=0;process.stdin.on('data',b=>input+=b.length);process.stdin.resume();
 process.stdin.on('end',()=>{
  if(input||process.cwd()!=='/'||Object.keys(process.env).some(k=>k.startsWith('W4_SYNTHETIC_')))return error();
  if(behavior==='timeout'){setTimeout(error,10000);return}
  if(behavior==='overflow'){process.stdout.end(Buffer.alloc(70000,65));return}
  if(behavior==='failure')return error();
  if(behavior==='mutation')require('node:fs').appendFileSync(__filename,'\\n');
  if(JSON.stringify(args)===JSON.stringify(['--version'])||JSON.stringify(args)===JSON.stringify(['--no-lazy-fetch','--no-replace-objects','--no-optional-locks','--no-pager','--version'])){
   process.stdout.write(behavior==='bad-version'?'PRIVATE_SYNTHETIC_VERSION':'git version 2.56.0\\n');return;
  }
  if(JSON.stringify(args)===JSON.stringify(['cat-file','-h'])){
   process.stderr.write(behavior==='missing-help'?'PRIVATE_SYNTHETIC_HELP':'usage: git cat-file --batch[=<format>] --batch-check[=<format>]');process.exitCode=129;return;
  }
  error();
 });
 `
 await writeFile(path,script,{mode});const sha=createHash('sha256').update(Buffer.from(script)).digest('hex')
 return{root,path,sha,run:extra=>gitExecutableMetadataPreflightV1({mode:'EXECUTABLE_METADATA_ONLY',executable:path,expectedSha256:sha,expectedVersion:version,...extra})}
}

test('fixed batch arguments retain a repository path as one argument and never include object input',()=>{
 const command=fixedGitProducerCommandV1('/private/synthetic repo'),argv=command.argv()
 assert.deepEqual(argv.slice(0,4),['--no-lazy-fetch','--no-replace-objects','--no-optional-locks','--no-pager'])
 assert.deepEqual(argv.slice(-4),['-C','/private/synthetic repo','cat-file','--batch']);assert.equal(argv.includes('fetch'),false);assert.equal(argv.includes('--filters'),false)
 assert.ok(argv.includes('protocol.allow=never'));assert.ok(argv.includes('credential.helper='));assert.equal(JSON.stringify(command),'{}')
 argv[0]='PRIVATE_SYNTHETIC_MUTATION';assert.equal(command.argv()[0],'--no-lazy-fetch')
})
test('relative URL control and noncanonical repository paths cannot build a command',()=>{
 for(const path of ['/',undefined,'repo','https://PRIVATE_SYNTHETIC/','/private/../escape','/private/./repo','/private//repo','/private/repo/','/private/line\nrepo','/private/line\0repo','C:\\private\\repo'])assert.throws(()=>fixedGitProducerCommandV1(path),safe)
})
test('command environment is newly constructed and cannot inherit or mutate credentials/config',()=>{
 const command=fixedGitProducerCommandV1('/private/synthetic'),env=command.environment()
 assert.deepEqual(Object.keys(env).sort(),['LC_ALL','GIT_CONFIG_NOSYSTEM','GIT_CONFIG_SYSTEM','GIT_CONFIG_GLOBAL','GIT_TERMINAL_PROMPT','GIT_NO_LAZY_FETCH','GIT_NO_REPLACE_OBJECTS','GIT_OPTIONAL_LOCKS'].sort())
 env.PATH='PRIVATE_SYNTHETIC';env.GIT_NO_LAZY_FETCH='0';assert.equal(command.environment().PATH,undefined);assert.equal(command.environment().GIT_NO_LAZY_FETCH,'1');assert.equal(Object.isFrozen(command),true)
})
test('metadata parser accepts exact version and advertised batch forms without returning help text',()=>{
 assert.deepEqual(parseGitMetadataCapturesV1(valid),{version,global_flags_accepted:true,batch_help_advertised:true,batch_check_help_advertised:true})
})
test('mismatched noncanonical versions and malformed captures stay closed and redacted',()=>{
 for(const patch of [{version:Buffer.from('PRIVATE_SYNTHETIC')},{flagVersion:Buffer.from('git version 2.1.0\n')},{expectedVersion:'2.56.0;PRIVATE_SYNTHETIC'},{version:'PRIVATE_SYNTHETIC'},{version:Buffer.alloc(65537)},{help:Buffer.alloc(65537)}])assert.throws(()=>parseGitMetadataCapturesV1({...valid,...patch}),safe)
})
test('batch-command substring alone is not evidence of batch or batch-check support',()=>{
 for(const text of ['--batch-command --batch-check','--batch','PRIVATE_SYNTHETIC','--batch-check'])assert.throws(()=>parseGitMetadataCapturesV1({...valid,help:Buffer.from(text)}),safe)
})
test('ordinary preflight mode performs no filesystem or executable operation',async()=>{
 for(const mode of [undefined,'ORDINARY','PINNED_REAL']){
  const result=await gitExecutableMetadataPreflightV1({mode,executable:'/not-opened'})
  assert.equal(result.result,'NOT_RUN');assert.equal(result.probes_attempted,0);assert.equal(result.real_history_authorized,false)
 }
})
test('invalid enrollment and budget are rejected before host/executable probes',async()=>{
 const base={mode:'EXECUTABLE_METADATA_ONLY',executable:'/not-opened',expectedSha256:'a'.repeat(64),expectedVersion:version}
 for(const patch of [{expectedSha256:'PRIVATE_SYNTHETIC'},{expectedVersion:'x'},{probeMilliseconds:5001},{probeMilliseconds:0},{executable:'relative'}]){
  const result=await gitExecutableMetadataPreflightV1({...base,...patch});assert.equal(result.result,'BLOCKED');assert.equal(result.error,'GIT_PREFLIGHT_CONTRACT_INVALID');assert.equal(result.probes_attempted,0)
 }
})
test('unavailable executable never creates repository or historical authority',async()=>{
 const result=await gitExecutableMetadataPreflightV1({mode:'EXECUTABLE_METADATA_ONLY',executable:'/not-existing-synthetic-executable',expectedSha256:'a'.repeat(64),expectedVersion:version})
 assert.equal(result.result,'BLOCKED');assert.equal(result.probes_attempted,0);assert.equal(result.repository_verified,false);assert.equal(result.real_history_authorized,false)
})
test('Linux metadata-only fixture executes three fixed probes with empty stdin and clean environment',linux,async t=>{
 const f=await fixture(t);process.env.W4_SYNTHETIC_INHERIT_CANARY='PRIVATE_SYNTHETIC'
 let result;try{result=await f.run()}finally{delete process.env.W4_SYNTHETIC_INHERIT_CANARY}
 assert.equal(result.result,'EXECUTABLE_METADATA_CHECKED');assert.equal(result.probes_attempted,3);assert.equal(result.executable_sha256,f.sha);assert.equal(result.real_history_authorized,false);assert.equal(result.repository_verified,false)
 assert.equal(JSON.stringify(result).includes(f.path),false);assert.equal(JSON.stringify(result).includes('PRIVATE_SYNTHETIC'),false)
})
test('Linux mismatched binary hash prevents every command',linux,async t=>{
 const f=await fixture(t),result=await f.run({expectedSha256:'f'.repeat(64)})
 assert.equal(result.error,'GIT_EXECUTABLE_PIN_MISMATCH');assert.equal(result.probes_attempted,0)
})
test('Linux symlink hardlink writable and nonexecutable candidates fail before invocation',linux,async t=>{
 for(const kind of ['symlink','hardlink','writable','not-executable']){
  const f=await fixture(t);let executable=f.path
  if(kind==='symlink'){executable=join(f.root,'alias');await symlink(f.path,executable)}
  if(kind==='hardlink')await link(f.path,join(f.root,'second'))
  if(kind==='writable')await chmod(f.path,0o722)
  if(kind==='not-executable')await chmod(f.path,0o600)
  const result=await f.run({executable});assert.equal(result.result,'BLOCKED');assert.equal(result.probes_attempted,0)
 }
})
test('Linux invalid version help or process errors are fixed codes without private output',linux,async t=>{
 for(const behavior of ['bad-version','missing-help','failure']){
  const f=await fixture(t,{behavior}),result=await f.run()
  assert.equal(result.result,'BLOCKED');assert.equal(JSON.stringify(result).includes('PRIVATE_SYNTHETIC'),false)
 }
})
test('Linux overflow and timeout terminate metadata probes without retaining output',linux,async t=>{
 for(const [behavior,error] of [['overflow','GIT_METADATA_OUTPUT_LIMIT'],['timeout','GIT_METADATA_TIMEOUT']]){
  const f=await fixture(t,{behavior}),result=await f.run({probeMilliseconds:500})
  assert.equal(result.result,'BLOCKED');assert.equal(result.error,error);assert.equal(result.probes_attempted,1);assert.equal(JSON.stringify(result).includes('PRIVATE_SYNTHETIC'),false)
 }
})
test('Linux candidate mutation during a probe invalidates retained executable identity',linux,async t=>{
 const f=await fixture(t,{behavior:'mutation'}),result=await f.run()
 assert.equal(result.result,'BLOCKED');assert.equal(result.error,'GIT_EXECUTABLE_CHANGED');assert.equal(result.probes_attempted,1);assert.notEqual(createHash('sha256').update(await readFile(f.path)).digest('hex'),f.sha)
})
