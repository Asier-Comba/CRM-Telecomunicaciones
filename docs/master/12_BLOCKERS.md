# 12 — Blockers

- Versión: 0.2
- Fecha: 2026-09-25
- Owner: W1
- Estado: abierto

## B-001 — Proyecto Supabase nuevo

Falta identificar en Work el proyecto Supabase nuevo creado con la cuenta de Asier.
No se necesita ni se intentará acceso al proyecto inmobiliario. La reconstrucción
local y documental puede continuar mientras tanto; aplicar migraciones o validar
RLS en remoto requiere acceso al proyecto nuevo.

## B-002 — Base vacía local

Este runtime no dispone todavía de Docker, `psql` ni Supabase CLI. El build y las
auditorías estáticas son ejecutables, pero la prueba final desde base vacía deberá
correr en Supabase nuevo o en un entorno PostgreSQL autorizado.

## B-003 — Visibilidad

GitHub reporta `Asier-Comba/CRM-Telecomunicaciones` como público. El Project y la
baseline de seguridad esperan revisar si debe ser privado. Cambiar visibilidad
afecta acceso y requiere decisión explícita del propietario.

## B-004 — Main y protección

El repo aún no tiene `main`; `w4/security-baseline` es la rama default. No se creará
ni fusionará un `main` canónico hasta que el bootstrap compile, pase gates y W4
pueda revisar la protección y checks obligatorios.
