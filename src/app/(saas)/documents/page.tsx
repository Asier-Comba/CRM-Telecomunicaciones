import { PageHeader } from '@/components/PageHeader'
import { syntheticPreviewAllowed } from '@/lib/telecom-preview/access'
import { Documents } from '@/features/documents/Documents'
export default function DocumentsPage() {
  if (!syntheticPreviewAllowed())
    return (
      <PageHeader
        title="Documentos"
        description="Documentación pendiente de lectura autorizada."
      />
    )
  return <Documents />
}
