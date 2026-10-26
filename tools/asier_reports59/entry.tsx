import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ProductProvider } from '../../src/features/product/integration/Provider'
import { IntegratedReports } from '../../src/features/reports/IntegratedReports'

function Fixture() {
  const [company, setCompany] = useState(false)
  const [actor, setActor] = useState(false)
  const [viewer, setViewer] = useState(false)
  return <>
    <nav aria-label="Controles sintéticos Work59" className="mb-4 flex flex-wrap gap-2">
      <button onClick={() => setCompany(value => !value)}>Work59 cambiar empresa</button>
      <button onClick={() => setActor(value => !value)}>Work59 cambiar actor</button>
      <button onClick={() => setViewer(value => !value)}>Work59 cambiar rol</button>
      <output data-fixture-company={company ? 'B' : 'A'} data-fixture-actor={actor ? 'B' : 'A'} data-fixture-role={viewer ? 'viewer' : 'owner'}>Contexto sintético</output>
    </nav>
    <ProductProvider integrated role={viewer ? 'viewer' : 'owner'}
      actorId={actor ? '40000000-0000-4000-8000-000000000002' : '40000000-0000-4000-8000-000000000001'}
      workspaceId={company ? '50000000-0000-4000-8000-000000000002' : '50000000-0000-4000-8000-000000000001'}>
      <IntegratedReports />
    </ProductProvider>
  </>
}
createRoot(document.getElementById('app')!).render(<Fixture />)
