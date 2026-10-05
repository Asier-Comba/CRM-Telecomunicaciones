import { PageHeader } from '@/components/PageHeader'
import { syntheticPreviewAllowed } from '@/lib/telecom-preview/access'
import { Documents } from '@/features/documents/Documents'
import { IntegratedDocuments } from '@/features/documents/IntegratedDocuments'
import { integratedLocalAllowed } from '@/features/product/integration/mode'
export default async function DocumentsPage({searchParams}:{searchParams:Promise<{customer?:string}>}) {
  if(integratedLocalAllowed()){
    const {customer}=await searchParams
    return <IntegratedDocuments customerId={typeof customer==='string'&&/^[0-9a-f-]{36}$/i.test(customer)?customer:undefined}/>
  }
  if (!syntheticPreviewAllowed())
    return (
      <PageHeader
        title="Documentos"
        description="Documentación pendiente de lectura autorizada."
      />
    )
  return <Documents />
}
