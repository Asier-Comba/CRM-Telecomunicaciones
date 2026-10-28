import type {DocumentLibraryInputV2} from '@/lib/contracts/document-library-v2'
import {parseDocumentLibraryInputV2} from '../../lib/server/document-library-runtime-v2.ts'
import {readDocumentView} from './document-navigation.ts'
export type LibraryNavigation={input:DocumentLibraryInputV2;page:number;back:Array<string|null>}
export const initialLibraryInput=(target?:{kind:string;id:string},status='active')=>parseDocumentLibraryInputV2({status,...(target?target.kind==='customer'?{customer_id:target.id}:{target}:{} )})!
/** View state only; no rows, labels, filenames or credentials. Every reload reads the server again. */
export function readLibraryHistory(value:unknown,scope:string):LibraryNavigation|null{
 try{
  if(!value||typeof value!=='object'||Array.isArray(value))return null
  const v=value as Record<string,unknown>
  if(Object.keys(v).sort().join(',')!=='back,contract,input,page,scope'||v.contract!=='documents.library.navigation.v2'||v.scope!==scope||!Number.isSafeInteger(v.page)||(v.page as number)<1||!Array.isArray(v.back)||v.back.length>32||v.back.length>(v.page as number)-1)return null
  const input=parseDocumentLibraryInputV2(v.input)
  if(!input||(v.page===1?!!input.cursor:!input.cursor)||v.back.some(c=>c!==null&&!parseDocumentLibraryInputV2({cursor:c})))return null
  return{input,page:v.page as number,back:v.back as Array<string|null>}
 }catch{return null}
}
export function libraryUrl(input:DocumentLibraryInputV2){
 const params=new URLSearchParams()
 if(input.target){if(input.target.kind==='customer')params.set('customer',input.target.id);else{params.set('doc_kind',input.target.kind);params.set('doc_target',input.target.id)}}else if(input.customer_id)params.set('customer',input.customer_id)
 if(input.status==='archived')params.set('doc_status','archived')
 return'/documents'+(params.size?'?'+params.toString():'')
}
export function libraryUrlInput(search:string){const {view}=readDocumentView(search);return initialLibraryInput(view.target??undefined,view.status)}
export function libraryDateFilter(value:string,nextDay=false):string|undefined{
 if(!value)return undefined
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('INVALID_DATE')
 const date=new Date(value+'T00:00:00');if(!Number.isFinite(date.getTime())||`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`!==value)throw Error('INVALID_DATE')
 if(nextDay)date.setDate(date.getDate()+1)
 return date.toISOString()
}
export function libraryCalendarDate(value?:string,inclusiveEnd=false){if(!value)return'';const d=new Date(value);if(inclusiveEnd)d.setDate(d.getDate()-1);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
