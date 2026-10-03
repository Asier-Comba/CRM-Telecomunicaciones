import { PageSkeleton } from '@/components/PageSkeleton'
export default function Loading() {
  return (
    <div role="status" aria-label="Cargando módulo">
      <PageSkeleton variant="dashboard" />
    </div>
  )
}
