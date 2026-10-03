import { PageHeader } from '@/components/PageHeader'
import { syntheticPreviewAllowed } from '@/lib/telecom-preview/access'
import { customerPreview } from '@/lib/telecom-preview/data'
import { Assistant } from '@/features/assistant/Assistant'
export default async function AssistantPage({searchParams}:{searchParams:Promise<{customer?:string}>}){
  if (!syntheticPreviewAllowed()) return <PageHeader title="Asistente de cartera" description="Vista sintética no disponible en este entorno."/>
  const {customer}=await searchParams,data=typeof customer==='string'?customerPreview(customer):null
  const context=data?{id:data.customer.id,name:data.customer.legal_name,owner:data.customer.assigned_user?.display_name??'Sin asignar',contracts:data.portfolioAvailable?data.contracts.length:null,services:data.portfolioAvailable?data.services.length:null,lines:data.portfolioAvailable?data.lines.length:null}:null
  return <Assistant context={context}/>
}
