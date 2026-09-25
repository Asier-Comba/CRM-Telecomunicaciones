# W1 — Backend, Data, Supabase & Integration

- Timestamp: 2026-09-25
- Branch: `w1/bootstrap-sanitized`
- Baseline: `w4/security-baseline@44375b0`
- Estado: P0 en validación reproducible

## Trabajo completado

- Snapshot funcional reconstruido con historia W1 limpia en `e7d5b43`.
- Nueve hallazgos Secret Scan clasificados: siete falsos positivos y dos
  fixtures dummy; cero credenciales reales/históricas.
- Primera migración tenant/RLS versionada offline en `00cd745`; no aplicada.
- Resolver multi-workspace publicado en `bf4b362`: `workspace_members` es la
  única autoridad y `profiles.workspace_id` solo una preferencia.
- Contratos de presentación/API `telecom.v0` publicados en `c545dbb` para
  customer/company, contracts, services/lines y dashboard.

## Trabajo actual

- Ejecutar gate completo y Secret Scan sobre toda la historia nueva.
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
