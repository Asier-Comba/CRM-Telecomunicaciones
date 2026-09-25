# CRM Telecomunicaciones

Base canónica del CRM SaaS Telecom para gestión comercial multiempresa. El primer
piloto previsto es Arizan / distribución Vodafone empresas.

## Estado del bootstrap

La aplicación parte del snapshot funcional `general-semantic-planner` del
repositorio histórico inmobiliario, importado como código de referencia y sin
conservar ninguna relación de escritura con ese repositorio. La seguridad, CI y
runbooks de W4 se mantienen como baseline del nuevo repositorio.

El frontend todavía conserva conceptos inmobiliarios que serán reemplazados por
dominio telecom de forma incremental. La base Supabase canónica se está
reconstruyendo desde cero: los SQL históricos están en
`supabase/legacy-migrations` y no se aplican automáticamente.

## Stack

- Next.js 16, React 19 y TypeScript 5.
- Supabase para Auth, PostgreSQL/RLS y Storage.
- Tailwind CSS 4, Framer Motion, Lucide y Recharts.
- Plano de IA con contratos deterministas y n8n como integración externa.

## Desarrollo local

Requiere Node 24, fijado en `.nvmrc`.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Las variables reales solo viven en `.env.local` o en el gestor de secretos del
entorno. Nunca deben añadirse al repositorio.

## Gates

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run audit:supabase-repro
```

El auditor Supabase es informativo durante el P0. Su modo estricto debe fallar
hasta que `supabase/migrations` pueda reconstruir una base vacía completa.

## Repositorios

- Desarrollo y escritura: `Asier-Comba/CRM-Telecomunicaciones`.
- Referencia histórica read-only: `iazticontact/crm-inmobiliario-demo`.

La documentación canónica está en `docs/master/`; los estados de cada Work están
en `docs/master/agents/`.

## Licencia

Propietario. Uso interno y para clientes autorizados.
