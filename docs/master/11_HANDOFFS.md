# 11 — Handoffs

- Versión: 0.4
- Fecha: 2026-09-25
- Owner: W1
- Estado: abierto

## HANDOFF FROM W1 TO W2/W3/W4

CONTRACT: Bootstrap del repositorio canónico

COMMIT: `85695ab` (snapshot saneado; rama `w1/bootstrap-sanitized`)

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
