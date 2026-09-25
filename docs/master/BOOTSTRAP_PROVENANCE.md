# Procedencia del bootstrap canónico

- Fecha: 2026-09-25
- Owner: W1
- Estado: activo

## Repositorios

| Función | Repositorio | Política |
| --- | --- | --- |
| Desarrollo | `Asier-Comba/CRM-Telecomunicaciones` | Único destino de ramas, commits, PRs y CI |
| Referencia | `iazticontact/crm-inmobiliario-demo` | Read-only absoluto; push deshabilitado |

## Selección del snapshot

Se compararon `main`, `p71/conversation-state-core` y
`general-semantic-planner`. El snapshot elegido es
`general-semantic-planner@6ea06e4d20fab3bf2eaaa97232905aa98dc8e626` porque:

- contiene `main@ad3c06e` y está 22 commits por delante, 0 por detrás;
- contiene el planner semántico general y sus gates shadow más recientes;
- `p71/conversation-state-core@6592fc0` es ancestro del snapshot y queda 31
  commits por detrás;
- lint, TypeScript y build habían sido verificados sobre ese snapshot antes del
  traslado.

## Composición

La rama `w1/bootstrap-canonical` nace de `w4/security-baseline@4ef9a5a`. Los
archivos W4 existentes tienen prioridad y no se sobrescribieron. Se incorporaron
el código funcional, tests, assets y auditorías W1 del snapshot histórico.

Los cientos de informes inmobiliarios de fase no se importaron al nuevo repo. El
DDL útil permanece como evidencia en `docs/supabase` y
`supabase/legacy-migrations`; ninguna migración legacy se ejecuta desde el pipeline
canónico.

## Trabajo W2/W3 localizado

- W2: cinco commits sobre `general-semantic-planner` en
  `w2/frontend-audit-foundation`.
- W3: once commits sobre `general-semantic-planner` en
  `w3/assistant-runtime-foundation`.

No se mezclan dentro del bootstrap W1 para evitar reescribir ownership. Sus ramas
se trasladarán al repo nuevo y se integrarán mediante PRs después de publicar la
base canónica.
