'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldCheck } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import { DEMO_MODE_KEY } from '@/lib/current-user'
import { BRAND } from '@/lib/brand'

// Call only after Auth has verified this token. Claims here bind two verified
// sessions; they never authorize a workspace, role or password write.
function verifiedSessionBinding(token: string, userId: string) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3 || !/^[A-Za-z0-9_-]+$/.test(parts[1])) return null
    const encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')))
    if (payload.sub !== userId || typeof payload.exp !== 'number' || !Number.isFinite(payload.exp) ||
        payload.exp <= Date.now() / 1000 || typeof payload.session_id !== 'string' ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(payload.session_id)) return null
    return payload.session_id as string
  } catch {
    return null
  }
}

export default function AuthCallbackPage() {
  const router = useRouter()
  const [message, setMessage] = useState('Confirmando sesión segura…')
  const completionStarted = useRef(false)

  useEffect(() => {
    if (completionStarted.current) return
    completionStarted.current = true
    const redirectToLoginError = (nextMessage: string) => {
      setMessage(nextMessage)
      setTimeout(() => router.replace('/login?error=callback'), 900)
    }

    const completeAuth = async () => {
      const searchParams = new URLSearchParams(window.location.search)
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const getParam = (key: string) => searchParams.get(key) || hashParams.get(key)
      const credentialKeys = ['access_token', 'refresh_token']
      const hasLinkCredentials = credentialKeys.some(key => searchParams.has(key) || hashParams.has(key))
      // Capture the opaque values privately, then remove them before any await
      // or SDK initialization. Fragment validation stays separate from PKCE.
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      if (hasLinkCredentials) window.history.replaceState(null, '', '/auth/callback')

      const supabase = getSupabaseBrowserClient()
      if (!supabase) {
        redirectToLoginError('Faltan variables de Supabase.')
        return
      }

      const errorDescription = getParam('error_description') || getParam('error')
      if (errorDescription) {
        redirectToLoginError('No se ha podido confirmar el enlace.')
        return
      }

      const code = getParam('code')
      let verifiedLinkUserId: string | null = null
      if (hasLinkCredentials) {
        const linkType = (hashParams.get('type') ?? '').toLowerCase()
        const queryType = (searchParams.get('type') ?? '').toLowerCase()
        if (credentialKeys.some(key => searchParams.has(key) || hashParams.getAll(key).length !== 1) ||
            !accessToken || !refreshToken || searchParams.has('code') || hashParams.has('code') ||
            hashParams.getAll('type').length !== 1 || searchParams.getAll('type').length > 1 ||
            !['invite', 'recovery'].includes(linkType) || (queryType && queryType !== linkType)) {
          redirectToLoginError('No se ha podido confirmar el enlace.')
          return
        }
        const previous = await supabase.auth.getSession()
        if (previous.error || previous.data.session) {
          redirectToLoginError('Abre el enlace en una sesión sin acceso iniciado.')
          return
        }
        // Validate and rotate in memory first: setSession alone verifies the
        // access token but can persist an unrelated or invalid refresh token.
        const temporary = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())!,
          { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
        )
        let checkedPair: { access_token: string; refresh_token: string } | null = null
        try {
          const original = await temporary.auth.getUser(accessToken)
          const originalId = original.data.user?.id
          if (original.error || !originalId || original.data.user?.is_anonymous === true) throw Error('LINK_NOT_VERIFIED')
          const binding = verifiedSessionBinding(accessToken, originalId)
          if (!binding) throw Error('LINK_NOT_VERIFIED')
          const renewed = await temporary.auth.refreshSession({ refresh_token: refreshToken })
          const session = renewed.data.session
          if (renewed.error || !session?.access_token || !session.refresh_token ||
              renewed.data.user?.id !== originalId || session.user?.id !== originalId) throw Error('LINK_NOT_VERIFIED')
          const verified = await temporary.auth.getUser(session.access_token)
          if (verified.error || verified.data.user?.id !== originalId ||
              verifiedSessionBinding(session.access_token, originalId) !== binding) throw Error('LINK_NOT_VERIFIED')
          checkedPair = { access_token: session.access_token, refresh_token: session.refresh_token }
          verifiedLinkUserId = originalId
        } finally {
          await temporary.auth.stopAutoRefresh()
        }
        // This recheck rejects an observed intervening login. It is not a
        // transaction or cross-tab exclusion guarantee.
        const current = await supabase.auth.getSession()
        if (current.error || current.data.session || !checkedPair || !verifiedLinkUserId) {
          redirectToLoginError('Abre el enlace en una sesión sin acceso iniciado.')
          return
        }
        const established = await supabase.auth.setSession(checkedPair)
        if (established.error || !established.data.session || !established.data.user ||
            established.data.session.user?.id !== verifiedLinkUserId || established.data.user.id !== verifiedLinkUserId) {
          redirectToLoginError('No se ha podido confirmar la sesión.')
          return
        }
        const verified = await supabase.auth.getUser()
        if (verified.error || !verified.data.user || typeof verified.data.user.id !== 'string' ||
            !verified.data.user.id || verified.data.user.id !== verifiedLinkUserId) {
          redirectToLoginError('No se ha podido confirmar la sesión.')
          return
        }
      }
      if (!hasLinkCredentials && (searchParams.has('code') || hashParams.has('code'))) {
        // createBrowserClient already exchanges PKCE during initialization.
        // Inspect that result rather than consuming the code a second time.
        const initialized = await supabase.auth.initialize()
        if (initialized.error || new URLSearchParams(window.location.search).has('code') ||
            new URLSearchParams(window.location.hash.replace(/^#/, '')).has('code')) {
          // An unconsumed code must not fall back to a previously stored session.
          redirectToLoginError('No se ha podido crear la sesión de Supabase.')
          return
        }
      }

      const { data, error } = await supabase.auth.getSession()
      if (error) {
        redirectToLoginError('No se ha podido recuperar la sesión.')
        return
      }
      if (verifiedLinkUserId && data.session?.user?.id !== verifiedLinkUserId) {
        redirectToLoginError('No se ha podido confirmar la sesión.')
        return
      }

      if (data.session) {
        window.localStorage.removeItem(DEMO_MODE_KEY)

        // `type` sólo elige navegación; no acredita destinatario, invitación,
        // pertenencia o rol. La identidad procede de Auth y los permisos del servidor.
        // Supabase añade `type` al callback link según el flujo:
        //   - invite     → primer acceso (usuario sin contraseña)
        //   - recovery   → reset password
        //   - signup/magiclink → entrada normal
        // En invite/recovery enviamos al usuario a /reset-password para que
        // defina (o cambie) su contraseña antes de entrar a la app.
        const flowType = (getParam('type') ?? '').toLowerCase()
        if (flowType === 'invite' || flowType === 'recovery') {
          setMessage(flowType === 'invite' ? 'Define tu contraseña para acceder…' : 'Sesión confirmada. Define tu nueva contraseña…')
          setTimeout(() => router.replace('/reset-password'), 600)
          return
        }

        setMessage('Sesión confirmada. Entrando al CRM…')
        setTimeout(() => router.replace('/dashboard'), 600)
        return
      }

      if (!code) {
        redirectToLoginError('El enlace no incluye código de confirmación.')
        return
      }

      setMessage('Email confirmado. Ya puedes iniciar sesión.')
      setTimeout(() => router.replace('/login'), 900)
    }

    void completeAuth().catch(() => redirectToLoginError('No se ha podido confirmar la sesión.'))
  }, [router])

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#050713] px-6 text-white">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.08] p-6 text-center shadow-2xl shadow-black/40 backdrop-blur-2xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-indigo-700">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <h1 className="text-lg font-bold">{BRAND.appName}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">{message}</p>
        <Loader2 className="mx-auto mt-5 h-5 w-5 animate-spin text-indigo-200" />
      </div>
    </main>
  )
}
