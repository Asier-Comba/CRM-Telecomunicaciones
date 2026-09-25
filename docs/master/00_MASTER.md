# 00 — Master

- Versión: 0.1
- Fecha: 2026-09-25
- Commit base: `6ea06e4`
- Owner: W0
- Estado: activo
- Supersedes: coordinación dispersa en documentos históricos

## Objetivo

Evolucionar la base CRM inmobiliaria a un CRM SaaS telecom comercial, seguro y
multiempresa, preservando la ingeniería útil y manteniendo trazabilidad.

## Fuente de verdad

1. código, migraciones y workflows del repositorio;
2. este directorio `docs/master`;
3. ADRs y decisiones aprobadas;
4. PRs e issues;
5. Project `CRM TELECOM-MASTER`;
6. documentación histórica.

## Base de trabajo

- Repo canónico: `Asier-Comba/CRM-Telecomunicaciones`.
- Rama W1: `w1/bootstrap-canonical`, creada sobre `w4/security-baseline`.
- Referencia histórica read-only: `iazticontact/crm-inmobiliario-demo`.
- Snapshot funcional seleccionado: `general-semantic-planner` en `6ea06e4`.
- Justificación: contiene `main` completo y 22 commits adicionales; la rama
  `p71/conversation-state-core` es un ancestro 31 commits por detrás.
- El repositorio histórico tiene push deshabilitado en la configuración local.

## Regla P0

El Supabase inmobiliario no se consulta ni modifica. La nueva base canónica se
reconstruye en el proyecto Supabase nuevo mediante migraciones reproducibles y se
valida contra una base vacía antes de cualquier despliegue.
