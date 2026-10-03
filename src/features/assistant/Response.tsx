'use client'
import type { PreviewReply } from '@/lib/telecom-preview/reply'
import { Badge } from '@/components/Badge'
const hidden = new Set(['source', 'entity', 'as_of', 'freshness'])
export function AssistantResponseView({ reply }: { reply: PreviewReply }) {
  return (
    <div className="space-y-3">
      {reply.responses.map((response, index) => (
        <section
          key={index}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant={response.grounded ? 'success' : 'warning'}>
              {response.status}
            </Badge>
            {response.meta.partial && (
              <Badge variant="warning">Cobertura parcial</Badge>
            )}
          </div>
          <p className="text-sm leading-6 text-slate-800">{response.answer}</p>
          {response.blocks.table && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <caption className="sr-only">
                  Resultado validado de la consulta
                </caption>
                <thead className="bg-slate-50">
                  <tr>
                    {response.blocks.table.columns
                      .filter((c) => !hidden.has(c.key))
                      .map((c) => (
                        <th
                          key={c.key}
                          scope="col"
                          className="whitespace-nowrap border-b p-2 font-semibold text-slate-500"
                        >
                          {c.label}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {response.blocks.table.rows.map((row, i) => (
                    <tr key={i}>
                      {response.blocks
                        .table!.columns.filter((c) => !hidden.has(c.key))
                        .map((c) => (
                          <td
                            key={c.key}
                            className="min-w-28 max-w-60 break-words border-b border-slate-100 p-2 text-slate-700"
                          >
                            {row[c.key] === null
                              ? 'No disponible'
                              : String(row[c.key])}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {response.blocks.table.truncated && (
                <p className="mt-2 text-xs text-amber-700">
                  Resultados parciales. Continuación no disponible en esta
                  preview.
                </p>
              )}
            </div>
          )}
          {response.meta.capability && (
            <details className="mt-3 text-xs text-slate-500">
              <summary className="cursor-pointer font-semibold">
                Fuentes CRM
              </summary>
              <p className="mt-2">
                Datos sintéticos ·{' '}
                {response.meta.partial
                  ? 'Cobertura parcial'
                  : 'Cobertura completa de esta lectura'}
              </p>
              <p className="mt-1 font-mono text-[10px]">
                {response.meta.capability}
              </p>
            </details>
          )}
        </section>
      ))}
    </div>
  )
}
