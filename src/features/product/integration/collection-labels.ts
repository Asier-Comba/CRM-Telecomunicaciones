import {customerCollectionIdentity,customerName,assigneeCollectionIdentity,stageCollectionIdentity} from '../../customers/customer-identity.ts'
import type {ProductRepository} from './repository'
import {productDate} from '../presentation.ts'
export type LabelKind='customer'|'operator'|'plan_version'|'assignee'|'stage'
export type LabelSet=Record<LabelKind,Record<string,string|null>>
const fieldKinds:Record<string,LabelKind>={customer_id:'customer',operator_id:'operator',donor_operator_id:'operator',target_operator_id:'operator',plan_version_id:'plan_version',assigned_user_id:'assignee',owner_user_id:'assignee',stage_id:'stage'}
const unavailable:Record<LabelKind,string>={customer:'Cliente no disponible',operator:'Operador no disponible',plan_version:'Versión vendida no disponible',assignee:'Comercial no disponible',stage:'Etapa no disponible'}
export function pendingCollectionLabels(rows:readonly object[]):LabelSet{const result:LabelSet={customer:{},operator:{},plan_version:{},assignee:{},stage:{}};for(const row of rows)for(const [field,value]of Object.entries(row)){const kind=fieldKinds[field];if(kind&&typeof value==='string')result[kind][value]=null}return result}
/** One current read per distinct reference, four concurrent reads, lifetime limited to the received page. */
export async function loadCollectionLabels(repository:ProductRepository,rows:readonly object[],isActive:()=>boolean=()=>true,onProgress?:(labels:LabelSet)=>void):Promise<LabelSet>{
 const result=pendingCollectionLabels(rows),queue=(Object.entries(result) as [LabelKind,Record<string,string|null>][]).flatMap(([kind,ids])=>Object.keys(ids).map(id=>({kind,id})));let index=0
 async function worker(){while(isActive()&&index<queue.length){const {kind,id}=queue[index++];let label:string
  try{if(kind==='customer')label=customerName(await customerCollectionIdentity(repository,id));else if(kind==='assignee')label=(await assigneeCollectionIdentity(repository,id)).display_name;else if(kind==='stage')label=(await stageCollectionIdentity(repository,id)).display_name;else if(kind==='operator')label=(await repository.collection('operator.get',{id})).record.display_name;else{const r=(await repository.collection('plan_version.get',{id})).record,amount=r.recurring_amount_minor===null?'Precio no registrado':['EUR','USD','GBP'].includes(r.currency)?(BigInt(r.recurring_amount_minor)/BigInt(100)).toLocaleString('es-ES')+','+(BigInt(r.recurring_amount_minor)%BigInt(100)).toString().padStart(2,'0')+' '+r.currency:r.recurring_amount_minor+' unidades menores · '+r.currency;label='Versión '+r.version_number+' · '+amount+' · '+productDate(r.valid_from)+(r.valid_until?' → '+productDate(r.valid_until):'')}}catch{label=unavailable[kind]}
  if(isActive()){
   result[kind][id]=label
   // Each publication owns its records; later reads cannot mutate an earlier render.
   onProgress?.({customer:{...result.customer},operator:{...result.operator},plan_version:{...result.plan_version},assignee:{...result.assignee},stage:{...result.stage}})
  }
 }}
 await Promise.all(Array.from({length:Math.min(4,queue.length)},worker));return result
}
