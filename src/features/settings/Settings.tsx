'use client'
import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { SectionCard } from '@/components/SectionCard'
import { Badge } from '@/components/Badge'
import {
  Tabs,
  PreviewNotice,
  Unavailable,
  control,
  primary,
} from '@/features/product/ui'
import { useLocalCompany, type CompanyForm } from './LocalCompany'
const areas = [
  'Perfil',
  'Empresa',
  'Datos fiscales',
  'Equipo y roles',
  'Integraciones',
  'Seguridad',
  'Notificaciones',
  'Facturación',
  'Asistente IA',
]
const labels: Record<keyof CompanyForm, string> = {
  legalName: 'Razón social',
  tradeName: 'Nombre comercial',
  taxId: 'NIF / CIF',
  address: 'Dirección fiscal',
  postalCode: 'Código postal',
  city: 'Ciudad',
  province: 'Provincia',
  country: 'País',
  email: 'Email de empresa',
  phone: 'Teléfono de empresa',
  website: 'Sitio web',
}
const integrations = [
  ['Google Calendar', 'Calendario por usuario; selección y sincronización'],
  ['Email', 'Correo y notificaciones comerciales'],
  ['WhatsApp Business', 'Conversaciones e intercambio con clientes'],
  ['n8n', 'Automatizaciones e integración de eventos'],
  ['Documentos', 'Storage privado y enlaces firmados'],
]
export function Settings() {
  const { company, setCompany } = useLocalCompany(),
    [form, setForm] = useState(company),
    [area, setArea] = useState('Empresa'),
    [saved, setSaved] = useState(false)
  function save() {
    setCompany(structuredClone(form))
    setSaved(true)
  }
  const fields = (keys: (keyof CompanyForm)[]) => (
    <div className="grid gap-4 sm:grid-cols-2">
      {keys.map((k) => (
        <label key={k} className="text-xs font-medium text-slate-500">
          {labels[k]}
          <input
            aria-label={labels[k]}
            maxLength={k === 'address' ? 250 : 150}
            type={k === 'email' ? 'email' : 'text'}
            className={`${control} mt-1 w-full`}
            value={form[k]}
            onChange={(e) => {
              setForm({ ...form, [k]: e.target.value })
              setSaved(false)
            }}
          />
        </label>
      ))}
    </div>
  )
  return (
    <div className="space-y-4">
      <PageHeader
        title="Configuración"
        description="Tu empresa, equipo y conexiones; estado claro de cada capacidad"
      />
      <PreviewNotice />
      <Tabs items={areas} value={area} onChange={setArea} />
      <section
        role="tabpanel"
        id={`panel-${area}`}
        aria-labelledby={`tab-${area}`}
        className="space-y-4"
      >
        {['Empresa', 'Datos fiscales'].includes(area) ? (
          <SectionCard
            title={
              area === 'Empresa'
                ? 'Identidad de empresa'
                : 'Identidad fiscal del emisor'
            }
            description="Formulario local de prueba; no modifica la configuración del servidor"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault()
                save()
              }}
              className="space-y-4"
            >
              {area === 'Empresa' ? (
                <>
                  <div className="flex items-center gap-4 rounded-lg bg-slate-50 p-4">
                    <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-100 text-xl font-bold text-indigo-700">
                      {(form.tradeName || form.legalName || 'TC')
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        Logo de empresa
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Subida pendiente de Storage autorizado
                      </p>
                      <button
                        type="button"
                        disabled
                        className={`${control} mt-2`}
                      >
                        Cambiar logo
                      </button>
                    </div>
                  </div>
                  {fields([
                    'legalName',
                    'tradeName',
                    'email',
                    'phone',
                    'website',
                  ])}
                </>
              ) : (
                fields([
                  'legalName',
                  'taxId',
                  'address',
                  'postalCode',
                  'city',
                  'province',
                  'country',
                ])
              )}
              <p className="text-xs text-slate-500">
                Usa datos de prueba. Los borradores PRO capturan una copia del
                emisor de esta sesión.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button className={primary}>Guardar en esta sesión</button>
                <p role="status" className="text-xs text-emerald-700">
                  {saved
                    ? 'Cambios locales guardados. Se perderán al recargar.'
                    : ''}
                </p>
                <button type="button" className={control} disabled>
                  Guardar en servidor
                </button>
              </div>
            </form>
          </SectionCard>
        ) : area === 'Integraciones' ? (
          <div className="grid gap-4 md:grid-cols-2">
            {integrations.map(([name, description]) => (
              <SectionCard
                key={name}
                title={name}
                action={
                  <Badge variant="warning">Sin conexión verificada</Badge>
                }
              >
                <p className="mb-4 text-xs text-slate-500">{description}</p>
                <button disabled className={control}>
                  Conectar
                </button>
              </SectionCard>
            ))}
          </div>
        ) : area === 'Equipo y roles' ? (
          <SectionCard title="Equipo y permisos">
            <Unavailable title="Equipo no disponible">
              El listado y las invitaciones necesitan operaciones de equipo
              autorizadas. El navegador no determina permisos.
            </Unavailable>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[550px] text-left text-xs">
                <caption className="mb-2 text-left text-xs text-slate-500">
                  Áreas que debe cubrir el contrato de roles; no son permisos
                  otorgados
                </caption>
                <thead className="bg-slate-50">
                  <tr>
                    {['Área', 'Consulta', 'Edición', 'Gestión sensible'].map(
                      (h) => (
                        <th className="p-3" key={h}>
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {[
                    'Clientes y cartera',
                    'Facturas e identidad fiscal',
                    'Equipo e integraciones',
                    'Asistente y acciones',
                  ].map((a) => (
                    <tr className="border-b" key={a}>
                      <td className="p-3 font-semibold">{a}</td>
                      <td className="p-3">Según servidor</td>
                      <td className="p-3">Según servidor</td>
                      <td className="p-3">Confirmación y permiso</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className={`${control} mt-4`} disabled>
              Invitar al equipo
            </button>
          </SectionCard>
        ) : area === 'Perfil' ? (
          <SectionCard title="Perfil de usuario">
            <Unavailable title="Perfil en modo demostración">
              Nombre, avatar y datos de contacto se editarán mediante la sesión
              autenticada. No se rellenan con datos personales reales.
            </Unavailable>
          </SectionCard>
        ) : area === 'Facturación' ? (
          <SectionCard title="Configuración de Facturación PRO">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['Serie predeterminada', 'A · solo propuesta local'],
                ['Divisa de ejemplo', 'EUR'],
                ['Fiscalidad', 'Revisión humana obligatoria'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-400">{k}</p>
                  <p className="mt-1 text-sm font-semibold">{v}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Numeración, fiscalidad y series reales deben publicarse en un
              contrato de configuración autorizado. No se emiten facturas desde
              esta configuración.
            </p>
          </SectionCard>
        ) : area === 'Asistente IA' ? (
          <SectionCard title="Estado del asistente">
            <Badge variant="indigo">READ sintético</Badge>
            <p className="mt-3 text-sm text-slate-700">
              Interfaz conectada al runtime de consulta W3 y a datos de prueba.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Modelo en vivo, historial persistente y acciones no están
              conectados. No se exponen claves ni configuración secreta.
            </p>
          </SectionCard>
        ) : (
          <SectionCard title={area}>
            <Unavailable
              title={
                area === 'Seguridad'
                  ? 'Seguridad administrada por el servidor'
                  : 'Preferencias pendientes de contrato'
              }
            >
              {area === 'Seguridad'
                ? 'La identidad de workspace, la revocación, RLS y los permisos permanecen en la arquitectura nueva. No hay selector de autoridad ni claves en el navegador.'
                : 'Recordatorios de tareas, renovaciones y permanencias requieren el servicio de notificaciones y sus preferencias autorizadas.'}
            </Unavailable>
          </SectionCard>
        )}
      </section>
    </div>
  )
}
