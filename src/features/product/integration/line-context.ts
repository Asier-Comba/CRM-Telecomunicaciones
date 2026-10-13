import {ProductUiError,type ProductRepository} from './repository.ts'
import type {LineRowV1} from '@/lib/contracts/telecom-collections-v1'
export type LineContext={line:LineRowV1;eligible:boolean;manualParents:boolean;activeParents:boolean}
export async function readLineContext(repository:ProductRepository,id:string,customerId:string):Promise<LineContext>{
 const n=BigInt('0x'+id.replaceAll('-',''));if(n===BigInt(0))throw new ProductUiError('not_found');const h=(n-BigInt(1)).toString(16).padStart(32,'0'),after=h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20)
 const line=(await repository.collection('line.list',{customer_id:customerId,limit:1,sort:'id_asc',after_id:after})).items[0];if(line?.id!==id||line.customer_id!==customerId)throw new ProductUiError('not_found')
 const [s,c]=await Promise.all([repository.portfolio('service',line.service_id),repository.portfolio('contract',line.contract_id)])
 if(s.kind!=='service'||c.kind!=='contract'||s.record.customer_id!==customerId||c.record.customer_id!==customerId||s.record.contract_id!==c.record.id||s.record.operator_id!==line.operator_id||c.record.operator_id!==line.operator_id)throw new ProductUiError('not_found')
 const manualParents=line.source==='manual'&&s.record.source==='manual'&&c.record.source==='manual'&&['pending','active','suspended'].includes(line.status)&&['pending','active','suspended'].includes(s.record.status)&&['draft','active'].includes(c.record.status)
 return{line,manualParents,eligible:manualParents&&['mobile','data_connectivity'].includes(s.record.service_kind),activeParents:s.record.status==='active'&&c.record.status==='active'}
}
