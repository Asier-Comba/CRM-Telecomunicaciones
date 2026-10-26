import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync } from 'node:fs'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'

export function newExternalOutput(source,destination){
  const root=realpathSync(source),raw=resolve(destination),out=join(realpathSync(dirname(raw)),basename(raw))
  const normalize=path=>process.platform==='win32'?path.toLowerCase():path
  if(existsSync(out)||normalize(out)===normalize(root)||normalize(out).startsWith(normalize(root)+sep))throw Error('NEW_EXTERNAL_OUTPUT_REQUIRED')
  return out
}

export function runtimeCopies(dockerfile) {
  const lines=dockerfile.split(/\r?\n/).filter(line=>line.startsWith('COPY --from=build '))
  const copies=lines.map(line=>{
    const match=/^COPY --from=build --chown=65532:65532 \/app\/(\S+) (\.\/\S*|\.\/)$/.exec(line)
    if(!match)throw Error('COPY_CONTRACT_REVIEW_REQUIRED')
    return {from:match[1],to:match[2]}
  })
  const expected=[['.next/standalone','./'],['.next/static','./.next/static'],['public','./public'],['scripts/platform','./scripts/platform'],['infra/platform','./infra/platform']]
  if(JSON.stringify(copies.map(({from,to})=>[from,to]))!==JSON.stringify(expected))throw Error('COPY_CONTRACT_REVIEW_REQUIRED')
  return copies
}
export function regularFiles(directory) {
  const root=realpathSync(directory),result=[]
  function visit(folder){
    for(const name of readdirSync(folder).sort()){
      const file=join(folder,name),stat=lstatSync(file),rel=relative(root,file).split(sep).join('/')
      if(stat.isSymbolicLink())throw Error('RUNTIME_LINK_REQUIRES_REVIEW')
      if(!realpathSync(file).startsWith(root+sep))throw Error('RUNTIME_PATH_ESCAPE')
      if(/(^|\/)\.env(?:\.|$)|(^|\/)(?:id_rsa|id_ed25519)(?:\.|$)|\.(?:pem|key|p12|pfx)$/i.test(rel))throw Error('SECRET_FILE_FORBIDDEN')
      if(/(^|\/)\.git(?:\/|$)|^\.next\/cache(?:\/|$)|(^|\/)node_modules\/\.cache(?:\/|$)/.test(rel))throw Error('NON_RUNTIME_STATE_FORBIDDEN')
      if(stat.isDirectory())visit(file)
      else if(stat.isFile())result.push(file)
      else throw Error('REGULAR_RUNTIME_FILES_REQUIRED')
    }
  }
  visit(root);return result
}
export function checkRuntime(directory) {
  for(const name of ['server.js','package.json','.next/BUILD_ID','scripts/platform/entrypoint.mjs','infra/platform/environment-manifest.json']){
    if(!existsSync(join(directory,name))||!lstatSync(join(directory,name)).isFile())throw Error('RUNTIME_COPY_INCOMPLETE')
  }
  for(const name of ['public','.next/static'])if(!existsSync(join(directory,name))||regularFiles(join(directory,name)).length===0)throw Error('RUNTIME_COPY_INCOMPLETE')
  return {files:regularFiles(directory).length,copy_contract:'EXISTING_DOCKERFILE',secrets:'NO_DOTENV_OR_KEY_FILES',links:'NONE'}
}
export function assembleRuntime(source,destination) {
  const root=realpathSync(source),out=newExternalOutput(root,destination)
  const copies=runtimeCopies(readFileSync(join(root,'infra/deployment/Dockerfile'),'utf8'))
  for(const {from}of copies)regularFiles(join(root,from))
  mkdirSync(out)
  for(const {from,to}of copies){
    const target=resolve(out,to)
    if(target!==out&&!target.startsWith(out+sep))throw Error('OWNED_OUTPUT_REQUIRED')
    cpSync(join(root,from),target,{recursive:true,errorOnExist:true,force:false,dereference:false})
  }
  return checkRuntime(out)
}
