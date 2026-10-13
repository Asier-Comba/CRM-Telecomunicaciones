// Private native-test consumer: one owned psql connection for a Node worker.
// This does not create/restart a cluster or accept provider/production credentials.
import {spawn,spawnSync} from 'node:child_process'
import {randomBytes} from 'node:crypto'
import {createInterface} from 'node:readline'
import {isExpectedNativeImage} from './expected-image.mjs'

const failure=()=>Error('NATIVE_SESSION_UNAVAILABLE')

/** Framing has no SQL/error/result material in rejected errors or diagnostics. */
export function createFramedFixtureSessionV1(child,terminateOwnedBackend){
 let active=null,closed=false,closePromise
 child.stdout.on('data',chunk=>{
  if(active){active.wireBytes+=chunk.length;if(active.wireBytes>65536)stop()}
 })
 const lines=createInterface({input:child.stdout,crlfDelay:Infinity})
 function stop(){
  if(closed)return
  closed=true
  const pending=active;active=null
  if(pending){clearTimeout(pending.timer);pending.signal?.removeEventListener('abort',pending.abort);pending.reject(failure())}
  child.stdin.destroy()
  // The caller verifies its private application name and database before killing.
  try{terminateOwnedBackend()}catch{/* Keep the closed failure; owner cleanup verifies disappearance. */}
 }
 lines.on('line',line=>{
  const p=active
  if(!p)return
  if(line===p.start){if(p.started)return stop();p.started=true;return}
  if(line===p.end){
   if(!p.started)return stop()
   active=null;clearTimeout(p.timer);p.signal?.removeEventListener('abort',p.abort)
   p.resolve(p.rows.join('\n'));return
  }
  if(p.started){p.bytes+=Buffer.byteLength(line,'utf8')+1;if(p.bytes>32768)return stop();p.rows.push(line)}
 })
 child.stderr.on('data',()=>stop())
 child.stdin.on('error',()=>stop())
 child.stdout.on('error',()=>stop())
 child.stderr.on('error',()=>stop())
 child.on('error',()=>stop())
 child.on('close',()=>{stop();lines.close()})
 return {
  query(sql,signal){
   if(closed||active||signal?.aborted||typeof sql!=='string'||!sql.trim()||Buffer.byteLength(sql,'utf8')>65536||/^\s*\\/m.test(sql))return Promise.reject(failure())
   return new Promise((resolve,reject)=>{
    const tag=randomBytes(16).toString('hex'),start='fixture_start_'+tag,end='fixture_end_'+tag
    const abort=()=>stop(),timer=setTimeout(abort,30000)
    active={start,end,rows:[],bytes:0,wireBytes:0,started:false,resolve,reject,abort,timer,signal}
    signal?.addEventListener('abort',abort,{once:true})
    child.stdin.write(`\\echo ${start}\n${sql.trim()}${sql.trimEnd().endsWith(';')?'':';'}\n\\echo ${end}\n`,error=>{if(error)stop()})
   })
  },
  close(){
   if(closePromise)return closePromise
   closePromise=new Promise(resolve=>{
    if(child.exitCode!==null){stop();lines.close();resolve();return}
    const timer=setTimeout(()=>{stop();child.kill('SIGKILL');lines.close();resolve()},2000)
    child.once('close',()=>{clearTimeout(timer);resolve()})
    if(active)stop();else {closed=true;child.stdin.end('\\q\n')}
   })
   return closePromise
  },
 }
}

export async function openPersistentNativeFixtureSessionV1(){
 const container=process.env.TELECOM_NATIVE_TEST_CONTAINER??''
 if(!/^[0-9a-f]{12,64}$/.test(container))throw failure()
 const image=spawnSync('docker',['inspect','--format={{.Config.Image}}',container],{encoding:'utf8',timeout:10000,maxBuffer:32768})
 if(image.status!==0||!isExpectedNativeImage(image.stdout.trim()))throw failure()
 const database='telecom_test',application='durable_node_'+randomBytes(16).toString('hex')
 const args=['exec','-i','-u','postgres',container,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d',database]
 const child=spawn('docker',args,{stdio:['pipe','pipe','pipe']})
 const session=createFramedFixtureSessionV1(child,()=>{
  // Nonce and database are locally generated constants, never supplied backend IDs.
  spawnSync('docker',args,{encoding:'utf8',timeout:10000,maxBuffer:32768,
   input:`select pg_terminate_backend(pid) from pg_stat_activity where datname='${database}' and application_name='${application}' and pid<>pg_backend_pid();`})
 })
 try{
  const row=JSON.parse(await session.query(`set log_min_error_statement='panic';set log_error_verbosity='terse';set application_name='${application}';select jsonb_build_object('backend',pg_backend_pid(),'database',current_database());`))
  if(!Number.isSafeInteger(row.backend)||row.backend<1||row.database!==database)throw failure()
  return Object.freeze({...session,backend:row.backend,application})
 }catch{await session.close();throw failure()}
}
