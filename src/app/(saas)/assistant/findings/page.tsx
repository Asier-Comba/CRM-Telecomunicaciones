import { PageHeader } from '@/components/PageHeader'
import { Unavailable } from '@/features/product/ui'
export default function FindingsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Calidad de datos"
        description="Incidencias de la cartera telecom"
      />
      <Unavailable title="Hallazgos no disponibles">
        El módulo requiere hallazgos autorizados del runtime. No se presentan
        comprobaciones locales como incidencias reales.
      </Unavailable>
    </div>
  )
}
