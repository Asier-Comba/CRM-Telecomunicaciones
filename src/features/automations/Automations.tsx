'use client'
import { useState } from 'react'
import { Zap, LockKeyhole } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/Badge'
import { PreviewNotice, Drawer, control } from '@/features/product/ui'
const rules = [
  {
    name: 'Renovaciones próximas',
    trigger: 'Una renovación entra en su ventana de atención',
    result: 'Proponer un recordatorio comercial',
    requires:
      'Contrato autorizado de renovación y preferencias de notificación',
  },
  {
    name: 'Fin de permanencia',
    trigger: 'La permanencia se acerca a su fecha final',
    result: 'Proponer una alerta al responsable',
    requires:
      'Fecha y estado verificados; no confundir permanencia con fin de contrato',
  },
  {
    name: 'Seguimiento comercial',
    trigger: 'Una oportunidad no tiene próxima acción',
    result: 'Proponer una tarea vinculada al cliente',
    requires: 'CRUD seguro de tareas e idempotencia',
  },
  {
    name: 'Reuniones y llamadas',
    trigger: 'Un evento comercial tiene un recordatorio configurado',
    result: 'Notificar al responsable del evento',
    requires: 'Calendario autorizado y preferencias de usuario',
  },
  {
    name: 'Documentación de servicio',
    trigger: 'Un documento cambia su estado autorizado',
    result: 'Notificar revisión o documentación pendiente',
    requires: 'Storage/RLS y eventos de documento',
  },
  {
    name: 'Email y WhatsApp',
    trigger: 'Un flujo autorizado recibe un evento comercial',
    result: 'Preparar comunicación según consentimiento y revisión',
    requires: 'Proveedor, webhook, consentimiento, permisos y auditoría',
  },
]
export function Automations() {
  const [selected, setSelected] = useState<(typeof rules)[number] | null>(null)
  return (
    <div className="space-y-4">
      <PageHeader
        title="Automatizaciones"
        description="Recordatorios y flujos para la operativa telecom"
        action={<Badge variant="warning">n8n sin conexión verificada</Badge>}
      />
      <PreviewNotice />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rules.map((r) => (
          <section
            key={r.name}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-3 flex justify-between">
              <Zap className="h-8 w-8 rounded-lg bg-indigo-50 p-2 text-indigo-600" />
              <Badge>Diseño de flujo</Badge>
            </div>
            <h2 className="text-sm font-semibold text-slate-800">{r.name}</h2>
            <p className="mt-2 min-h-10 text-xs leading-5 text-slate-500">
              {r.result}
            </p>
            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                className="text-xs font-semibold text-indigo-600"
                onClick={() => setSelected(r)}
              >
                Ver condiciones
              </button>
              <button disabled className={control}>
                Activar
              </button>
            </div>
          </section>
        ))}
      </div>
      <div className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <LockKeyhole className="h-5 w-5 shrink-0 text-amber-500" />
        <p className="text-xs leading-5 text-slate-500">
          n8n ejecuta integraciones; el runtime IA W3 conserva las decisiones
          semánticas y los permisos. No se ejecutan flujos, webhooks ni envíos
          desde esta preview.
        </p>
      </div>
      {selected && (
        <Drawer title={selected.name} onClose={() => setSelected(null)}>
          {[
            ['Disparador', selected.trigger],
            ['Resultado esperado', selected.result],
            ['Contrato necesario', selected.requires],
            ['Estado', 'Diseño; sin ejecuciones ni provider conectado'],
          ].map(([label, text]) => (
            <div key={label}>
              <h3 className="text-xs font-semibold text-slate-400">{label}</h3>
              <p className="mt-1 text-sm text-slate-800">{text}</p>
            </div>
          ))}
          <button disabled className={control}>
            Ejecutar flujo
          </button>
        </Drawer>
      )}
    </div>
  )
}
