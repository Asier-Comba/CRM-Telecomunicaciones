# W1 — Contrato de autorización tenant

- Versión: 0.1
- Fecha: 2026-09-26
- Owner: W1; revisión requerida W4
- Estado: resolver canónico publicado; rutas privilegiadas legacy deshabilitadas

## Fuente de verdad

La autorización tenant se deriva exclusivamente de una fila `active` en
`workspace_members`. `profiles.workspace_id` es una preferencia de selección para
clientes compatibles y no concede acceso. `profiles` no tiene columna de rol.

| Rol | Lectura tenant | Mutación CRM | Gestionar miembros | Asignar roles |
| --- | --- | --- | --- | --- |
| `owner` | Sí | Sí | Sí | Todos, incluido `owner` |
| `admin` | Sí | Sí | Sí | Solo `member` y `viewer` |
| `member` | Sí | Sí | No | Ninguno |
| `viewer` | Sí | No | No | Ninguno |

Las capacidades de mutación CRM se concretarán por servicio; esta tabla no
autoriza a omitir RLS, ownership de recurso o validación de entrada.

## Resolución server-side

1. Validar la sesión con `auth.getUser()`.
2. Leer únicamente membresías `active` del usuario autenticado.
3. Si existe `x-workspace-id`, validar formato UUID y pertenencia activa.
4. Sin header, aceptar `profiles.workspace_id` solo si coincide con una membresía
   activa.
5. Sin preferencia válida, elegir automáticamente solo cuando existe una única
   membresía activa; con varias se responde `409 workspace_required`.
6. Derivar rol/capacidades de la membresía seleccionada.
7. Acotar cualquier consulta o mutación al `workspace_id` resuelto.

Un header inventado devuelve `403`; un UUID inválido devuelve `400`; una membresía
suspendida o borrada deja de autorizar inmediatamente.

## Gestión de equipo (contrato; endpoint aún deshabilitado)

- Listar/invitar/editar/retirar requiere `owner` o `admin`.
- `admin` no puede modificar otros `admin`/`owner` ni asignar esos roles.
- Nadie cambia su propia membresía desde el endpoint de equipo.
- No se puede degradar o retirar el último `owner` activo.
- Retirar una membresía no borra `auth.users` ni el perfil: una identidad puede
  pertenecer a varios workspaces.
- El cliente service-role se usa solo después de resolver sesión, membresía, rol y
  scope; nunca acepta `workspace_id` del body.

## Handoffs

- **W2:** consumir roles `owner|admin|member|viewer`; enviar `x-workspace-id` cuando
  el usuario tenga selección activa multi-workspace; no usar el rol del frontend
  como autorización.
- **W3:** construir `ActorContext` desde el mismo resolver; modelo, prompts y tools
  no pueden proporcionar ni sustituir el workspace.
- **W4:** revisar helpers `SECURITY DEFINER`, grants, RLS, selección multi-workspace,
  último owner y uso de service-role.

## Deuda abierta P0

Los endpoints históricos que dependían de `profiles.role`, un secreto global o
un `workspace_id` del caller no se importaron a la rama canónica v2. Solo podrán
reaparecer usando `src/lib/server/tenant-context.ts` y pruebas de dos
usuarios/dos workspaces. Ninguna migración se aplicará antes de revisión W4,
plan de rollback y autorización humana.
