import type {DocumentTargetKindV1} from '@/lib/contracts/document-v1'

export type DocumentTarget={kind:DocumentTargetKindV1;id:string}
export type DocumentView={target:DocumentTarget|null;status:'active'|'archived';after:string|null;page:number}
export const documentCategories={general:'General',identity:'Identidad',contract:'Contrato',service:'Servicio',incident:'Incidencia',billing:'Facturación',other:'Otro'} as const
export const documentTargets={customer:'Empresa',contract:'Contrato',service:'Servicio',line:'Línea',service_case:'Incidencia',opportunity:'Oportunidad'} as const
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
export function validDocumentTarget(kind:unknown,id:unknown):DocumentTarget|null{
  return typeof kind==='string'&&Object.hasOwn(documentTargets,kind)&&uuid(id)?{kind:kind as DocumentTargetKindV1,id:id.toLowerCase()}:null
}
/** View state only. Every page is fetched again through the protected reader. */
export function readDocumentView(search:string):{view:DocumentView;invalid:boolean}{
  const p=new URLSearchParams(search),keys=['customer','doc_kind','doc_target','doc_status','doc_after','doc_page']
  const duplicate=keys.some(key=>p.getAll(key).length>1)
  let target:DocumentTarget|null=null,invalid=duplicate
  if(p.has('doc_kind')||p.has('doc_target')){target=validDocumentTarget(p.get('doc_kind'),p.get('doc_target'));if(!target)invalid=true}
  else if(p.has('customer')){target=validDocumentTarget('customer',p.get('customer'));if(!target)invalid=true}
  const status=p.get('doc_status')??'active'
  if(!['active','archived'].includes(status))invalid=true
  const rawPage=p.get('doc_page')??'1',after=p.get('doc_after')
  const page=/^[1-9][0-9]{0,6}$/.test(rawPage)?Number(rawPage):0
  if(!page||after!==null&&!uuid(after)||after!==null&&page<2||after===null&&page!==1||!target&&after!==null)invalid=true
  // Invalid navigation never silently selects a different customer or cursor.
  return{view:invalid?{target:null,status:'active',after:null,page:1}:{target,status:status as DocumentView['status'],after:after?.toLowerCase()??null,page},invalid}
}
export function documentViewUrl(current:string,view:DocumentView){
  const url=new URL(current)
  if(!['http:','https:'].includes(url.protocol))throw Error('DOCUMENT_VIEW_ORIGIN_INVALID')
  // Canonical navigation never republishes arbitrary search terms or tokens.
  url.search='';url.hash=''
  if(view.target){
    const target=validDocumentTarget(view.target.kind,view.target.id)
    if(!target)throw Error('DOCUMENT_VIEW_TARGET_INVALID')
    if(target.kind==='customer')url.searchParams.set('customer',target.id)
    else{url.searchParams.set('doc_kind',target.kind);url.searchParams.set('doc_target',target.id)}
  }
  if(view.status!=='active'&&view.status!=='archived')throw Error('DOCUMENT_VIEW_STATUS_INVALID')
  if(view.status==='archived')url.searchParams.set('doc_status',view.status)
  if(view.after){
    if(!view.target||!uuid(view.after)||!Number.isSafeInteger(view.page)||view.page<2||view.page>9999999)throw Error('DOCUMENT_VIEW_CURSOR_INVALID')
    url.searchParams.set('doc_after',view.after);url.searchParams.set('doc_page',String(view.page))
  }else if(view.page!==1)throw Error('DOCUMENT_VIEW_CURSOR_INVALID')
  return url.pathname+url.search+url.hash
}
export function documentNavigationKey(view:DocumentView){return JSON.stringify([view.target?.kind??null,view.target?.id??null,view.status])}
export function readDocumentBackStack(raw:unknown,scope:string,view:DocumentView):Array<string|null>{
  if(!raw||typeof raw!=='object')return[]
  const v=raw as Record<string,unknown>
  if(v.contract!=='documents.navigation.v1'||v.scope!==scope||v.query!==documentNavigationKey(view)||v.after!==view.after||v.page!==view.page||!Array.isArray(v.back)||v.back.length>32||v.back.length>=view.page||!v.back.every(x=>x===null||uuid(x)))return[]
  return [...v.back] as Array<string|null>
}
export function documentTargetHref(target:DocumentTarget){
  if(!validDocumentTarget(target.kind,target.id))return null
  const id=target.id.toLowerCase()
  return{customer:'/clients/'+id,contract:'/portfolio?kind=contract&id='+id,service:'/services/'+id,line:'/portfolio?kind=line&id='+id,service_case:'/cases/'+id,opportunity:'/opportunities?open='+id}[target.kind]
}
export function documentFormat(media:string|null){return media==='application/pdf'?'PDF':media==='image/png'?'PNG':media==='image/jpeg'?'JPEG':media?'Otro formato':'Formato no disponible'}
export function documentSize(bytes:number|null){
  if(bytes===null)return'Tamaño no disponible'
  if(bytes<1024)return`${bytes} B`
  const unit=bytes<1048576?'KB':'MiB',value=bytes/(unit==='KB'?1024:1048576)
  return`${new Intl.NumberFormat('es-ES',{maximumFractionDigits:1}).format(value)} ${unit}`
}
