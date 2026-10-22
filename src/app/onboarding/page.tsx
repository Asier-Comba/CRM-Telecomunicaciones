'use client'

// /onboarding — primer arranque de un cliente nuevo. Un usuario autenticado que
// todavía no tiene workspace crea aquí su espacio de trabajo VACÍO (sin demo).
// Esta ruta vive fuera de (saas), así que NO pasa por AuthGate (que es justo
// quien redirige aquí cuando detecta sesión válida sin workspace).

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Building2, CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/Button'
import { cn } from '@/lib/utils'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import { BRAND } from '@/lib/brand'

type WorkspaceReceipt = { workspace: { id: string; name: string; slug: string; role: string; created: boolean } }
// A browser interlock, not an idempotency key or proof of a workspace. It stores
// no form data and is scoped to the user returned by the existing session read.
const pendingKeyFor = (userId: string) => `crm:onboarding:pending:v1:${userId}`
const refusalStatus: Record<string, number> = {
  invalid_json: 400, invalid_workspace: 400, unauthenticated: 401,
  slug_taken: 409, workspace_suspended: 403,
}
// Validate the existing provision_workspace response; this does not authorize access.
function isWorkspaceReceipt(value: unknown, status: number): value is WorkspaceReceipt {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const workspace = (value as { workspace?: unknown }).workspace
  if (!workspace || typeof workspace !== 'object' || Array.isArray(workspace)) return false
  const w = workspace as Record<string, unknown>
  return typeof w.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(w.id)
    && typeof w.name === 'string' && w.name.trim().length > 0 && w.name.length <= 160
    && typeof w.slug === 'string' && w.slug.length <= 64 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(w.slug)
    && typeof w.role === 'string' && w.role.trim().length > 0
    && typeof w.created === 'boolean' && status === (w.created ? 201 : 200)
}

export default function OnboardingPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [checkError, setCheckError] = useState(false)
  const [checkAttempt, setCheckAttempt] = useState(0)
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [creationUnconfirmed, setCreationUnconfirmed] = useState(false)
  const [recoveryUnavailable, setRecoveryUnavailable] = useState(false)
  const pendingKey = useRef<string | null>(null)
  const submitInFlight = useRef(false)
  const isMounted = useRef(false)

  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])

  // Verificamos la sesión al entrar: sin sesión → login; si ya tiene workspace
  // → dashboard (evita re-onboarding y bucles si navegan aquí a mano).
  useEffect(() => {
    let mounted = true
    const check = async () => {
      try {
        const supabase = getSupabaseBrowserClient()
        if (!supabase) { router.replace('/login'); return }
        const { data, error: sessionError } = await supabase.auth.getSession()
        if (!mounted) return
        if (sessionError) throw sessionError
        if (!data.session) { router.replace('/login'); return }

        const { data: memberships, error: membershipError } = await supabase
          .from('workspace_members')
          .select('id, workspace:workspaces!inner(status)')
          .eq('user_id', data.session.user.id)
          .eq('status', 'active')
          .eq('workspace.status', 'active')
          .limit(1)
        if (!mounted) return
        if (membershipError) throw membershipError
        const key = pendingKeyFor(data.session.user.id)
        if (memberships?.length) {
          // Storage never grants access. The authenticated membership read above
          // confirms access even when browser storage is unavailable.
          try { localStorage.removeItem(key) } catch { /* Keep a conservative marker. */ }
          router.replace('/dashboard')
          return
        }

        pendingKey.current = key
        try {
          setCreationUnconfirmed(localStorage.getItem(key) !== null)
          setRecoveryUnavailable(false)
        } catch {
          setRecoveryUnavailable(true)
        }

        setChecking(false)
      } catch {
        if (!mounted) return
        setCheckError(true)
        setChecking(false)
      }
    }
    void check()
    return () => { mounted = false }
  }, [router, checkAttempt])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitInFlight.current || submitting || creationUnconfirmed || recoveryUnavailable) return
    const cleanName = name.trim()
    if (!cleanName) {
      toast.error('Pon el nombre de tu empresa', { description: 'Así personalizamos tu espacio de trabajo.' })
      return
    }
    const key = pendingKey.current
    if (!key) { setCheckError(true); return }
    // Persist before sending: a reload or navigation can happen before a reply.
    // An unresolved marker can only trigger reads, never another POST here.
    try {
      if (localStorage.getItem(key) !== null) { setCreationUnconfirmed(true); return }
      localStorage.setItem(key, 'pending')
      if (localStorage.getItem(key) !== 'pending') throw Error('RECOVERY_STORAGE_UNAVAILABLE')
    } catch {
      setRecoveryUnavailable(true)
      return
    }
    submitInFlight.current = true
    setSubmitting(true)
    try {
      const res = await fetch('/api/onboarding/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName }),
      })
      const payload: unknown = await res.json().catch(() => null)
      if (!isMounted.current) return
      if (res.status >= 500) {
        setCreationUnconfirmed(true)
        return
      }
      if (!res.ok) {
        const code = payload && typeof payload === 'object' ? (payload as { code?: unknown }).code : null
        if (typeof code !== 'string' || refusalStatus[code] !== res.status) {
          setCreationUnconfirmed(true)
          return
        }
        // Only the existing explicit no-effect refusals allow another attempt.
        localStorage.removeItem(key)
        const error = payload && typeof payload === 'object' ? (payload as { error?: unknown }).error : null
        toast.error('No se pudo crear tu espacio', {
          description: typeof error === 'string' ? error : 'Inténtalo de nuevo o contacta con el responsable.',
        })
        return
      }
      if (!isWorkspaceReceipt(payload, res.status)) {
        setCreationUnconfirmed(true)
        return
      }
      toast.success(payload.workspace.created ? 'Espacio de trabajo listo' : 'Acceso a tu espacio confirmado', {
        description: payload.workspace.created ? 'Tu CRM está vacío y listo para empezar.' : 'Continúa en tu espacio de trabajo existente.',
      })
      router.replace('/dashboard')
      router.refresh()
    } catch {
      if (isMounted.current) setCreationUnconfirmed(true)
    } finally {
      submitInFlight.current = false
      if (isMounted.current) setSubmitting(false)
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f7f7f5] text-gray-900">
        <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
          Preparando tu espacio…
        </div>
      </div>
    )
  }

  if (checkError || creationUnconfirmed || recoveryUnavailable) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#f7f7f5] px-6 py-12 text-gray-900">
        <div className="w-full max-w-[440px] rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div role="alert">
            <h1 className="text-xl font-semibold tracking-tight">{checkError ? 'No hemos podido comprobar tu acceso' : recoveryUnavailable ? 'No podemos proteger la recuperación' : 'No hemos podido confirmar el alta'}</h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {checkError
                ? 'Necesitamos comprobar tu sesión y tu empresa antes de continuar. Reintenta la comprobación.'
                : recoveryUnavailable
                  ? 'El navegador no permite guardar el estado del alta. Habilita el almacenamiento para este sitio y vuelve a comprobar tu acceso.'
                  : 'Puede que tu espacio ya esté creado. Comprueba tu acceso sin repetir el alta. Si sigue pendiente, contacta con el responsable.'}
            </p>
          </div>
          <Button className="mt-5 min-h-11 w-full" onClick={() => {
            setChecking(true)
            setCheckError(false)
            setCheckAttempt(attempt => attempt + 1)
          }}>
            {checkError || recoveryUnavailable ? 'Reintentar comprobación' : 'Comprobar acceso'}
          </Button>
        </div>
      </main>
    )
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#f7f7f5] text-gray-900">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            'radial-gradient(circle at 75% 18%, rgba(15,23,42,0.04), transparent 55%), linear-gradient(180deg, #fafaf7 0%, #f3f3ef 100%)',
        }}
      />
      <main className="relative flex min-h-dvh items-center justify-center px-6 py-12">
        <div className="w-full max-w-[440px]">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-950 text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="text-base font-semibold tracking-tight text-gray-950">{BRAND.appName}</p>
              <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">Primer arranque</p>
            </div>
          </div>

          <h1 className="text-[2rem] font-semibold leading-[1.1] tracking-tight text-gray-950">
            Crea tu espacio de trabajo
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Tu CRM empezará vacío y limpio, listo para añadir tus clientes y operaciones reales.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold tracking-wide text-gray-700">Nombre de tu empresa</span>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ej. Telecom Norte"
                  autoFocus
                  maxLength={80}
                  className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-3.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                />
              </div>
            </label>

            <Button
              className={cn(
                'h-12 w-full gap-2 rounded-xl bg-gray-950 text-sm font-semibold text-white shadow-md shadow-gray-950/15 hover:bg-gray-900',
                !name.trim() && 'cursor-not-allowed opacity-60',
              )}
              variant="primary"
              loading={submitting}
              aria-disabled={!name.trim()}
            >
              Crear y empezar
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <ul className="mt-8 space-y-2.5 border-t border-gray-100 pt-6">
            {[
              'Sin datos de ejemplo: empiezas de cero, solo lo tuyo.',
              'Asistente IA incluido desde el primer día.',
              'Tus clientes, contratos y servicios en un único lugar.',
            ].map((text) => (
              <li key={text} className="flex items-start gap-2.5 text-sm text-gray-600">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                {text}
              </li>
            ))}
          </ul>

          <p className="mt-6 flex items-center gap-1.5 text-[11px] text-gray-400">
            <Sparkles className="h-3.5 w-3.5" />
            Podrás cambiar el nombre y la configuración más adelante.
          </p>
        </div>
      </main>
    </div>
  )
}
