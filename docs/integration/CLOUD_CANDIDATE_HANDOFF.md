# Candidata privada para W5 — 20/10/2026

Rama exclusiva `codex/product-integration-20261019`, PR156. Fuente de producto
`bd0b353c76f8d10e09a82183008ad41e2da878e5`, árbol
`7b34b9e3862368997d95d10aadd24e920ff42aa8`. Incluye aviso persistente de login,
recorrido de catálogo independiente y los tres rótulos integrados restantes.
El SHA/árbol del checkpoint final de documentación se entrega en issue67 tras push.
No usar un HEAD deducido del chat o resultados de otro SHA.

100bf terminó sin cancelaciones: perfil87 nativoPASS; CI compuesta conserva
710preview/664bootstrap/827assistant/build44PASS, pero falla cinco HIGH.
Supabase87/4042backend/113UI PASS y dos TIMEOUT distintos, incluido catálogo;
teardownPASS. El nuevo recorrido pasa4controles HTTP locales, no Supabase/cloud.
Esta candidata necesita su propia CI, revisión y deploy privado nuevo de W5.

## Diferencia respecto al deploy existente

W5 informa deploy `6ad75c93ac4914f9005f4767`, app e42cfd59 más configuración
versionada. Su núcleo cliente/factura y la corroboración DB de W0 son evidencia
ya conseguida, atribuida a sus autores. Esta candidata incorpora formalmente el
arreglo Edge, perfil87 exacto, QA162, rótulos/contraseña revisados, ámbito y carga
del dashboard, publicación de precios simples de tarifa y callers compatibles.
No reimporta consumidores161, modo permisivo159 ni Storage158/166.

## Compatibilidad y contratos

- Esquema requerido: exactamente87 migraciones; última
  `20261020100000_business_conflict_non_retryable.sql`, SHA256
  `5cb2704c505a82426b583f129be6a24d384b129ec4fd66d878dec91ea7524245`.
  Perfil W5 a1ab8020 adoptado; los cierres85/86 siguen rechazando87.
- Sin nuevas migraciones de esta entrega. NO reset, reaplicación87, aplicación88
  o cambios en resellpro. Reconciliar el manifiesto de plataforma con sus nombres
  de bindings de aplicación; no sustituirlo por una aprobación inventada.
- Admisión cerrada por defecto; origen/proyecto exactos, cohorte privada canónica,
  identidad confirmada no anónima mediante getUser de servidor y permisos/RLS
  frescos. El NODE_ENV compilado sólo se usa para el propio process.env.
- Rutas de demo: /login, /dashboard, /clients, /clients/:id, /facturacion,
  /catalog, /portfolio; transporte producto/facturación por sus rutas /api/*/v1.
  Proxy y APIs conservan no-store. Cambiar una etiqueta no autoriza una operación.

Nombres necesarios, valores únicamente en el entorno privado administrado por W5:
`APP_ENV`, `PRODUCT_STAGING_INTEGRATION`, `PRODUCT_STAGING_USER_IDS`,
`PRODUCT_V1_ENABLED`, `PRODUCT_V1_ORIGIN`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (fallback legado `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
Sin modo local paralelo ni PLATFORM_TARGET159. No configurar secretos desde Work.
Contenido/PDF privado afectado por Storage P0 e IA writes siguen OFF.

## Código y configuración reproducibles

netlify.toml es el blob W5 `2e4fcd58a081974f3129e44a8be047bf4a672163` de07f97a33:
build npm, salida.next, adaptador Next y noindex. Dependencias de aplicación y
Node no cambian. Su compatibilidad general con Next16 no certifica el adaptador
efectivo de un build concreto. No se adopta el workflow manual fail-open de165.
Sus referencias en comentarios del TOML corresponden a la propuesta, no a un
workflow operativo de esta rama.

W5 debe cerrar el test87 obligatorio, habilitación legítima de workflow_dispatch,
entorno protegido/revisor, site/URL correctos y versión efectiva fijada/digest del
adaptador/CLI. Registrar SHA, árbol, lock/config hashes, versión no sensible de
entorno, build y artefacto/deploy ID. No volcar cohortes, valores o credenciales.
Las reglas actuales requieren workflow en rama por defecto para dispatcher;
Work no fusiona esa rama. El workflow publicado no consta ejecutado.

## Validación y siguiente aceptación

96f propio: lint globalPASS,827assistantPASS, build/types44PASS,3semántica loginPASS;
bootstrap Windows659/664PASS con cinco fallos POSIX previos conservados.
Controles por unidad/fuente en INTEGRATION_CURRENT. CI del checkpoint nuevo pendiente:
no sustituirla por4042/114/710 de c0. El helper añade publicación real-local de
tarifa, recibo/condiciones y recuperación tras recarga; resultado aún NOT_RUN.

W5 realiza el despliegue autorizado y devuelve URL/site/deploy/source/config/build,
estado Auth, limitaciones y ventana privada exclusiva. Oier recibe identidades
sintéticas A/B ya autorizadas y recursos de navegador propios legítimos; nunca
sesión personal compartida. B necesita positivo propio antes de negar datos A.
Fuera de cohorte es otro control. Voz real se acredita por separado.

Rollback: W5 debe conservar el artefacto/config del deploy conocido6ad75c93;
republicar esos bytes mediante su procedimiento autorizado si procede. Reconstruir
un SHA con adaptador/entorno mutables no equivale al mismo artefacto. SQL es
forward-only; no borrar versiones de tarifa, auditoría o fixtures por rollback UI.

**Hito A pendiente de aceptación independiente; release NOT_ACCEPTED.**
