# Arizan 26/10: hoja de emergencia del backend (W5)

**Estado comprobado (25/10, ~18:00 UTC, solo lectura):**
- Supabase `crm-telecom-staging` `ACTIVE_HEALTHY`, PG 17.11, 87 migraciones.
- Datos de la empresa sintética A **sin cambios desde 17:32 UTC**:
  - 2 clientes activos y 11 archivados;
  - Empresa Ejemplo Norte SL con 2 contratos, 2 servicios y 3 líneas;
  - oportunidad de 1.200 €, tarea, renovación e incidencia;
  - factura `draft` de 36300 céntimos, sin número.
- Owner A: `owner`/`active`, habilitado.
- Último preflight completo por los lectores de la UI: **16/16 PASS** (17:37 UTC). Frontend: Netlify `a9e977ad` (decisión del propietario).
- Detalle de recorrido y matriz: `ARIZAN_PRESENTATION_READY.md`.

**Comprobación rápida y segura (solo lectura):** `ARIZAN_PREFLIGHT_EMAIL=… ARIZAN_PREFLIGHT_PASSWORD=… node scripts/w5/arizan-preflight.mjs` (credenciales por canal privado). Debe dar `16/16 PASS`. No escribe nada.

## Incidencias: diagnóstico → comprobación segura → recuperación

| Síntoma | Diagnóstico probable | Comprobación segura | Recuperación (sin debilitar controles) |
|---|---|---|---|
| **Netlify: "This site is private" / 401** | Sesión del equipo Netlify caducada (~1 h) | Abrir `app.netlify.com` | Volver a entrar con la cuenta **Owner** del equipo Netlify y recargar |
| **Error de login del CRM** | Contraseña incorrecta, usuario fuera de la cohorte o registro (cerrado a propósito) | Probar el owner A; si `/login?error=staging_access_denied`, el usuario no está admitido | Usar solo el owner A. **No** abrir el registro ni cambiar la cohorte en directo |
| **Sesión caducada a mitad de demo** | Token de Supabase expirado o cerrado | La página vuelve a login | Iniciar sesión otra vez; los datos persisten en el servidor |
| **No aparece el cliente** | Filtro de estado o página siguiente | Clientes → **Estado: Activo** (2 clientes) | Usar el filtro; si sigue sin aparecer, ejecutar el preflight |
| **Contrato sin líneas visibles** | Se está mirando el contrato de fibra (1 línea) o falta paginar | El contrato móvil tiene 2 líneas, el de fibra 1 (3 en total) | Abrir el contrato **móvil**; el preflight verifica `line.list` = 3 |
| **La oportunidad no carga** | Filtro de etapa o cliente | 3 etapas ("Synthetic open/won/lost"); la oportunidad está en *Synthetic open* | Quitar filtros o elegir la etapa abierta |
| **La factura no aparece** | Rol sin permiso (member o viewer no ven facturas), filtro de estado o periodo | Owner A, sin filtro, estado *borrador*, fecha 26/10/2026 | Usar el owner A; filtro "borrador"; periodo octubre 2026 |
| **403** | **Denegación legítima** (rol o empresa) o usuario no admitido | Mensaje `access_denied`; comprobar que es el owner A | No ampliar permisos. Si el rol es el correcto, explicar que es el control multiempresa funcionando |
| **500** | Fallo de la función (Netlify) o respuesta inesperada | Recargar una vez; ejecutar el preflight | Si el preflight da 16/16, el fallo está en el frontend o el hosting: seguir con otra pantalla. **No** reintentar escrituras en bucle |
| **Timeout de Supabase** | Latencia puntual o proyecto pausado | `status.supabase.com`; panel del proyecto (`ACTIVE_HEALTHY`) | Esperar o recargar. Si estuviera pausado (Free tras inactividad), reanudarlo desde el panel con la cuenta del propietario antes de la demo |
| **Paginación o filtros extraños** | Cursor de una consulta anterior o filtro activo | Volver a la primera página y limpiar filtros | Recargar la pantalla; los listados usan cursor por id |

## No enseñar como funcional

- Asistente IA con OpenAI y cualquier escritura del asistente: **NOT_CONFIGURED**.
- Documentos y PDF privados: Storage P0, contenido OFF.
- Emisión oficial de facturas, numeración y envío.
- Integraciones con operadores, portabilidades efectivas, correo real.

## Límites de permisos (que se pueden explicar)

- **owner/admin:** todo lo de la demo, incluida la facturación.
- **member:** CRM y cartera, sin facturación.
- **viewer:** solo lectura, sin editor ni escrituras.
- **Suspendido:** sin acceso aunque su sesión siga viva.
- **Otra empresa:** no ve ni modifica nada de la empresa A. Verificado 22/22 el 25/10.

## Alternativa si el frontend no funciona

1. Mostrar la **interfaz local de Work** (`68a08a69`), **avisando de que es un entorno de demostración** con datos de preview, no los datos persistentes de Supabase.
2. Respaldar la persistencia real con la salida del preflight (16/16), y explicar los módulos con las capturas de Work identificadas como tales.
3. No improvisar despliegues, cambios de configuración ni escrituras en staging durante la reunión.
