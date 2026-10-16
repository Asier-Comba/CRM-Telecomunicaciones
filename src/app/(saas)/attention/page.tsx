import {integratedLocalAllowed} from '@/features/product/integration/mode'
import {IntegratedAttention} from '@/features/attention/IntegratedAttention'
import {PageHeader} from '@/components/PageHeader'
export default async function AttentionPage({searchParams}:{searchParams:Promise<{customer?:string|string[]}>}){
 if(!integratedLocalAllowed())return <PageHeader title="Centro de atención" description="Los seguimientos requieren una conexión autorizada."/>
 const {customer}=await searchParams
 const initialCustomerId=typeof customer==='string'?customer:undefined
 return <IntegratedAttention key={initialCustomerId??'all'} initialCustomerId={initialCustomerId}/>
}
