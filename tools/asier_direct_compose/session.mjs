import {lstatSync,openSync,closeSync,readFileSync,unlinkSync,constants} from 'node:fs'
import {createHash} from 'node:crypto'
import {join} from 'node:path'
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex')
// A preparation lock, not an adversarial-root or transactional-engine guarantee.
// The callback cannot be selected by a CLI flag; no hosted executor is exposed.
export function protectedSession(directory,expected,callback){
 const dir=lstatSync(directory)
 if(!dir.isDirectory()||dir.isSymbolicLink()||(dir.mode&0o077)!==0)throw Error('PRIVATE_DIRECTORY_REQUIRED')
 const lock=join(directory,'.crm-direct.lock');let fd
 try{
 fd=openSync(lock,constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY,0o600)
 const verify=()=>{
 for(const [name,hash]of Object.entries(expected)){
 if(!/^[a-zA-Z0-9_.-]+$/.test(name)||! /^[a-f0-9]{64}$/.test(hash))throw Error('INPUT_IDENTITY_INVALID')
 const path=join(directory,name),s=lstatSync(path)
 if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||(s.mode&0o077)!==0||s.size>1024*1024)throw Error('PRIVATE_FILE_REQUIRED')
 if(sha256(readFileSync(path))!==hash)throw Error('INPUT_HASH_CHANGED')
 }
 }
 verify();const result=callback(verify);verify();return result
 }finally{if(fd!==undefined){closeSync(fd);unlinkSync(lock)}}
}
