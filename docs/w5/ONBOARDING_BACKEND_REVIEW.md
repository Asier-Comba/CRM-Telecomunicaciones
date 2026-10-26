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

## Corrección 25/10: cobertura existente

`scripts/security/ephemeral-postgres/onboarding.mjs` ya fija como comportamiento **intencionado y probado**:
- **Matiz 1:** un reintento con otro nombre o slug devuelve la empresa existente con `created=false`, sin crear otra (líneas 82–89).
- **Matiz 2:** un miembro eliminado puede crear una empresa propia nueva, y la anterior sigue inaccesible (líneas 108–116).
- Workspace suspendido → `42501` sin bypass; rollback atómico sin filas parciales; varias empresas por usuario con su rol correcto.

Por tanto, los matices 1 y 2 **no son decisiones abiertas**: son el contrato vigente de W1, y lo que W1 tenga que hacer es solo confirmarlos.

**Lagunas reales de prueba:**
- **Concurrencia** de dos llamadas simultáneas del mismo usuario. El mecanismo existe (advisory lock), pero no hay prueba con conexiones paralelas.
- **Colisión de slug** con otro usuario (`23505`, sin filas parciales).

Son la siguiente unidad W5 (recurso desechable, no alojado).

## Evidencia física 25/10: concurrencia y colisión de slug (recurso desechable)

- **Fuente:** rama `w5/onboarding-provision-races`, commit `54feb851ab2f9e8f08a80395d0b7ba5269bb31cb`, árbol `b1a773ddc5835a2fe409bc78f4203624b517fd50` = base `f9aa469b` + 1 test (no cambia producto ni SQL).
- **Entorno:** CI `workflow_dispatch` run `40240003086`, job `121309573236` (Native PostgreSQL zero-to-head). Contenedor `postgres@sha256:ca0bd484…` fijado; BD temporal `telecom_onboarding_race_test` con las 87 migraciones; procesos `psql` independientes con `role authenticated` y `request.jwt.claim.sub`. **Nada contra Supabase alojado.**
- **Resultado:** `ONBOARDING NATIVE PROCESS RACES PASS` y `TEARDOWN PASS` (`dropdb --force`).

| Escenario | Invariante comprobada |
|---|---|
| A1: 12 procesos, mismo usuario y mismo input, 3 rondas | Exactamente 1 `created=true`; las 12 respuestas con el mismo `id` y `role=owner`; 1 workspace; 1 membresía owner activa; perfil apuntando a él |
| A2: 12 procesos, mismo usuario, **inputs distintos**, 3 rondas | 1 creador; los perdedores reciben **la empresa ganadora** (nombre y slug del ganador, no los suyos); 0 workspaces huérfanos de sus inputs |
| A3: orden controlado reteniendo el advisory lock del usuario, 2 órdenes | Las llamadas en cola convergen en 1 workspace, 1 creador |
| A4: replay tras la carrera | `created=false`, mismo workspace |
| B1: colisión secuencial entre usuarios | **SQLSTATE 23505**; el perdedor queda con 0 membresías, sin workspace en el perfil, sin adopción, `is_workspace_member=false` y 0 `current_workspace_ids` |
| B2: recuperación | El perdedor crea su empresa con otro slug (`created=true`, id distinto) |
| B3: 5 colisiones concurrentes entre usuarios | Exactamente 1 ganador y 1 `23505` por ronda; el perdedor sin filas; 1 workspace por slug |
| Global | 0 workspaces sin miembros |

## Propuesta de decisión para W1 (y revisión W4)

**Garantías de backend (autoridad transaccional, probadas):**
- idempotencia por usuario bajo concurrencia real;
- atomicidad;
- sin adopción entre empresas;
- `23505` sin efectos parciales.

**Garantías del frontend:** solo de experiencia de usuario. La barrera tras recarga de #184 evita reenvíos innecesarios, pero **no** es necesaria para la integridad, que la da el backend.

**Contrato propuesto (aceptar):**
1. `provision_workspace` como "leer o crear" por usuario: los reintentos devuelven la empresa existente (`created=false`) aunque cambien nombre o slug, tal como ya fija `ephemeral-postgres/onboarding.mjs`.
2. Handler: `23505` → **409 `slug_taken`** con mensaje genérico, sin pasar el `DETAIL` de PostgreSQL. Así está hoy en `f9aa` y #183 no lo cambia.
3. Resultado que no sea exactamente una fila canónica → **502 `onboarding_unconfirmed`** (#183): no afirma éxito ni rollback y no reintenta. Recuperar releyendo la membresía o repitiendo la llamada, ambas seguras por (1).
4. El acceso nunca sale del recibo: lo deciden las guardas en cada petición (verificado en alojado el 25/10).

**Decisiones abiertas reales para W1:**
- (i) El slug es **único global**, así que un `409` revela que otro usuario usa ese slug (enumeración menor, inherente). ¿Se acepta, o se pasa a slug por empresa o generado?
- (ii) ¿Debe el handler indicar al cliente que un reintento con otro nombre devolvió la empresa existente? (Hoy lo hace implícitamente con `200` y los datos reales.)

**Adopción:** cherry-pick de `54feb851` (2 archivos: el test nuevo y una línea en `test-zero-to-head.sh`). No toca producto.
