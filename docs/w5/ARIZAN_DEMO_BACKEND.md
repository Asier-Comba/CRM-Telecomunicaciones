# Backend para la presentación a Arizan (W5, 25/10/2026)

Entorno de datos: **Supabase `crm-telecom-staging`** (`zgwotxnyqzfuzcnmgvtn`): PG 17.11, **87 migraciones**, registro público cerrado, RLS 90/90. Storage 88 sin aplicar; IA writes OFF; producción no aprobada. **Todo es sintético** (`@example.invalid`, empresas y datos ficticios). No es una release.

## 1. Entorno y acceso

| Elemento | Estado |
|---|---|
| Frontend alojado operativo | Netlify privado `https://crm-telecom-staging-preview.netlify.app`, deploy `6ad78f6c`, fuente `a9e977ad`. Solo lo abre el Owner del equipo Netlify. **La candidata #175 (`f9aa`) no está alojada** |
| App EasyPanel `crm-telecom-staging` | Creada **vacía** por Work; sin dominio, imagen ni Auth. **No apta para mañana** salvo que Work la active y verifique |
| Usuario de presentación | Owner sintético de la empresa **"W5 P0 Synthetic A"** (`w5p0-20261019-ownera@example.invalid`), rol `owner`, membresía activa, en la cohorte de admisión de Netlify. La contraseña la tiene el propietario por canal privado; no se publica |
| Otras identidades sintéticas | Baneadas con contraseña aleatoria y 0 sesiones tras las pruebas de hoy |

## 2. Datos sintéticos creados hoy

Creados con **los mismos RPC de negocio que usa la app** y el **JWT del owner A**, nunca `service_role`. `command_id` deterministas: repetir el script reproduce los recibos sin duplicar (probado).

- Cliente **Empresa Ejemplo Norte SL**, con 1 contacto sintético.
- Operadores **Operador Demo Fibra** (ya existía) y **Operador Demo Móvil**.
- Tarifas **Fibra 300 Mb Empresa**, versión 2026 a 45 €/mes + 99 € de alta, y **Móvil Empresa 50 GB**, versión 2026 a 25 €/mes.
- **2 contratos:** fibra y móvil, desde 01/02/2026.
- **2 servicios:** fibra con 1 línea y móvil con 2 líneas.
- **1 permanencia** de dispositivo (01/02/2026–01/02/2027) en el contrato móvil.
- **1 renovación** del contrato de fibra (ventana 01/11–31/12/2026).
- **1 tarea:** "Llamar para revisar renovación de fibra".
- **1 incidencia técnica:** "Cortes intermitentes en la fibra de la sede", prioridad normal.
- **1 factura BORRADOR**, serie A: "Instalación y configuración", 1 × 300,00 € con IVA 21 % → **base 30000, IVA 6300, total 36300 céntimos**, calculado por el backend. Sin número, sin emisión, sin PDF y sin correo.

Verificado en la base: todas las relaciones con la misma empresa y el mismo cliente, y 1 sola fila por efecto tras repetir.

## 3. Matriz de operaciones (CAPACIDAD · FUENTE · ENTORNO · PERMISOS · PRUEBA · ESTADO)

Fuente de backend: Supabase alojado (87 migraciones). Fuente de frontend alojado: `a9e977ad`. Pruebas del 25/10 por RPC con JWT de usuario real; **no son pruebas de interfaz**.

| Capacidad | Permisos | Prueba | Estado |
|---|---|---|---|
| Login owner A | Cohorte + membresía activa | Token emitido | TESTED_HOSTED (backend) |
| Customer360 (editor) | owner/admin/member | 200 con el cliente | TESTED_HOSTED |
| Contratos del cliente | Lectura de miembro | `contract.list` con 2 contratos; detalle con operador y versión | TESTED_HOSTED |
| Servicios y líneas | Lectura de miembro | `service.list`: fibra y móvil | TESTED_HOSTED |
| Tarifas y versiones | Lectura | `plan_version.terms_get` (25 €/mes) | TESTED_HOSTED |
| Tareas | Lectura | `task.list` con la tarea | TESTED_HOSTED |
| Factura borrador y readback | owner/admin/member | `invoice_get`: draft, 36300 | TESTED_HOSTED |
| Sin duplicados al reintentar | — | Mismos ids y 1 fila por efecto | TESTED_HOSTED |
| Empresa B contra A (vía workspace A) | — | 403 `42501` en cliente, factura y tarea | TESTED_HOSTED |
| Empresa B contra A (vía su workspace) | — | Sin datos (`null` o vacío), mismo resultado que un id inexistente; la actualización se rechaza (`P0002`); A sin cambios | TESTED_HOSTED |
| Viewer | Lectura de listados | Listado 200; editor 403 (por diseño); escrituras 403 | TESTED_HOSTED |
| Miembro suspendido con JWT válido | — | Lectura y escritura 403 | TESTED_HOSTED |
| Oportunidades | owner/admin/member | **No hay etapas de embudo en staging** (0 en todas las empresas) y ningún comando de negocio las crea | **BLOCKED**: ver §5 |
| Asistente IA (v2) | — | Requiere `AI_PRODUCT_V2_ENABLED`, modo integrado y proveedor OpenAI `ready`; nada configurado → 503 | **NOT_CONFIGURED** |
| Asistente `read-preview` | — | Solo fuera de producción con datos demo | **BLOCKED** en alojado |
| Documentos privados (PDF) | — | Storage 88 sin aplicar; contenido OFF | **BLOCKED** (P0) |
| Interfaz alojada con estos datos | Owner Netlify + cohorte | No ejecutada por W5 (requiere sesión de equipo Netlify) | **NOT_RUN**: Work/propietario |

## 4. Recorrido recomendado para mañana (datos reales de staging)

1. Login con owner A en la preview Netlify.
2. Clientes → **Empresa Ejemplo Norte SL** → Customer360.
3. Contratos, servicios y líneas: fibra (1 línea) y móvil (2 líneas), con operador y tarifa.
4. Permanencia y renovación próxima (ventana nov–dic).
5. Tareas e incidencia abiertas.
6. Facturación: borrador 300 € + IVA 21 % = 363 €. Abrir, recargar: persiste.
7. Opcional, demostrar seguridad: explicar que otra empresa no ve nada (prueba documentada arriba). No hace falta una segunda cuenta en vivo.

**No mostrar como funcional:**
- el asistente IA ("no configurado": decir la verdad);
- PDF o descargas de documentos;
- emitir facturas;
- oportunidades.

Las preguntas de ejemplo («Resume este cliente», «Cuántas líneas tiene», «Qué contratos tiene», «Qué renovaciones se acercan», «Qué facturas tiene pendientes») se responden hoy desde las **pantallas** de Customer360, cartera y facturación, no desde el asistente.

## 5. Decisiones humanas antes de la presentación

1. **Etapas de embudo (oportunidades):** solo existen en el seed SQL de tests (`supabase/seeds/synthetic_product.sql`). Opciones:
   - (a) autorizar insertar las etapas estándar en la empresa A con ese seed (escritura SQL alojada directa; requiere tu autorización explícita);
   - (b) no mostrar oportunidades. El producto necesita un comando o migración de etapas por defecto (W1).
2. **Ruido sintético de pruebas en la empresa A:** 11 clientes "W5 PROBE…" y "W5 P0 synthetic…" de las pruebas de seguridad. Opción: **archivarlos** con el comando de negocio (reversible, no borra). Requiere tu visto bueno.
3. **Frontend:** confirmar con Work si se presenta en Netlify (`a9e977ad`) o en EasyPanel. W5 no ha verificado la interfaz alojada con estos datos.
