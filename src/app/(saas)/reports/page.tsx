import Link from 'next/link'
import { PageHeader } from '@/components/PageHeader'
import { Unavailable } from '@/features/product/ui'
export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Informes"
        description="Análisis comercial y operativo de la cartera"
      />
      <Unavailable title="Métricas históricas no disponibles">
        Informes y objetivos requieren proyecciones temporales autorizadas. El
        dashboard permite consultar la instantánea sintética y filtrar actividad
        y altas por fecha.
      </Unavailable>
      <Link href="/dashboard" className="text-sm font-semibold text-indigo-600">
        Abrir dashboard
      </Link>
    </div>
  )
}
