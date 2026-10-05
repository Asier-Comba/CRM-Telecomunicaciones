'use client'
import { useState } from 'react'
import { FileText, Upload } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import {
  PreviewNotice,
  Unavailable,
  control,
  primary,
} from '@/features/product/ui'
const categories = [
  'Contrato',
  'Factura',
  'Documento de operador',
  'Portabilidad',
  'Identificación empresarial',
  'Acuerdo de servicio',
  'Propuesta',
  'Otro',
]
export function Documents() {
  const [category, setCategory] = useState('Contrato')
  return (
    <div className="space-y-4">
      <PageHeader
        title="Documentos"
        description="Documentación privada vinculada a la empresa y su cartera"
        action={
          <button className={primary} disabled>
            <Upload className="h-4 w-4" />
            Subir documento
          </button>
        }
      />
      <PreviewNotice />
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-1 rounded-xl border bg-white p-3">
          {categories.map((c) => (
            <button
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs ${c === category ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-slate-500'}`}
              key={c}
              onClick={() => setCategory(c)}
            >
              <FileText className="h-4 w-4" />
              {c}
            </button>
          ))}
        </aside>
        <section className="space-y-4 rounded-xl border bg-white p-4">
          <header className="flex flex-wrap gap-2">
            <input
              aria-label="Buscar documentos"
              placeholder="Búsqueda pendiente de lectura autorizada"
              disabled
              className={`${control} min-w-0 flex-1`}
            />
            <button disabled className={control}>
              Filtrar por cliente
            </button>
          </header>
          <h2 className="text-sm font-semibold text-slate-800">{category}</h2>
          <Unavailable title="Metadatos documentales no disponibles">
            Los documentos se listarán por cliente, contrato o servicio con
            permisos de Storage/RLS. Descargas firmadas y subida requieren
            contratos aceptados. No hay archivos ficticios ni enlaces públicos.
          </Unavailable>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              'Privado por workspace',
              'Vinculado a una entidad',
              'Acceso revisado por recurso',
            ].map((text) => (
              <div
                key={text}
                className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500"
              >
                {text}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
