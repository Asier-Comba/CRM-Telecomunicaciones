import { PageHeader } from '@/components/PageHeader'
import { syntheticPreviewAllowed } from '@/lib/telecom-preview/access'
import { Documents } from '@/features/documents/Documents'
import { IntegratedDocuments } from '@/features/documents/IntegratedDocuments'
import { IntegratedDocumentLibrary } from '@/features/documents/IntegratedDocumentLibrary'
import { integratedProductAllowed } from '@/features/product/integration/mode'
import { readDocumentView } from '@/features/documents/document-navigation'
export default async function DocumentsPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  if(integratedProductAllowed()){
    const raw=await searchParams,params=new URLSearchParams()
    for(const key of ['customer','doc_kind','doc_target','doc_status','doc_after','doc_page']){
      const value=raw[key]
      if(Array.isArray(value))for(const item of value)params.append(key,item)
      else if(typeof value==='string')params.set(key,value)
    }
    const {view}=readDocumentView(params.toString())
    if(process.env.PRODUCT_DOCUMENT_LIBRARY_ENABLED==='true')return <IntegratedDocumentLibrary initialTarget={view.target??undefined} initialStatus={view.status}/>
    return <><p role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Inventario global no habilitado. Puedes consultar los documentos de un registro autorizado.</p><IntegratedDocuments maintenanceEnabled={process.env.PRODUCT_DOCUMENT_MAINTENANCE_ENABLED==='true'} contentEnabled={process.env.PRODUCT_DOCUMENT_CONTENT_ENABLED==='true'} customerId={view.target?.kind==='customer'?view.target.id:undefined} initialView={view} syncUrl/></>
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
