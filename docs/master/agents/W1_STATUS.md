# W1 — Backend, Data, Supabase & Integration

- Timestamp: 2026-09-25
- Branch: `w1/bootstrap-sanitized`
- Baseline: `w4/security-baseline@bec6b2c`
- PR: [#13](https://github.com/Asier-Comba/CRM-Telecomunicaciones/pull/13) (draft)
- Estado: gate local y clean-clone remoto verdes; CI GitHub pendiente

## Trabajo completado

- Snapshot funcional reconstruido con historia W1 limpia en `85695ab`.
- Nueve hallazgos Secret Scan clasificados: siete falsos positivos y dos
  fixtures dummy; cero credenciales reales/históricas.
- Primera migración tenant/RLS versionada offline en `a1f7cc3`; no aplicada.
- Resolver multi-workspace publicado en `e549aff`: `workspace_members` es la
  única autoridad y `profiles.workspace_id` solo una preferencia.
- Contratos de presentación/API `telecom.v0` publicados en `69b7d50` para
  customer/company, contracts, services/lines y dashboard.
- Gate local y clon remoto limpio verdes en `9f633cd`: instalación reproducible,
  lint, typecheck, 15 tests,
  build, audit (0 vulnerabilidades), guardrails W4, migration policy y Secret
  Scan de toda la historia W1 (0 hallazgos).
- Baseline W4 `bec6b2c` integrada por merge no destructivo; 22 rutas sensibles
  registradas y las no aceptadas continúan deshabilitadas para producción.

## Trabajo actual

- Esperar CI de PR #13 y corregir cualquier discrepancia reproducible.
- Cerrar #11 como superseded solo después de CI verde en #13.
- Solicitar revisión W4; Supabase continúa sin tocar.

## Siguiente tarea segura

Continuar el modelo normalizado telecom offline, empezando por
customers/contacts/contracts/services/lines y permanencias explícitas, después
de cerrar la evidencia P0.

## Contratos publicados

- `docs/master/W1_TENANT_AUTHORIZATION.md`
- `docs/master/W1_DATA_CONTRACTS_V0.md`
- `src/lib/workspace-roles.ts`
- `src/lib/contracts/telecom-v0.ts`
- `docs/master/W1_SECRET_SCAN_TRIAGE.md`

## Handoffs

Ver `docs/master/11_HANDOFFS.md`. El head funcional validado y publicado es
`9f633cd`.

## Blockers

- Revisión y aceptación W4 de la migración tenant/RLS.
- Autorización humana posterior para cualquier apply a Supabase.
- PostgreSQL/Supabase local no disponible; la validación actual es estática y de
  build/tests.

## Guardas activas

- El proyecto Supabase nuevo permanece no tocable.
- Sin merge y sin despliegue.
