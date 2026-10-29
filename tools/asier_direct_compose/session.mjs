import {lstatSync,openSync,closeSync,readSync,fstatSync,unlinkSync,constants} from 'node:fs'
import {createHash} from 'node:crypto'
import {join} from 'node:path'
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex')
// A preparation lock, not an adversarial-root or transactional-engine guarantee.
// The callback cannot be selected by a CLI flag; no hosted executor is exposed.
export async function protectedSession(directory,expected,callback){
 expected=Object.freeze({...expected})
 const dir=lstatSync(directory)
 if(!dir.isDirectory()||dir.isSymbolicLink()||(dir.mode&0o077)!==0||typeof process.getuid==='function'&&dir.uid!==process.getuid())throw Error('PRIVATE_DIRECTORY_REQUIRED')
 const lock=join(directory,'.crm-direct.lock');let fd
 try{
 fd=openSync(lock,constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY,0o600)
 const verify=()=>{
 for(const [name,hash]of Object.entries(expected)){
 if(!/^[a-zA-Z0-9_.-]+$/.test(name)||! /^[a-f0-9]{64}$/.test(hash))throw Error('INPUT_IDENTITY_INVALID')
 const path=join(directory,name),s=lstatSync(path,{bigint:true})
 const limit=name==='compose-bin'?128*1024*1024:1024*1024
 if(!s.isFile()||s.nlink!==1n||s.uid!==BigInt(dir.uid)||(Number(s.mode)&0o077)!==0||s.size>BigInt(limit))throw Error('PRIVATE_FILE_REQUIRED')
 const input=openSync(path,constants.O_RDONLY|(constants.O_NOFOLLOW??0))
 try{
 const before=fstatSync(input,{bigint:true})
 if(!before.isFile()||before.nlink!==1n||before.ino!==s.ino||before.dev!==s.dev)throw Error('INPUT_IDENTITY_CHANGED')
 const bytes=Buffer.alloc(limit+1);let count=0
 while(count<bytes.length){const n=readSync(input,bytes,count,bytes.length-count,count);if(!n)break;count+=n}
 const after=fstatSync(input,{bigint:true})
 if(count>limit||BigInt(count)!==before.size||after.mtimeNs!==before.mtimeNs||after.ctimeNs!==before.ctimeNs||after.size!==before.size)throw Error('INPUT_CHANGED')
 if(sha256(bytes.subarray(0,count))!==hash)throw Error('INPUT_HASH_CHANGED')
 }finally{closeSync(input)}
 }
 }
 verify();const result=await callback(verify);verify();return result
 }finally{if(fd!==undefined){closeSync(fd);unlinkSync(lock)}}
}
