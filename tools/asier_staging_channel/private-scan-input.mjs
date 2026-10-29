import {open,lstat,readdir,unlink,rmdir,mkdtemp} from 'node:fs/promises'
import {constants} from 'node:fs'
import {isAbsolute,normalize,sep} from 'node:path'
import {createHash} from 'node:crypto'

// Linux /proc descriptor-relative traversal. The trusted euid (and root) must
// not concurrently modify these private inputs. No protection against root or
// hostile code sharing that euid is claimed. No network/process. Reader APIs do
// not write; the explicit nonce transfer construction helper is isolated below.
const sessions=new WeakSet()
const reject=()=>{throw Error('PRIVATE_INPUT_BLOCKED')}
const same=(a,b)=>['dev','ino','size','mtimeNs','ctimeNs','mode','uid','nlink'].every(k=>a[k]===b[k])
const fdpath=h=>'/proc/self/fd/'+h.fd
const flags=constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK
const privateStat=(s,directory)=>s.uid===BigInt(process.geteuid())&&
 (s.mode&0o7777n)===(directory?0o700n:0o600n)&&
 (directory?s.isDirectory():s.isFile()&&s.nlink===1n)

async function directory(path){
 if(process.platform!=='linux'||typeof process.geteuid!=='function'||!constants.O_NOFOLLOW||!constants.O_DIRECTORY)reject()
 if(typeof path!=='string'||!isAbsolute(path)||normalize(path)!==path||path==='/'||path.includes('\0')||path.includes('\\'))reject()
 let current=await open('/',flags|constants.O_DIRECTORY)
 const acquired=new Set([current])
 try{
  for(const part of path.split(sep).filter(Boolean)){
   const next=await open(fdpath(current)+'/'+part,flags|constants.O_DIRECTORY)
   acquired.add(next);await current.close();acquired.delete(current);current=next
  }
  const stat=await current.stat({bigint:true})
  if(!privateStat(stat,true))reject()
  return{handle:current,stat,path}
 }catch{for(const handle of acquired)try{await handle.close()}catch{}reject()}
}

// Session is process-local, never accepted from a JSON "verified" flag. Every
// directory component is opened without following symlinks; children are then
// reached only through the retained parent descriptor, not a mutable path.
export async function openPrivateScanInputV1(path,{historyNames}={}){
 let root;const dirs=new Map(),files=new Map(),acquired=new Set();let closed=false,consumed=false
 try{
  root=await directory(path);acquired.add(root.handle);dirs.set('',root)
  const history=historyNames!==undefined
  if(history&&(!Array.isArray(historyNames)||historyNames.length!==3||new Set(historyNames).size!==3||historyNames.some(n=>!/^[a-f0-9]{40}$/.test(n))))reject()
  if(history){const names=await readdir(fdpath(root.handle));if(names.length!==3||names.some(n=>!historyNames.includes(n)))reject()}
  async function dir(relative){
   if(dirs.has(relative))return dirs.get(relative)
   const parent=relative==='blobs'?'':'blobs',name=relative==='blobs'?'blobs':'sha256'
   const p=await dir(parent),handle=await open(fdpath(p.handle)+'/'+name,flags|constants.O_DIRECTORY)
   acquired.add(handle)
   try{
    const stat=await handle.stat({bigint:true})
    if(!privateStat(stat,true)||stat.dev!==root.stat.dev)reject()
    const value={handle,stat};dirs.set(relative,value);return value
   }catch{try{await handle.close();acquired.delete(handle)}catch{}reject()}
  }
  async function file(relative,max){
   if(closed||!Number.isSafeInteger(max)||max<1||max>1024**3)reject()
   const valid=history?historyNames.includes(relative):relative==='oci-layout'||relative==='index.json'||/^blobs\/sha256\/[a-f0-9]{64}$/.test(relative)
   if(!valid)reject()
   if(files.has(relative)){const value=files.get(relative);if(value.stat.size>BigInt(max)||!same(value.stat,await value.handle.stat({bigint:true})))reject();return value}
   if(files.size>=512||acquired.size>=515)reject()
   const slash=relative.lastIndexOf('/'),parent=slash<0?'':relative.slice(0,slash),name=relative.slice(slash+1),p=await dir(parent)
   const handle=await open(fdpath(p.handle)+'/'+name,flags)
   acquired.add(handle)
   try{
    const stat=await handle.stat({bigint:true})
    if(!privateStat(stat,false)||stat.dev!==root.stat.dev||stat.size<1n||stat.size>BigInt(max))reject()
    const value={handle,stat,parent:p,name};files.set(relative,value);return value
   }catch{try{await handle.close();acquired.delete(handle)}catch{}reject()}
  }
  const session={
   async *chunks(relative,max){
    const f=await file(relative,max);let position=0
    try{
     while(position<Number(f.stat.size)){
      const bytes=Buffer.alloc(Math.min(65536,Number(f.stat.size)-position))
      const {bytesRead}=await f.handle.read(bytes,0,bytes.length,position)
      if(!bytesRead)reject();position+=bytesRead
      try{yield bytes.subarray(0,bytesRead)}finally{bytes.fill(0)}
     }
     if(!same(f.stat,await f.handle.stat({bigint:true})))reject()
    }catch{reject()}
   },
   async read(relative,max){
    if(max>1024*1024)reject()
    const parts=[];let result
    try{for await(const part of session.chunks(relative,max))parts.push(Buffer.from(part));result=Buffer.concat(parts);return result}
    finally{for(const b of parts)b.fill(0)}
   },
   async verify(){
    if(closed||consumed)reject()
    for(const d of dirs.values())if(!same(d.stat,await d.handle.stat({bigint:true})))reject()
    for(const f of files.values())if(!same(f.stat,await f.handle.stat({bigint:true})))reject()
    return true
   },
   // Explicit one-shot transfer ownership only. Never recursively delete or
   // remove OCI input. Do not unlink replacements or unexpected files.
   async consumeHistory(){
    if(!history||closed||consumed)reject()
    let ok=true
    for(const name of historyNames){
     try{const f=await file(name,1024*1024),p=fdpath(root.handle)+'/'+name,s=await lstat(p,{bigint:true});if(!same(f.stat,s))reject();await unlink(p)}catch{ok=false}
    }
    consumed=true
    try{if((await readdir(fdpath(root.handle))).length!==0)reject();const s=await lstat(root.path,{bigint:true});if(s.dev!==root.stat.dev||s.ino!==root.stat.ino||!privateStat(s,true))reject();await rmdir(root.path)}catch{ok=false}
    if(!ok)reject();return true
   },
   async close(){
    if(closed)return;closed=true;let bad=false
    for(const handle of [...acquired].reverse())try{await handle.close()}catch{bad=true}
    acquired.clear()
    if(bad)reject()
   }
  }
  // Pin all three transfer files before any extraction. Opening errors still
  // close every acquired handle; ownership is not silently assumed.
  if(history)for(const name of historyNames)await file(name,1024*1024)
  sessions.add(session);return session
 }catch{
  for(const handle of [...acquired].reverse())try{await handle.close()}catch{}
  reject()
 }
}
export const isPrivateScanInputV1=value=>sessions.has(value)

// Low-level owned transfer construction. No Git/retrieval or history acceptance.
// The synthetic public controller rejects real pinned object identities before
// reaching this writer. This helper itself never creates a producer authority.
export async function withPrivateTransferFilesV1({parent,objects,consume}={}){
 const report={result:'BLOCKED',cleanup:'NOT_STARTED',error:'PRIVATE_TRANSFER_BLOCKED',files_written:0,publishing_authorized:false,security_accepted:false}
 const owned=[],names=[],records=[],acquired=new Set();let root,child,name,ready=false,clean=true
 try{
  if(typeof consume!=='function'||!Array.isArray(objects)||objects.length!==3)reject()
  for(const row of objects){
   const id=row?.id,value=row?.bytes
   if(typeof id!=='string'||!/^[a-f0-9]{40}$/.test(id)||!Buffer.isBuffer(value)||value.length<1||value.length>1024*1024)reject()
   const bytes=Buffer.from(value);owned.push(bytes);names.push(id)
   if(createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex')!==id)reject()
  }
  if(new Set(names).size!==3)reject()
  root=await directory(parent);acquired.add(root.handle)
  const created=await mkdtemp(fdpath(root.handle)+'/history-transfer-');name=created.slice(created.lastIndexOf('/')+1)
  report.cleanup='PENDING'
  child=await open(fdpath(root.handle)+'/'+name,flags|constants.O_DIRECTORY);acquired.add(child)
  const childIdentity=await child.stat({bigint:true})
  if(!privateStat(childIdentity,true)||childIdentity.dev!==root.stat.dev)reject()
  for(let i=0;i<owned.length;i++){
   const handle=await open(fdpath(child)+'/'+names[i],constants.O_RDWR|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600)
   acquired.add(handle)
   const createdIdentity=await handle.stat({bigint:true}),record={id:names[i],stat:createdIdentity};records.push(record)
   if(!privateStat(createdIdentity,false)||createdIdentity.dev!==root.stat.dev)reject()
   try{
    await handle.writeFile(owned[i]);await handle.sync();record.stat=await handle.stat({bigint:true})
    if(!privateStat(record.stat,false)||record.stat.dev!==root.stat.dev||record.stat.ino!==createdIdentity.ino||record.stat.size!==BigInt(owned[i].length))reject()
   }finally{
    // A partial own write must still be eligible for identity-checked cleanup.
    try{const latest=await handle.stat({bigint:true});if(privateStat(latest,false)&&latest.dev===createdIdentity.dev&&latest.ino===createdIdentity.ino)record.stat=latest}catch{}
   }
   await handle.close();acquired.delete(handle);report.files_written++
  }
  const namedRoot=await lstat(root.path,{bigint:true}),namedChild=await lstat(root.path+'/'+name,{bigint:true})
  if(namedRoot.dev!==root.stat.dev||namedRoot.ino!==root.stat.ino||!privateStat(namedRoot,true)||namedChild.dev!==childIdentity.dev||namedChild.ino!==childIdentity.ino||!privateStat(namedChild,true))reject()
  ready=await consume(root.path+'/'+name)===true
 }catch{ready=false}
 finally{
  if(root&&name){
   if(child){
    for(const row of records){
     try{const path=fdpath(child)+'/'+row.id,s=await lstat(path,{bigint:true});if(!same(row.stat,s))reject();await unlink(path)}catch(error){if(error?.code!=='ENOENT')clean=false}
    }
    try{
     if((await readdir(fdpath(child))).length!==0)reject()
     const path=fdpath(root.handle)+'/'+name,s=await lstat(path,{bigint:true}),original=await child.stat({bigint:true})
     if(s.dev!==original.dev||s.ino!==original.ino||!privateStat(s,true))reject()
     await rmdir(path)
     try{await lstat(path);reject()}catch(error){if(error?.code!=='ENOENT')throw error}
     if((await child.stat({bigint:true})).nlink!==0n)reject()
    }catch(error){
     // A consumer may already remove the original owned directory; verify
     // its retained inode is unlinked, never delete a replacement path.
     try{if(error?.code!=='ENOENT'||(await child.stat({bigint:true})).nlink!==0n)clean=false}catch{clean=false}
    }
   }else clean=false
   report.cleanup=clean?'PASS':'FAIL'
  }
  for(const handle of [...acquired].reverse())try{await handle.close()}catch{clean=false;report.cleanup='FAIL'}
  for(const bytes of owned)bytes.fill(0)
 }
 if(ready&&clean&&report.cleanup==='PASS'){report.result='SYNTHETIC_TRANSFER_PASS';report.error=null}
 return report
}
