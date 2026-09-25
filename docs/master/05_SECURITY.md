# 05 — Seguridad

- Versión: 0.1
- Fecha: 2026-09-25
- Commit base: `6ea06e4`
- Owner: W4 con W1 para RLS
- Estado: P0 abierto
- Supersedes: ninguno

- No usar producción como QA ni tocar el Supabase inmobiliario.
- No versionar `.env`, service-role keys, tokens, cookies, sesiones ni dumps con PII.
- Separar DEV/STAGING/PROD y aplicar mínimo privilegio.
- Toda entidad tenant-owned debe llevar aislamiento RLS probado entre workspaces.
- Resolver la ambigüedad entre `profiles.role` y `workspace_members.role` mediante ADR.
- El estado de las rotaciones de secretos del ZIP auditado debe confirmarse antes
  de ampliar accesos.
- GitHub muestra `Asier-Comba/CRM-Telecomunicaciones` como **Public**. Cambiar la
  visibilidad afecta acceso y colaboración y requiere decisión explícita del
  propietario; hasta entonces no se publicarán secretos ni datos de clientes.
- `iazticontact/crm-inmobiliario-demo` es referencia read-only absoluta y su
  Supabase asociado está fuera de alcance.
