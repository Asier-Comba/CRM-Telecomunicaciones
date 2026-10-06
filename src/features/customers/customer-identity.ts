import type {CustomerRowV1} from '@/lib/contracts/telecom-collections-v1'
import type {CustomerEditorV1} from '@/lib/contracts/product-v1'
import {ProductUiError,type ProductRepository} from '../product/integration/repository.ts'
export type CustomerIdentity=CustomerEditorV1|CustomerRowV1
/** One bounded keyset read locates the exact public identity; no privileged editor or whole inventory traversal. */
export async function customerCollectionIdentity(repository:ProductRepository,id:string):Promise<CustomerRowV1>{
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw new ProductUiError('validation')
 const key=id.toLowerCase(),number=BigInt('0x'+key.replaceAll('-','')),hex=number>BigInt(0)?(number-BigInt(1)).toString(16).padStart(32,'0'):null
 const previous=hex?hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20):null
 const page=await repository.collection('customer.list',{limit:1,sort:'id_asc',...(previous?{after_id:previous}:{})}),record=page.items[0]
 if(!record||record.id!==key)throw new ProductUiError('not_found')
 return record
}
export const customerName=(customer:CustomerIdentity)=>'display_name'in customer?customer.display_name:customer.legal_name
