import {readFileSync,readdirSync} from 'node:fs'
import {join,resolve} from 'node:path'
import {pathToFileURL} from 'node:url'

const fail=code=>{throw new Error(code)}
const indentation=line=>line.match(/^ */)[0].length
const content=line=>line.trim()&&!line.trimStart().startsWith('#')

// Support canonical block steps and the repository's simple inline mappings.
// Nested/ambiguous forms are rejected rather than guessed; not a YAML parser.
export function checkCheckouts(text){
 const lines=text.replaceAll('\r\n','\n').split('\n');let count=0
 for(let i=0;i<lines.length;i++){
  const match=lines[i].match(/^( *)(?:- +)?uses: +(.+?)\s*$/)
  if(!match)continue
  const value=match[2].replace(/ +#.*$/,'').replace(/^(['"])(.*)\1$/,'$2')
  if(!/^actions\/checkout(?:@|$)/i.test(value))continue
  if(!/^actions\/checkout@[a-f0-9]{40}$/i.test(value))fail('CHECKOUT_IMMUTABLE_REF_REQUIRED')
  let start=i
  if(!lines[i].trimStart().startsWith('- ')){
   for(start=i-1;start>=0;start--)if(content(lines[start])&&indentation(lines[start])<match[1].length)break
  }
  if(start<0||!/^ *- (?:name|uses):/.test(lines[start]))fail('CHECKOUT_STEP_STYLE_REQUIRED')
  const indent=indentation(lines[start]),fieldIndent=indent+2
  let end=start+1;while(end<lines.length&&(!content(lines[end])||indentation(lines[end])>indent))end++
  const block=lines.slice(start,end)
  if(block.some(l=>/^\s*\t/.test(l)))fail('CHECKOUT_STEP_STYLE_REQUIRED')
  const withIndices=block.flatMap((line,n)=>indentation(line)===fieldIndent&&/^with:/.test(line.trimStart())?[n]:[])
  if(withIndices.length!==1)fail('CHECKOUT_BLOCK_WITH_REQUIRED')
  const withLine=block[withIndices[0]].trimStart(),inline=withLine.match(/^with: \{([^{}]+)\}\s*(?:#.*)?$/)
  const keys=[]
  if(inline){
   const fields=inline[1].split(',').map(v=>v.trim()),names=new Set()
   for(const field of fields){
    const pair=field.match(/^([a-z][a-z0-9-]*): +([a-zA-Z0-9_.:/@-]+|'[a-zA-Z0-9_.:/@-]+'|"[a-zA-Z0-9_.:/@-]+")$/)
    if(!pair||names.has(pair[1]))fail('CHECKOUT_INLINE_WITH_INVALID')
    names.add(pair[1]);if(pair[1]==='persist-credentials')keys.push(field)
   }
  }else{
   if(!/^with:\s*(?:#.*)?$/.test(withLine))fail('CHECKOUT_BLOCK_WITH_REQUIRED')
   for(let n=withIndices[0]+1;n<block.length;n++){
    const line=block[n];if(!content(line))continue
    if(indentation(line)<=fieldIndent)break
    if(indentation(line)===fieldIndent+2&&/^persist-credentials:/.test(line.trimStart()))keys.push(line.trimStart())
   }
  }
  if(keys.length!==1||!/^persist-credentials: (?:false|'false'|"false")\s*(?:#.*)?$/.test(keys[0]))fail('CHECKOUT_PRIVATE_CREDENTIAL_GUARD_REQUIRED')
  count++
 }
 return count
}
export function checkWorkflowDirectory(directory){
 const files=readdirSync(directory).filter(n=>/\.ya?ml$/.test(n)).sort()
 if(!files.length)fail('CHECKOUT_WORKFLOWS_REQUIRED')
 const counts=files.map(n=>checkCheckouts(readFileSync(join(directory,n),'utf8')))
 if(!counts.reduce((a,b)=>a+b,0))fail('CHECKOUT_STEPS_REQUIRED')
 return {status:'PASS',workflow_files:files.length,checkout_steps:counts.reduce((a,b)=>a+b,0),values_included:false}
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{console.log(JSON.stringify(checkWorkflowDirectory(process.argv[2]??'.github/workflows')))}
 catch(e){console.error(JSON.stringify({status:'FAIL',code:/^CHECKOUT_[A-Z_]+$/.test(e.message)?e.message:'CHECKOUT_GUARD_INVALID',values_included:false}));process.exitCode=1}
}
