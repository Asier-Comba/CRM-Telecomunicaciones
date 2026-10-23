# Auditoría de integridad del esquema telecom y facturación (W5, 23/10/2026)

Lectura sobre `crm-telecom-staging` (87 migraciones, PG 17.11). **Sin escrituras.** Severidad = exposición real con la evidencia indicada. Ninguna de estas propuestas se aplica sin W1, W4 y el procedimiento de autorización.

## Resumen

| Área | Resultado | Severidad |
|---|---|---|
| Referencias entre tablas de empresa | **126 de 128** FK entre tablas con `workspace_id` son compuestas e incluyen `workspace_id`: referenciar una fila de otra empresa es imposible a nivel de esquema | OK |
| `telecom_service_installations.installation_contact_id → contacts` | FK simple, pero el trigger `service_commercial_v1_guard` (BEFORE INSERT/UPDATE) exige contacto del **mismo workspace y cliente**, y el comando lo bloquea `FOR SHARE` | LOW (defensa en profundidad) |
| `product_manual_origin_proofs.audit_event_id → product_audit_events` | FK simple; solo la escriben funciones definer del mismo workspace | LOW |
| Numeración fiscal | Contador `billing_series (workspace_id, series, year)`: `UPDATE … +1 RETURNING` serializa por bloqueo de fila; en la misma transacción que la emisión (sin huecos en confirmadas); `UNIQUE (workspace_id, series, number_year, number_sequence)` como respaldo; CHECK estado emitido/pagado ⇔ número | OK |
| Idempotencia de comandos | `product_v1_begin_command` devuelve el recibo original por `command_id`; CAS por `expected_version` (PT409/409) | OK |
| Autorización RPC | 161/161 funciones expuestas alcanzan una guarda que lee la membresía `active` del `auth.uid()` en cada petición | OK (falta revisión W4) |
| Onboarding | `provision_workspace` idempotente por usuario (lock advisory), atómica | OK (2 decisiones de producto para W1) |
| Índices | 196 FK sin índice de cobertura y 73 índices sin uso (advisor; con pocos datos); 1 índice duplicado en `activities`; 28 políticas `auth_rls_initplan` | Rendimiento, no seguridad |
| Storage | Lectura directa por JWT de usuario hasta aplicar 88 | P0 conocido, contenido OFF |

## Propuestas (forward-only, no aplicadas)

1. **FK compuestas** para los dos casos LOW: `(installation_contact_id, workspace_id) → contacts(id, workspace_id)` y `(audit_event_id, workspace_id) → product_audit_events(id, workspace_id)`. Requiere comprobar antes que exista `UNIQUE (id, workspace_id)` en el destino y que no haya filas incoherentes. Beneficio: la garantía no depende de un trigger.
2. **Rendimiento:** envolver `auth.uid()` en `(select auth.uid())` en las 28 políticas; eliminar el índice duplicado de `activities`; crear índices solo para las FK de tablas grandes por medidas reales (no los 196 a ciegas).
3. Cada propuesta lleva perfil de migración propio (como el 88), ensayo desechable completo (zero-to-head + 4042 backend + UI) y revisión W4 **antes** de pedir autorización alojada.

## Siguientes comprobaciones dinámicas (recurso desechable)

- Concurrencia de emisión: N emisiones simultáneas en la misma serie → números consecutivos y únicos, sin huecos.
- Las 6 pruebas de onboarding de `ONBOARDING_BACKEND_REVIEW.md`.
- Instalación con un contacto de otra empresa o de otro cliente → `23514`.
