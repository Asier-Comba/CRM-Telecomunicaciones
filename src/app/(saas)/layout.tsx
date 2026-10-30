import { AppShell } from '@/components/AppShell'
import { AuthGate } from '@/components/AuthGate'
import { WorkspaceIdentityProvider } from '@/components/WorkspaceIdentityProvider'

import { syntheticPreviewAllowed } from '@/lib/telecom-preview/access'
import { searchItems } from '@/features/product/projections'
import { integratedProductAllowed } from '@/features/product/integration/mode'
import { ProductProvider } from '@/features/product/integration/Provider'
import { resolveTenantContext } from '@/lib/server/tenant-context'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function SaasLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const integrated = integratedProductAllowed()
  if (process.env.PRODUCT_LOCAL_INTEGRATION === 'true' && !integrated)
    return <p role="alert">La integración local no está disponible con esta configuración.</p>
  const tenant = integrated ? await resolveTenantContext() : null
  if (tenant && 'error' in tenant) redirect('/login')
  // Owner-named non-synthetic accounts (exact Auth UUIDs) may use the shareable Vercel preview.
  const ownerIds = (process.env.PRODUCT_STAGING_OWNER_IDS ?? '').split(',').filter(Boolean)
  if (tenant && !tenant.email.endsWith('@example.invalid') && !ownerIds.includes(tenant.userId))
    return <p role="alert">Este entorno admite únicamente identidades sintéticas de prueba.</p>
  const role = tenant && !('error' in tenant) ? tenant.role : null
  return (
    <AuthGate integrated={integrated}>
      <ProductProvider integrated={integrated} role={role} actorId={tenant && !('error' in tenant) ? tenant.userId : null} workspaceId={tenant && !('error' in tenant) ? tenant.workspaceId : null}>
      <WorkspaceIdentityProvider>
        <AppShell search={syntheticPreviewAllowed() ? searchItems() : []}>
          {children}
        </AppShell>
      </WorkspaceIdentityProvider>
      </ProductProvider>
    </AuthGate>
  )
}
