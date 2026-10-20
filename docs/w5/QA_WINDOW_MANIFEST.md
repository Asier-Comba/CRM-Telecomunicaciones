# Ventana QA privada para Oier: manifiesto (W5)

Estado: **PREPARADA, NO ABIERTA**. Se abre solo cuando se cumplen las tres condiciones de §1. No es una release (RELEASE_NOT_ACCEPTED).

## 1. Condiciones de apertura (todas)

| # | Condición | Responsable | Estado 20/10 |
|---|---|---|---|
| 1 | Acceso Netlify propio de Oier: equipo `asier-comba` en Pro y Oier invitado con rol mínimo al proyecto `crm-telecom-staging-preview`. En Free solo lo ve el Owner | Asier (aprobación de coste, checkout e invitación) | PENDIENTE (#67 comentario 6299975950) |
| 2 | Deploy exacto designado por el integrador (sucesora de #175) y desplegado por W5 con registro SHA/árbol/config/build/adaptador/deploy ID | Integrador → W5 | PENDIENTE; en la nube sigue `6ad78f6c` = `a9e977ad` |
| 3 | Autorización del propietario para habilitar las identidades sintéticas de la ventana (las de la ventana W5 anterior están revocadas y no se reutilizan sin autorización) | Asier | PENDIENTE |

## 2. Fuente y entorno (se completa al abrir)

| Campo | Valor |
|---|---|
| App SHA / árbol | `<sucesora de 175>` / `<tree>` |
| Deploy ID / permalink | `<deploy>` / `https://<deploy>--crm-telecom-staging-preview.netlify.app` |
| Supabase | `crm-telecom-staging` (`zgwotxnyqzfuzcnmgvtn`), 87 migraciones. Storage #166/88 **no aplicado**; contenido de documentos OFF; escrituras IA OFF |
| Admisión | `APP_ENV=staging`, admisión estricta, cohorte `uuid_csv` solo con las identidades de §3 |
| Validez | Inicio/fin UTC fijados al abrir; máximo 48 h; al vencer, cierre de §6 |

## 3. Identidades y empresas sintéticas

Solo cuentas `@example.invalid`, confirmadas, no anónimas, dentro de la cohorte.

| Rol en la ventana | Empresa | Rol CRM | En cohorte |
|---|---|---|---|
| Owner A | "W5 P0 Synthetic A" | owner | Sí |
| Owner B | "W5 P0 Synthetic B" | owner | Sí |
| Miembro suspendido de A | A | admin (membresía `suspended`) | Sí |
| Fuera de cohorte | A | viewer | **No** (control negativo) |

**Credenciales**: generadas por W5 al abrir, de un solo uso y entregadas **solo por canal privado** (mensaje directo propietario→Oier), nunca en GitHub, issues, correo de grupo ni capturas. Netlify (quién puede cargar la web) y CRM (quién eres dentro) son logins independientes. No se comparten sesiones ni cookies.

## 4. Fixtures identificados

| Fixture | Empresa | Uso |
|---|---|---|
| Cliente "Bilbao Telecom Demo SL" (versión 1) | A | Lectura positiva A y objetivo de las denegaciones B→A |
| Borrador de factura 300 + 21 % = 363 € | A | Lectura positiva A y objetivo de la denegación B→A |
| Cliente "Donostia Fibra Demo SL" | B | Positivo B |
| Catálogo: "Operador Demo Fibra" / "Fibra 300 Mb Empresa" | A | Solo lectura en esta ventana |

## 5. Operaciones permitidas y máximo de efectos

**CORE162 conserva sus dos mutaciones**:
- alta de cliente;
- guardado de borrador de factura por texto (sin emisión ni número reservado).

Como máximo **2 efectos por identidad positiva (A y B)** por ejecución y **una sola ejecución** por ventana. Orden obligatorio:
1. Positivo A completo.
2. Positivo B completo.
3. Denegaciones cruzadas B→A: lectura de cliente y factura y modificación del cliente. Esperado: sin datos y sin cambios.
4. Suspendido: sin capacidades.
5. Fuera de cohorte: rechazado. Esto **no** prueba aislamiento multiempresa.
6. Anónimo: rechazado.

Fuera de alcance: contrato→servicio→línea (ventana separada con el integrador), emisión de facturas, voz real sin micrófono real, documentos/Storage, IA. No se ejecutan dos bancos a la vez sobre los mismos fixtures.

## 6. Recuperación y cierre

- Primer fallo: parar, capturar (ruta, código HTTP, hora UTC y recibo si lo hay) sin datos personales, y avisar en #67 sin pasos de reproducción de defectos de seguridad.
- Al cerrar, W5:
  - re-banea las identidades;
  - rota a contraseña aleatoria;
  - borra sus sesiones;
  - verifica 0 sesiones;
  - lista los registros creados en la ventana.
- Los registros sintéticos creados se conservan como evidencia salvo que el integrador pida limpieza. Nunca se hace reset ni se borran fixtures de otros.
- La revocación del acceso Netlify de Oier la decide el propietario al terminar el periodo.

## 7. Atribución

- Las pruebas de W5 por API y páginas del 20/10 sobre `6ad78f6c` son **validación W5/propietario** (`CLOUD_HANDOFF.md` §11).
- La ejecución visual independiente es de Oier en esta ventana, con su propia evidencia.
- No se trasladan verdes de `a9e977ad` a la sucesora.
