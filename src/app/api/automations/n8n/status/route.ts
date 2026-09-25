import { NextRequest, NextResponse } from 'next/server'
import { checkN8nStatus } from '@/lib/n8n-client'
import { resolveCaller } from '@/app/api/team/users/_helpers'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const caller = await resolveCaller(req)
  if ('error' in caller) {
    return NextResponse.json({ error: caller.error, code: caller.code }, { status: caller.status })
  }
  if (!caller.canManageMembers) {
    return NextResponse.json({ error: 'No tienes permisos para consultar automatizaciones.' }, { status: 403 })
  }

  const result = await checkN8nStatus()
  // Never expose credentials or the private n8n base URL.
  return NextResponse.json({
    ok: result.ok,
    status: result.status,
    reason: result.reason,
  })
}
