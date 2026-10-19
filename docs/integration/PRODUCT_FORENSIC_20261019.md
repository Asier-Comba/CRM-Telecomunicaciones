# Integración comercial — diagnóstico inicial, 19/10/2026

Estado: candidata, NO release. Auditoría estática propia; ninguna aceptación hospedada nueva.

## Fuente reproducible y decisión

Base elegida: PR155 `da468c5fa4d596c077fa2be8a354468718062d4f`, árbol `8b655922cbc44ea99d5844405ea557a17e42b0c7`. Incluye PR150 `32862fafbdf35c1c33b84a88ef1e7710cdac9388` y la fuente común PR38 `60acdc5d6a2ae41ff3d751724582ade0c0762788`. Conserva las 86 migraciones y las superficies W5. Rama propia: `codex/product-integration-20261019`.

Producto posterior: W2-X113 `d1880f3af3a8a719bde3367825f900108f9edc29`. Inventariadas 392 referencias remotas y 22 directorios de módulos. Su unión preliminar con W5 no tiene conflictos textuales (`merge-tree` produce `694447dcc2c737234c218878634839a53d72bd4a`); NO demuestra compatibilidad ni permite heredar PASS. No se adopta masivamente. Sus 48 archivos de producción modificados y consumidores requieren unidades separadas. No cambia dependencias ni SQL respecto al ancestro común; W5 aporta además el SQL de grants86 y sus controles.

PR153 mantiene HEAD fallido `7f6626e32a609eb22ffdd8052c9cc59e60d98453`. Su descripción enumera entregas posteriores y no equivale a que estén incorporadas. W2-X111 tiene regresión propia2256; W2-X113 tiene21 pruebas de componente/HTTP sintético. Ninguna acredita la unión con W5 ni Auth hospedado. `main` sigue en `5cb872c0f3efb9ca9c798aa3c049a7120ddcd6d0`; no es la base comercial más completa.

## Mapa funcional y clasificación conservadora

| Módulos existentes | Fuente y frontera real | Clasificación actual / pendiente |
|---|---|---|
| Dashboard, attention, reports | features + consultas dashboard/telecom y contratos de agregación | Parcial: operaciones y agregados existentes; flujos completos, fechas y permisos por reconciliar |
| Customers, Customer360 y contactos | product.v1, telecom.v1, colecciones; comandos humanos/recibos | Parcial: alta/edición/estado, relaciones y lecturas; recuperación de recibos y vida de lecturas mejoradas en W2-X aún sin integrar |
| Catalog, contracts, services, portfolio | contratos catálogo/cartera/ubicaciones/servicios | Parcial: CRUD y consultas existentes; inventarios, filtros y recuperación por revisar por requisito |
| Sims, equipment, portabilities | contratos SIM/eSIM, equipment y portability | Parcial: seguimiento real interno; no inferir ejecución de operador ni integraciones externas |
| Cases | case.v1, notas internas paginadas | Parcial: unidad inicial elegida para foco, correlación de respuestas y denegación; no RCA del fallo original PR151 |
| Opportunities, calendar | work/product.v1, etapas, tareas y reuniones | Parcial: comandos y navegación existentes; respuestas inciertas y recuperación posteriores pendientes |
| Billing PRO | billing.v1, fiscal, PDF privado, analítica por moneda | Parcial: emisión humana autorizada y PDF existentes; texto determinista no equivale a planner semántico, voz/modelo requieren disponibilidad y autorización |
| Documents | metadatos, upload/finalize/download/integridad | Bloqueada aceptación hospedada por Storage; UI y contratos implementados parcialmente, sin aprobación de seguridad |
| Inbox, notifications, automations | contratos internos publicados | Parcial: no equiparar intención/registro interno con envío o proveedor conectado |
| Settings/equipo | tenant-context, roster/roles y contratos settings/team | Parcial: permisos efectivos deben comprobarse con Auth/DB, no por botones |
| Assistant | planner/herramientas tipadas, historial, RAG y stores duraderos | Implementada sin integración operacional aceptada: proveedor denegado sin admisión presupuestaria canónica; escritura IA OFF; full23/W4/modelo real pendientes |
| Importaciones dentro de portfolio | importjob.v1 y staging cifrado | Parcial; procesamiento operacional pendiente/bloqueado. No upload/apply inventado |

No módulo se clasifica como completamente implementado y probado en esta candidata. El JSON adjunto enumera archivos por módulo y conserva las 342 filas de requisitos con estados y evidencia de origen, sin promoción. Base W5:9 implementaciones PARTIAL/333 sin reconciliar; W2-X113:34 PARTIAL/308 sin reconciliar; seguridad342 sin reconciliar en ambas, RELEASE_READY0. Son estados documentales, no recuentos de funcionalidades ausentes ni PASS propios. La comparación inmobiliaria existente fija `iazticontact/crm-inmobiliario-demo@ad3c06e5e6dca8e9cf0342845f670b1b48478851`; se consultó su análisis versionado, no se ha reproducido ni inspeccionado directamente su navegador en esta sesión.

## Documentación, decisiones y evidencia

Leídos producto/arquitectura, SYSTEM_STATE, handoffs generales/seguridad, W4_STATUS, W5_HANDOFF, entorno, contratos de producto, matrices/paridad y comparación anterior, issue67 y PR38/150/153/155. SYSTEM_STATE y varios handoffs conservan instantáneas antiguas; no sustituyen cierres posteriores. No se localizaron ADRs ni ficheros exactos MASTER/STATUS/DECISIONS en esta base; los contratos y handoffs fechados son decisiones disponibles, no una colección ADR inventada.

CI propio de PR155 consultado: Supabase39272139169 SUCCESS; CI39272139305 FAILURE; enterprise39272138954 FAILURE; all-ref39272138854 FAILURE. El job recovery verde no convierte enterprise en verde. Sin atribuir estos resultados a futuras unidades.

Handoff cloud vigente: issue67 comentario6271377355. Esquema86 aplicado en staging; aceptación BLOQUEADA por bytes desde caché tras revocación y conflictos HTTP que agotan tiempo. App hospedada no probada/desplegada en ese cierre. Cowork mantiene infraestructura/Storage/HTTP/hosting/workers/recuperación. No se cambian SQL, proyecto, claves, proveedores ni resellpro. Cuentas sintéticas previas deshabilitadas; no asumir que sirven para un login actual.

## Primera unidad y secuencia

1. Integrar únicamente `a650a9b348cade254a115fcda89bd2b49ecbbb83`, cuyo padre es la fuente común60ac y cuyos5 archivos no coinciden con cambios W5. Reproducir foco con banco publicado antes de adoptar producto; ejecutar banco nuevo sobre unión. Correlación Auth/DB modificada requiere nueva CI real y no hereda Sup107.
2. Integrar por separado `9c361c9ce7e32ba202f0c6e24aacd371c5026e04`: retener intención de contacto y cierre bloqueado; revisar impacto del Drawer/ConfirmDialog compartido y ejecutar regresiones relevantes.
3. Continuar con unidades W2-X de recibos/relecturas, antes de flujos hospedados con Cowork. Conservar fallos originales y nuevos. Ningún merge a main, ni aceptación propia de seguridad, ni aumento de límites ni supresión de controles.

Coordinación publicada en issue67 comentario6272406858. El JSON es un inventario de fuentes; no sustituye el desarrollo ni una matriz completa de aceptación.
