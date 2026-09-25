# 07 — Testing gates

- Versión: 0.1
- Fecha: 2026-09-25
- Commit base: `6ea06e4`
- Owner: W4
- Estado: borrador
- Supersedes: ninguno

Gate mínimo: instalación reproducible, lint, `tsc --noEmit`, tests relevantes,
build, secret scan, auditoría de migraciones y Playwright crítico en staging.

`npm run audit:supabase-repro:strict` debe ser verde antes de declarar que una
base vacía reproduce el backend. Mientras el P0 siga abierto, el comando
informativo documenta el drift y el modo estricto falla intencionadamente.
