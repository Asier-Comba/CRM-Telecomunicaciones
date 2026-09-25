import { NextRequest, NextResponse } from 'next/server'
import { checkN8nStatus, triggerN8nWorkflow } from '@/lib/n8n-client'
import { checkRateLimit } from '@/lib/assistant-guard'
import { resolveCaller } from '@/app/api/team/users/_helpers'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const caller = await resolveCaller(req)
  if ('error' in caller) {
    return NextResponse.json({ error: caller.error, code: caller.code }, { status: caller.status })
  }
  if (!caller.canManageMembers) {
    return NextResponse.json({ error: 'No tienes permisos para probar automatizaciones.' }, { status: 403 })
  }
  if (!checkRateLimit(`n8n-test:${caller.userId}:${caller.workspaceId}`, 3)) {
    return NextResponse.json({ error: 'Demasiadas pruebas. Espera un minuto.' }, { status: 429 })
  }

  const n8nStatus = await checkN8nStatus()

  if (!n8nStatus.ok) {
    return NextResponse.json({
      ok: false,
      simulated: n8nStatus.status === 'pending_config',
      status: n8nStatus.status,
      message:
        n8nStatus.status === 'pending_config'
          ? 'n8n no configurado en el servidor. Contacta con el equipo tecnico para configurar N8N_BASE_URL y N8N_API_KEY.'
          : 'n8n configurado pero no disponible. Verifica que la instancia este activa.',
    })
  }

  const result = await triggerN8nWorkflow('test-flow', {
    event_type: 'test_flow',
    source: 'nowcrm',
    mode: 'test',
    workspace_id: caller.workspaceId,
    timestamp: new Date().toISOString(),
  })

  return NextResponse.json({
    ok: result.ok,
    simulated: false,
    status: result.status,
    message: result.message,
  })
}
