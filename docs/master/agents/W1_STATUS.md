# W1 — Backend, Data, Supabase & Integration

- Timestamp: 2026-09-25
- Branch: `w1/bootstrap-sanitized`
- Baseline: `w4/security-baseline@44375b0`
- Estado: gate local completo verde; clean-clone remoto pendiente

## Trabajo completado

- Snapshot funcional reconstruido con historia W1 limpia en `85695ab`.
- Nueve hallazgos Secret Scan clasificados: siete falsos positivos y dos
  fixtures dummy; cero credenciales reales/históricas.
- Primera migración tenant/RLS versionada offline en `a1f7cc3`; no aplicada.
- Resolver multi-workspace publicado en `e549aff`: `workspace_members` es la
  única autoridad y `profiles.workspace_id` solo una preferencia.
- Contratos de presentación/API `telecom.v0` publicados en `69b7d50` para
  customer/company, contracts, services/lines y dashboard.
- Gate local completo verde: instalación reproducible, lint, typecheck, 12 tests,
  build, audit (0 vulnerabilidades), guardrails W4, migration policy y Secret
  Scan de toda la historia W1 (0 hallazgos).

## Trabajo actual

- Repetir el gate desde clon limpio remoto.
- Publicar PR sustituto y cerrar #11 solo después de CI verde.

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

Ver `docs/master/11_HANDOFFS.md`. W2, W3 y W4 requieren notificación con el commit
publicado definitivo.

## Blockers

- Revisión y aceptación W4 de la migración tenant/RLS.
- Autorización humana posterior para cualquier apply a Supabase.
- PostgreSQL/Supabase local no disponible; la validación actual es estática y de
  build/tests.

## Guardas activas

- El proyecto Supabase nuevo permanece no tocable.
- Sin merge y sin despliegue.
