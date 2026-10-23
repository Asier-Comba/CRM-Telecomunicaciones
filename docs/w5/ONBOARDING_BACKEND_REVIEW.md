# Onboarding: revisión backend para W1 (#183 / #184) · W5, 23/10/2026

**Lectura de la función alojada `public.provision_workspace(text,text)` en `crm-telecom-staging`. Sin cambios ni SQL de escritura.** Propuesta de decisión para W1. W4 debe revisarla de forma independiente. No se impone contrato.

## Comportamiento verificado

| Propiedad | Evidencia (cuerpo de la función) | Consecuencia |
|---|---|---|
| Identidad | `v_user_id := auth.uid()`; sin sesión → `42501` | No acepta ningún usuario enviado por el cliente |
| Serialización por usuario | `pg_advisory_xact_lock(hashtextextended(auth.uid()))` | Dos peticiones simultáneas del mismo usuario no crean dos empresas |
| Idempotencia | Si existe membresía `active` en workspace `active` → devuelve esa fila con `created=false`, sin insertar | **Reintentar o releer tras una respuesta incierta es seguro**: no duplica efectos |
| Atomicidad | Workspace, miembro owner y perfil en una transacción | No hay estado intermedio confirmado: o todo o nada |
| Forma del resultado | `TABLE(id uuid, name text, slug text, role text, created boolean)`; los caminos normales devuelven exactamente 1 fila y los errores lanzan excepción | Una respuesta `null` o `[]` (negativos QA38) no la produce esta función en condiciones normales. Si el handler la recibe, debe tratarla como **no confirmada** |
| Workspace suspendido | Miembro activo de un workspace no activo → `42501 workspace suspended` | No crea otro workspace para eludir la suspensión |
| Slug | `UNIQUE (slug)` global → `23505` si colisiona | 409 en el handler; reintentar con el mismo slug tras un éxito no confirmado devuelve la empresa ya creada (camino idempotente) |
| Datos de perfil | `email` del perfil se toma de `auth.users`, no del cliente | Sin escalada por email editable |

## Matices que W1 debe decidir

1. **Reintento con otro nombre o slug:** devuelve la empresa existente con `created=false` y **su** nombre, sin indicar que se ignoró el nuevo. El cliente debe mostrar los datos devueltos y no suponer los enviados. (Alternativa: un error explícito si difieren. Es un cambio de contrato.)
2. **Usuario cuya única membresía está suspendida o eliminada:** la comprobación de suspensión solo cubre "miembro activo de un workspace inactivo". Un miembro suspendido o eliminado puede **crear una empresa propia nueva**. No da acceso a la empresa anterior (las guardas exigen `status='active'`), pero es una decisión de producto: ¿se permite?
3. **Registro abierto en staging** (`disable_signup=false`): cualquiera que confirme un email real puede llegar aquí y crear empresas. Ver `SUPABASE_STAGING_CONTRACT.md` R1.

## Propuesta de decisión para #183 / #184

- **Fuente de verdad tras una respuesta incierta** (5xx, transporte, cuerpo inválido): **releer** la membresía en servidor (`current_workspace_ids` / lectura de membresía activa). Llamar de nuevo a `provision_workspace` con los mismos datos también es seguro por idempotencia, pero no da información nueva. Ninguna de las dos acciones concede acceso por el recibo: el acceso lo deciden las guardas en cada petición.
- **#183 (handler):** coherente con lo anterior. Validar una única fila canónica (`id` UUID, `role` ∈ owner/admin/member/viewer, `created` booleano) y, si la forma es inválida, responder 502 `onboarding_unconfirmed` sin afirmar éxito ni rollback.
- **#184 (navegador):** barrera útil contra el reenvío por recarga. El backend ya garantiza que no hay duplicado, así que la barrera es de experiencia, no de integridad.
- **Recuperación duradera:** no hace falta un outbox para onboarding. La función es idempotente por usuario, y la membresía activa es la confirmación.

## Pruebas propuestas (recurso desechable, cuentas sintéticas)

1. Dos llamadas concurrentes del mismo usuario → 1 workspace, 1 owner; una respuesta `created=true` y otra `created=false`.
2. Llamada repetida tras éxito con otro nombre → misma `id`, `created=false`, nombre original.
3. Workspace suspendido con miembro activo → `42501`; ningún workspace nuevo.
4. Miembro suspendido o eliminado → comportamiento según la decisión 2.
5. Slug ocupado por otro usuario → `23505`/409; ninguna fila parcial.
6. Sin sesión → `42501`; `anon` no puede ejecutarla (verificado: `anon_exec=false`).
