import {spawn,type ChildProcessWithoutNullStreams,type SpawnOptionsWithoutStdio} from 'node:child_process'
import {isAbsolute} from 'node:path'
import {fileURLToPath} from 'node:url'

type Launcher=(file:string,args:string[],options:SpawnOptionsWithoutStdio)=>ChildProcessWithoutNullStreams
export type ReviewedPdfExtractorDependenciesV1={pythonExecutable:string;timeoutMs?:number;launch?:Launcher}
const script=fileURLToPath(new URL('../../scripts/assistant/extract-reviewed-pdf-v1.py',import.meta.url))
const failure=()=>Error('PDF_EXTRACTION_UNAVAILABLE')

/** Private server configuration, never model/browser input. Optional adapter for
 * prepareDocumentRagSourceV1; no default activation, Storage bypass or indexing.
 * Runs only the fixed local text worker, without shell/provider/CRM credentials. */
export function createReviewedPdfExtractorV1(raw:ReviewedPdfExtractorDependenciesV1){
  if(!raw||typeof raw!=='object'||Object.getPrototypeOf(raw)!==Object.prototype)throw failure()
  const fields=Object.getOwnPropertyDescriptors(raw)
  if(Reflect.ownKeys(fields).some(k=>!['pythonExecutable','timeoutMs','launch'].includes(String(k)))
    ||Object.values(fields).some(d=>!d.enumerable||!('value' in d))||!fields.pythonExecutable)throw failure()
  const python=fields.pythonExecutable.value as unknown,timeoutMs=fields.timeoutMs?.value??10000
  const defaultLaunch:Launcher=(file,args,options)=>spawn(file,args,{...options,stdio:'pipe'})
  const launch=(fields.launch?.value??defaultLaunch) as Launcher
  if(typeof python!=='string'||!isAbsolute(python)||python.includes('\0')||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>10000||typeof launch!=='function')throw failure()
  return async(bytes:Uint8Array,signal?:AbortSignal):Promise<unknown>=>{
    if(signal?.aborted||!(bytes instanceof Uint8Array)||bytes.byteLength<5||bytes.byteLength>10_485_760
      ||!Buffer.from(bytes.subarray(0,5)).equals(Buffer.from('%PDF-','ascii')))throw failure()
    const input=Buffer.from(bytes),environment:NodeJS.ProcessEnv={NODE_ENV:'test'}
    for(const key of ['SystemRoot','PATH','TEMP','TMP'])if(process.env[key])environment[key]=process.env[key]
    return new Promise((resolve,reject)=>{
      let child:ChildProcessWithoutNullStreams,settled=false,size=0
      const output:Buffer[]=[]
      const abort=()=>finish(false)
      const timer=setTimeout(abort,timeoutMs)
      function finish(ok:boolean,value?:unknown){
        if(settled)return
        settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort)
        if(ok)resolve(value)
        else{child?.kill('SIGKILL');reject(failure())}
      }
      try{
        child=launch(python,['-I','-X','utf8',script],{shell:false,windowsHide:true,env:environment})
        signal?.addEventListener('abort',abort,{once:true})
        if(signal?.aborted){finish(false);return}
        child.on('error',()=>finish(false));child.stdin.on('error',()=>finish(false))
        child.stdout.on('error',()=>finish(false));child.stderr.on('error',()=>finish(false))
        child.stderr.on('data',()=>finish(false))
        child.stdout.on('data',(chunk:Buffer)=>{
          if(settled)return
          size+=chunk.byteLength
          if(size>220_000){finish(false);return}
          output.push(Buffer.from(chunk))
        })
        child.on('close',(code,exitSignal)=>{
          if(settled)return
          if(code!==0||exitSignal!==null){finish(false);return}
          try{
            const pages:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(output)))
            if(!Array.isArray(pages)||!pages.length||pages.length>100||pages.some((p,i)=>!p||typeof p!=='object'||Array.isArray(p)
              ||Object.keys(p).sort().join(',')!=='page,text'||p.page!==i+1||typeof p.text!=='string')
              ||pages.reduce((total,p)=>total+Buffer.byteLength(p.text),0)>200_000){finish(false);return}
            finish(true,Object.freeze(pages.map(p=>Object.freeze({page:p.page,text:p.text}))))
          }catch{finish(false)}
        })
        child.stdin.end(input)
      }catch{finish(false)}
    })
  }
}
