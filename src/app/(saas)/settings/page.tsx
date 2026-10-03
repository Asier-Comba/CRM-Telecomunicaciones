import { PageHeader } from '@/components/PageHeader'
import { syntheticPreviewAllowed } from '@/lib/telecom-preview/access'
import { Settings } from '@/features/settings/Settings'
export default function SettingsPage() {
  if (!syntheticPreviewAllowed())
    return (
      <PageHeader
        title="Configuración"
        description="Configuración pendiente de lecturas y operaciones autorizadas."
      />
    )
  return <Settings />
}
