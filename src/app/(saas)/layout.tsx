import { AppShell } from '@/components/AppShell'
import { AuthGate } from '@/components/AuthGate'
import { WorkspaceIdentityProvider } from '@/components/WorkspaceIdentityProvider'

import { syntheticPreviewAllowed } from '@/lib/telecom-preview/access'
import { searchItems } from '@/features/product/projections'

export default function SaasLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGate>
      <WorkspaceIdentityProvider>
        <AppShell search={syntheticPreviewAllowed() ? searchItems() : []}>
          {children}
        </AppShell>
      </WorkspaceIdentityProvider>
    </AuthGate>
  )
}
