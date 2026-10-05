import { AppShell } from '@/components/AppShell'
import { AuthGate } from '@/components/AuthGate'
import { WorkspaceIdentityProvider } from '@/components/WorkspaceIdentityProvider'

import { syntheticPreviewAllowed } from '@/lib/telecom-preview/access'
import { searchItems } from '@/features/product/projections'
import { integratedLocalAllowed } from '@/features/product/integration/mode'
import { ProductProvider } from '@/features/product/integration/Provider'
import { resolveTenantContext } from '@/lib/server/tenant-context'
import { redirect } from 'next/navigation'

export default async function SaasLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const integrated = integratedLocalAllowed()
  if (process.env.PRODUCT_LOCAL_INTEGRATION === 'true' && !integrated)
    return <p role="alert">La integración local no está disponible con esta configuración.</p>
  const tenant = integrated ? await resolveTenantContext() : null
  if (tenant && 'error' in tenant) redirect('/login')
  if (tenant && !tenant.email.endsWith('@example.invalid'))
    return <p role="alert">Este entorno admite únicamente identidades sintéticas de prueba.</p>
  const role = tenant && !('error' in tenant) ? tenant.role : null
  return (
    <AuthGate integrated={integrated}>
      <ProductProvider integrated={integrated} role={role}>
      <WorkspaceIdentityProvider>
        <AppShell search={syntheticPreviewAllowed() ? searchItems() : []}>
          {children}
        </AppShell>
      </WorkspaceIdentityProvider>
      </ProductProvider>
    </AuthGate>
  )
}
