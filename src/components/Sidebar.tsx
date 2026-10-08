'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  ChartNoAxesCombined,
  Users,
  RadioTower,
  Package,
  Layers3,
  ListTodo,
  BookOpen,
  Target,
  CalendarDays,
  Inbox,
  Zap,
  Bot,
  Receipt,
  Files,
  Settings,
  X,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import { useWorkspaceIdentity } from '@/components/WorkspaceIdentityProvider'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import { clearWorkspaceIdentityCache } from '@/lib/supabase-queries'
import { DEMO_MODE_KEY } from '@/lib/current-user'
import { useProduct } from '@/features/product/integration/Provider'
import { BRAND } from '@/lib/brand'
const items = [
  ['/dashboard', 'Dashboard', LayoutDashboard],
  ['/clients', 'Clientes', Users],
  ['/portfolio', 'Cartera Telecom', RadioTower],
  ['/services', 'Servicios', Layers3],
  ['/equipment', 'Equipos', Package],
  ['/attention', 'Centro de atención', ListTodo],
  ['/catalog', 'Catálogo Telecom', BookOpen],
  ['/opportunities', 'Oportunidades', Target],
  ['/calendar', 'Calendario', CalendarDays],
  ['/inbox', 'Inbox', Inbox],
  ['/automations', 'Automatizaciones', Zap],
  ['/assistant', 'Asistente IA', Bot],
  ['/facturacion', 'Facturación PRO', Receipt],
  ['/documents', 'Documentos', Files],
  ['/reports', 'Informes', ChartNoAxesCombined],
  ['/settings', 'Configuración', Settings],
] as const
export function Sidebar({ onClose }: { onClose?: () => void } = {}) {
  const {repository,display}=useProduct()
  const integrated=repository.mode==='integrated_local'
  const pathname = usePathname(),
    router = useRouter(),
    { currentUser } = useWorkspaceIdentity()
  async function logout() {
    window.localStorage.removeItem(DEMO_MODE_KEY)
    clearWorkspaceIdentityCache()
    if (integrated || !currentUser.isDemo) await getSupabaseBrowserClient()?.auth.signOut()
    router.replace('/login');router.refresh()
  }
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <RadioTower className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-bold tracking-tight text-slate-950">
            {BRAND.appName}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Business workspace
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Cerrar navegación"
            className="ml-auto p-1"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="m-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
        <p className="truncate text-xs font-semibold text-slate-800">
          {integrated?display?.company || (currentUser.isAuthenticated&&!currentUser.isFallback?currentUser.workspaceName:'Espacio autorizado'):currentUser.isDemo?BRAND.exampleWorkspaceName:currentUser.workspaceName || BRAND.workspaceName}
        </p>
        <p className="mt-1 text-[10px] text-slate-500">
          {!integrated&&currentUser.isDemo?'Demostración · solo lectura':'Acceso según permisos'}
        </p>
      </div>
      <nav
        aria-label="Navegación principal"
        className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2"
      >
        {items.map(([href, label, Icon]) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              {(!integrated && ['/automations','/inbox'].includes(href)) && (
                <span className="ml-auto rounded bg-slate-100 px-1 text-[9px] text-slate-500">
                  Vista
                </span>
              )}
            </Link>
          )
        })}
      </nav>
      <div className="m-3 rounded-lg bg-indigo-50 px-3 py-3">
        <p className="flex gap-2 text-xs font-semibold text-indigo-800">
          <ShieldCheck className="h-4 w-4" />
          {integrated?'Integración local':'Entorno de consulta'}
        </p>
        <p className="mt-1 text-[11px] leading-4 text-indigo-600">
          {integrated?'Cambios guardados con permisos en la base de prueba.':'Las acciones que requieren conexión aparecen desactivadas.'}
        </p>
      </div>
      <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-3">
        <button
          onClick={() => router.push('/settings')}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
            {display?.name?display.name.split(/\s+/).slice(0,2).map(n=>n[0]).join('').toUpperCase():integrated&&(!currentUser.isAuthenticated||currentUser.isFallback)?'·':currentUser.initials}
          </span>
          <span className="truncate text-xs font-medium text-slate-700">
            {display?.name || (integrated&&(!currentUser.isAuthenticated||currentUser.isFallback)?'Identidad pendiente':currentUser.name)}
          </span>
        </button>
        <button
          aria-label="Cerrar sesión"
          onClick={() => void logout()}
          className="p-2 text-slate-500 hover:text-indigo-600"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  )
}
