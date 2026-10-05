import { PageHeader } from '@/components/PageHeader'
import { syntheticPreviewAllowed } from '@/lib/telecom-preview/access'
import { Settings } from '@/features/settings/Settings'
import { integratedLocalAllowed } from '@/features/product/integration/mode'
import { IntegratedSettings } from '@/features/settings/IntegratedSettings'
export default function SettingsPage() {
  if(integratedLocalAllowed())return <IntegratedSettings/>
  if (!syntheticPreviewAllowed())
    return (
      <PageHeader
        title="Configuración"
        description="Configuración pendiente de lecturas y operaciones autorizadas."
      />
    )
  return <Settings />
}
