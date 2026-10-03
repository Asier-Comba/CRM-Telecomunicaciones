# CRM Telecomunicaciones

Base canónica del CRM SaaS Telecom para gestión comercial multiempresa. El primer
piloto previsto es Arizan / distribución Vodafone empresas.

## Estado del bootstrap

La aplicación parte del snapshot funcional `general-semantic-planner` del
repositorio histórico inmobiliario, importado como código de referencia y sin
conservar ninguna relación de escritura con ese repositorio. La seguridad, CI y
runbooks de W4 se mantienen como baseline del nuevo repositorio.

El frontend todavía conserva conceptos inmobiliarios que serán reemplazados por
dominio telecom de forma incremental. La base Supabase canónica se reconstruye
desde cero; SQL, rutas privilegiadas y scripts operativos históricos no forman
parte de la rama canónica v2.

## Stack

- Next.js 16, React 19 y TypeScript 5.
- Supabase para Auth, PostgreSQL/RLS y Storage.
- Tailwind CSS 4, Framer Motion, Lucide y Recharts.
- Plano de IA con contratos deterministas y n8n como integración externa.

## Desarrollo local

### Preview telecom sintético

En esta candidata de hardening: Node24, `npm run preview:setup -- --install --open`.
Alternativa: `npm ci` y `npm run preview:dev`. Diagnóstico: `npm run preview:doctor`.
No requiere `.env.local` ni credenciales. Abre la URL impresa en el mismo ordenador
que ejecuta el comando. Guía [Windows / GitHub Desktop](docs/master/PREVIEW_WINDOWS.md).
Datos sintéticos y solo lectura; candidata pendiente de revisión W2/W3, sin deploy.

### Desarrollo con servicios configurados

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

## Product rebuild preview

La PR de producto `w2/product-rebuild-v1` añade Dashboard, Clientes y ficha 360,
Cartera Telecom, oportunidades, calendario, asistente, Facturación PRO y
configuración fiscal. Inbox, automatizaciones y documentos muestran el estado
real de conexión. Para abrir la muestra sin credenciales de proveedores:

```bash
npm ci
npm run preview:dev
```

Abre http://localhost:3107/login y pulsa **Ver demo telecom**. Los borradores y
formularios son temporales. La emisión de facturas y las escrituras reales
permanecen desactivadas. La matriz de capacidades, métricas, contratos pendientes
y evidencia están en `docs/master/agents/W2_STATUS.md`.
