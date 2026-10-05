'use client'
import { PageHeader } from '@/components/PageHeader'
import { control } from '@/features/product/ui'
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="space-y-4">
      <PageHeader
        title="No se pudo cargar este módulo"
        description="Los datos no están disponibles ahora. Puedes reintentar la lectura."
      />
      <button onClick={reset} className={control}>
        Reintentar
      </button>
    </div>
  )
}
