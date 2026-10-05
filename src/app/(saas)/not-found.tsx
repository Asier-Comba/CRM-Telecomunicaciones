import Link from 'next/link'
import { PageHeader } from '@/components/PageHeader'
export default function NotFound() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Registro no disponible"
        description="No se puede abrir este registro con el acceso actual."
      />
      <Link href="/clients" className="text-sm font-semibold text-indigo-600">
        Volver a clientes
      </Link>
    </div>
  )
}
