import {boundedAwaitV2} from './bounded-await-v2.ts'
import {containsHighConfidenceSecret} from './schema.ts'
import {admittedDocumentRagMaterialV1,type PreparedDocumentRagSourceV1,type DocumentRagSnapshotV1,type DocumentRagMaterialV1} from './document-rag-source-v1.ts'
import type {ReadAuthorityV2} from './product-read-executor-v2.ts'
import {snapshotProductJsonV1} from '../lib/server/product-query-runtime-v1.ts'

export type DocumentRagCitationV1=Readonly<{reference:string;version:number;documentSha256:string;page:number;start:number;end:number;text:string;sha256:string}>
export type DocumentRagRetrievalV1=Readonly<{contract:'assistant.document-retrieval.v1';trust:'untrusted_document_data';scope:'selected_admitted_chunks_only';
  status:'matched'|'no_match'|'invalid_input'|'not_admitted'|'access_changed'|'unavailable';citations:readonly DocumentRagCitationV1[]}>
export type DocumentRagRetrievalDependenciesV1={
  authority():Promise<ReadAuthorityV2|null>
  sources:readonly Readonly<{reference:string;prepared:PreparedDocumentRagSourceV1}>[]
  /** Existing server resolver must recheck active version, approval and target
   * permission. It never accepts a model-selected workspace or Storage URL. */
  resolveCurrentDocument(reference:string,authority:ReadAuthorityV2,signal?:AbortSignal):Promise<unknown>
}
const validated=new WeakSet<object>()
const stopwords=new Set('que cual cuales como de del la el los las un una unos unas en por para con y o es son se a al este esta estos estas tiene tienen me mi su sus segun'.split(' '))
const tokens=(text:string)=>text.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().match(/[a-z0-9]+/g)??[]
const same=(a:ReadAuthorityV2|null,b:ReadAuthorityV2)=>!!a&&['actorId','workspaceId','scopeEpoch','role'].every(key=>a[key as keyof ReadAuthorityV2]===b[key as keyof ReadAuthorityV2])
function authority(raw:unknown):ReadAuthorityV2|null{
  const value=snapshotProductJsonV1(raw)
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='actorId,role,scopeEpoch,workspaceId')return null
  const fields=value as Record<string,unknown>
  if(Object.values(fields).some(v=>typeof v!=='string'||!v||v.length>200))return null
  return value as ReadAuthorityV2
}
function sources(raw:unknown):DocumentRagRetrievalDependenciesV1['sources']|null{
  if(!Array.isArray(raw)||Object.getPrototypeOf(raw)!==Array.prototype)return null
  const descriptors=Object.getOwnPropertyDescriptors<object>(raw),length=descriptors.length.value
  if(length<1||length>10||Reflect.ownKeys(descriptors).length!==length+1)return null
  const refs=new Set<string>(),handles=new Set<object>(),result=[]
  for(let i=0;i<length;i++){
    const field=descriptors[i]
    if(!field?.enumerable||!('value' in field)||!field.value||typeof field.value!=='object'||Object.getPrototypeOf(field.value)!==Object.prototype)return null
    const row=Object.getOwnPropertyDescriptors(field.value)
    if(Reflect.ownKeys(row).length!==2||!['reference','prepared'].every(k=>row[k]?.enumerable&&'value' in row[k]!))return null
    const ref=row.reference.value,handle=row.prepared.value
    if(typeof ref!=='string'||!/^[A-Za-z0-9_-]{1,160}$/.test(ref)||refs.has(ref)||!handle||typeof handle!=='object'||handles.has(handle))return null
    refs.add(ref);handles.add(handle);result.push(Object.freeze({reference:ref,prepared:handle as PreparedDocumentRagSourceV1}))
  }
  return Object.freeze(result)
}
/** In-memory lexical retrieval over admitted fragments, not a vector index,
 * embedding, generated answer, production connector or live-model evaluation.
 * Ten selected sources, three exact citations, total10s budget. */
export async function retrieveAdmittedDocumentChunksV1(query:unknown,raw:DocumentRagRetrievalDependenciesV1,signal?:AbortSignal):Promise<DocumentRagRetrievalV1>{
  const finish=(status:DocumentRagRetrievalV1['status'],citations:readonly DocumentRagCitationV1[]=[]):DocumentRagRetrievalV1=>{
    const result=Object.freeze({contract:'assistant.document-retrieval.v1' as const,trust:'untrusted_document_data' as const,
      scope:'selected_admitted_chunks_only' as const,status,citations:Object.freeze([...citations])})
    validated.add(result);return result
  }
  if(typeof query!=='string'||!query.trim()||Buffer.byteLength(query)>800||query.length>400||containsHighConfidenceSecret(query))return finish('invalid_input')
  const terms=[...new Set(tokens(query).filter(term=>!stopwords.has(term)))]
  if(!terms.length||terms.length>8)return finish('invalid_input')
  let deps:DocumentRagRetrievalDependenciesV1,selected:DocumentRagRetrievalDependenciesV1['sources']|null
  try{
    if(!raw||typeof raw!=='object'||Object.getPrototypeOf(raw)!==Object.prototype)return finish('invalid_input')
    const fields=Object.getOwnPropertyDescriptors(raw),keys=['authority','sources','resolveCurrentDocument']
    if(Reflect.ownKeys(fields).length!==keys.length||!keys.every(k=>fields[k]?.enumerable&&'value' in fields[k]!))return finish('invalid_input')
    deps=Object.fromEntries(keys.map(k=>[k,fields[k].value])) as DocumentRagRetrievalDependenciesV1
    selected=sources(deps.sources)
    if(!selected||typeof deps.authority!=='function'||typeof deps.resolveCurrentDocument!=='function')return finish('invalid_input')
  }catch{return finish('invalid_input')}
  if(signal?.aborted)return finish('unavailable')
  const controller=new AbortController(),cancel=()=>controller.abort(),timer=setTimeout(cancel,10000)
  signal?.addEventListener('abort',cancel,{once:true})
  try{
    if(signal?.aborted)controller.abort()
    // Snapshot callbacks before the first await. Keep this bound to the original
    // server dependency object, while every authority/source read remains fresh.
    const readAuthority=deps.authority,resolve=deps.resolveCurrentDocument,scope=authority(await boundedAwaitV2(()=>readAuthority.call(raw),controller.signal))
    if(!scope||!['owner','admin'].includes(scope.role))return finish('not_admitted')
    const fresh=async()=>same(authority(await boundedAwaitV2(()=>readAuthority.call(raw),controller.signal)),scope)&&!controller.signal.aborted
    const current=async(reference:string)=>await boundedAwaitV2(()=>resolve.call(raw,reference,scope,controller.signal),controller.signal)
    const materials:{reference:string;material:DocumentRagMaterialV1}[]=[],identities=new Set<string>()
    for(const item of selected){
      if(!await fresh())return finish('access_changed')
      const document=await current(item.reference)
      if(!await fresh())return finish('access_changed')
      const material=admittedDocumentRagMaterialV1(item.prepared,scope,document as DocumentRagSnapshotV1)
      if(!material)return finish('access_changed')
      const key=material.source.documentId.toLowerCase()+':'+material.source.version
      if(identities.has(key))return finish('invalid_input')
      identities.add(key);materials.push({reference:item.reference,material})
    }
    const matches:{citation:DocumentRagCitationV1;score:number;source:number}[]=[]
    for(const [source,{reference,material}] of materials.entries())for(const chunk of material.chunks){
      const counts=new Map<string,number>()
      for(const token of tokens(chunk.text))counts.set(token,(counts.get(token)??0)+1)
      if(!terms.every(term=>counts.has(term)))continue
      const score=terms.reduce((sum,term)=>sum+counts.get(term)!,0)
      matches.push({source,score,citation:Object.freeze({reference,version:material.source.version,documentSha256:material.source.sha256,
        page:chunk.page,start:chunk.start,end:chunk.end,text:chunk.text,sha256:chunk.sha256})})
    }
    // Revalidate ALL selected sources, including those that did not match.
    // Partial facts collected before withdrawal can never escape as citations.
    for(const item of selected){
      if(!await fresh())return finish('access_changed')
      const document=await current(item.reference)
      if(!await fresh()||!admittedDocumentRagMaterialV1(item.prepared,scope,document as DocumentRagSnapshotV1))return finish('access_changed')
    }
    if(!await fresh())return finish('access_changed')
    matches.sort((a,b)=>b.score-a.score||a.source-b.source||a.citation.page-b.citation.page||a.citation.start-b.citation.start)
    return finish(matches.length?'matched':'no_match',matches.slice(0,3).map(m=>m.citation))
  }catch{return finish('unavailable')}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel)}
}
export function isValidatedDocumentRagRetrievalV1(value:unknown):value is DocumentRagRetrievalV1{
  return !!value&&typeof value==='object'&&validated.has(value)
}
