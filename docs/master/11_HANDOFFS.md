# 11 — Handoffs

- Versión: 0.5
- Fecha: 2026-09-25
- Owner: W1
- Estado: abierto

## HANDOFF FROM W1 TO W2/W3/W4

CONTRACT: Bootstrap del repositorio canónico

COMMIT: `85695ab` (snapshot saneado; rama `w1/bootstrap-sanitized`)

HEAD VALIDADO: `9f633cd`

PR: [#13](https://github.com/Asier-Comba/CRM-Telecomunicaciones/pull/13)

WHAT CHANGED: El snapshot funcional histórico se ha trasladado al repositorio
Telecom sobre la baseline W4. El SQL inmobiliario es ahora evidencia legacy y no
forma parte del pipeline canónico de migraciones.

WHAT IS STABLE: `origin` es `Asier-Comba/CRM-Telecomunicaciones`; el upstream
inmobiliario es read-only; `general-semantic-planner@6ea06e4` es la procedencia del
snapshot; CI y seguridad W4 se preservan.

ACTION REQUIRED:

- W2 debe resolver sus especificaciones contra la aplicación importada y los
  contratos v0 publicados por W1.
- W3 debe resolver su arquitectura/capabilities contra el runtime importado y los
  contratos tenant/entity/service, sin inventar schema.
- W4 debe revisar el bootstrap saneado, la migración tenant/RLS y los gates de
  aislamiento antes de aceptar esta base.

## HANDOFF FROM W1 TO W2/W3/W4 — autorización tenant

CONTRACT: `docs/master/W1_TENANT_AUTHORIZATION.md`

WHAT CHANGED: `workspace_members` es la única autoridad tenant; se publican los
roles `owner|admin|member|viewer`, resolución multi-workspace fail-closed y la
primera integración server-side en `/api/team/users`.

ACTION REQUIRED:

- W2 adapta tipos y selector activo sin convertir estado cliente en autorización.
- W3 obtiene `ActorContext` del resolver, nunca del modelo o payload.
- W4 revisa RLS/helpers/service-role y añade la matriz adversarial cross-tenant.

BLOCKERS: aceptación de W4 de la migración tenant/RLS. El proyecto Supabase nuevo
permanece expresamente no tocable; no se aplicará ninguna migración sin plan de
apply/rollback y autorización humana posterior.

## HANDOFF FROM W1 TO W2/W3 — contratos Telecom v0

CONTRACT: `docs/master/W1_DATA_CONTRACTS_V0.md` y
`src/lib/contracts/telecom-v0.ts`

COMMIT: `69b7d50`

WHAT CHANGED: se estabilizan los read models de customer/company, telecom
contract, services/lines y dashboard, incluida la semántica explícita de
frescura, vacío y error. El esquema físico continúa marcado DRAFT.

ACTION REQUIRED:

- W2 debe señalar únicamente los campos que bloqueen su primera slice Cliente
  360; cualquier extensión incompatible se versionará.
- W3 debe adaptar capabilities a estos contratos y devolver incompatibilidades,
  sin derivar roles o schema desde prompts/payloads.
- W4 debe verificar que el scope `workspace_id` y los datos sensibles reservados
  respetan la baseline de seguridad antes de aprobar DDL de dominio.

## HANDOFF FROM W1 TO W4 — inventario de rutas sensibles

CONTRACT: `.security/sensitive-routes.json`

WHAT CHANGED: la baseline W4 más reciente se integró sin force-push. Sus 22 rutas
detectadas quedan inventariadas; los endpoints no aceptados permanecen con
`productionEnabled: false`. El status/test n8n ahora exige manager de una
membresía activa, oculta la URL privada y limita pruebas antes de I/O; el envío
WhatsApp también se limita antes del proveedor.

IMPORTANT: `securityReviewed: true` significa que la ruta tiene clasificación y
finding W4 trazable, no aprobación de producción. La aceptación sigue bloqueada
por los findings de `ENDPOINT_SECURITY_REVIEW.md` y la matriz adversarial.

ACTION REQUIRED: W4 debe revisar el registro, el resolver y los hardenings antes
de cambiar cualquier `productionEnabled: false`.
