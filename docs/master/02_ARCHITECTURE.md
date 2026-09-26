# 02 — Arquitectura

- Versión: 0.1
- Fecha: 2026-09-26
- Base: `w4/security-baseline@10ee3aa`
- Owner: W1
- Estado: baseline observada
- Supersedes: ninguno

## Stack verificado

Next.js 16.3.6, React 19.2.4, TypeScript 5, Supabase/PostgreSQL/RLS,
Tailwind 4, Playwright, OpenAI, n8n, Google Calendar y WhatsApp/Meta.

## Boundaries objetivo

- `core`: identidad, workspace, clientes, tareas, calendario, actividad y archivos.
- `telecom`: cuentas, contratos, servicios, líneas, operadores, planes,
  permanencias, renovaciones e incidencias.
- `imports`: staging, mapping, validación, deduplicación, lotes y trazabilidad.
- `billing`: conservar `/facturacion` como dominio oficial; retirar la duplicidad
  legacy de forma progresiva.
- `assistant`: tools tipadas sobre repositorios; n8n como automatización/integración.

Las fronteras son objetivo de refactor incremental, no autorización para una
reescritura total.
