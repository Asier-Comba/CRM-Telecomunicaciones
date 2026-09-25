# 04 — Arquitectura IA

- Versión: 0.1
- Fecha: 2026-09-25
- Commit base: `6ea06e4`
- Owner: W3
- Estado: referencia de coordinación
- Supersedes: ninguno

La rama base conserva el planner semántico: el modelo interpreta, código tipado
valida/ejecuta y PostgreSQL aporta la verdad. W1 garantiza contratos de datos y
queries tenant-scoped; W3 mantiene planner, capabilities, tools y evals.

No ampliar árboles de regex salvo validaciones deterministas. Las escrituras
sensibles conservan preview, confirmación, idempotencia y verificación.
