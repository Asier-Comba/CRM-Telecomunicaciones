# Aceptación comercial — 20/10/2026

La demo alojada existe: W5 informa el núcleo en deploy6ad75c93 y W0 corroboró
el borrador sintético en Supabase. No se atribuye esa ejecución a Work u Oier,
ni se extiende a la candidata nueva o a todo el SaaS.

| Recorrido | Evidencia observada/reportada | Pendiente |
|---|---|---|
| Acceso → dashboard →11clientes | W5 alojado e42, reportado | QA independiente sobre nuevo deploy |
| Alta Bilbao Telecom Demo SL → recarga → Customer360 | W5 alojado; ejemplo corroborado W0 | A/B admitidos, roles y readback independientes |
| Fibra300EUR+IVA63=363, quince días → revisión → draft → recarga | W5 alojado e42; DBW0 draft, sin emisión | Repetición independiente en candidata nueva |
| Dashboard | Nuevo ámbito autorizado, ceros personales y carga:18controles propios | Validación alojada de datos/ámbito reales |
| Facturación PRO | Recuperación previa integrada;51regresiones de rótulos,3callers; parser determinista | Voz/micrófono real; aceptación fiscal/roles completa |
| Catálogo → precios de versión simple |48controles propios+7contrato; UI nueva revisada | CI real-local del nuevo recorrido; después W5cloud |
| Contrato → servicio → línea | Consumidores previos integrados y pruebas por fuente conservadas | Catálogo publicado y E2E alojado por cada operación |
| SIM, portabilidad, incidencias, cartera, agenda | Implementación/aceptaciones previas por fuente; W5 informa carga de módulos | Writes/readback/negativos hospedados individuales |
| Documentos/PDF privado | Metadatos disponibles; contenido afectado OFF | Storage166/88 propuesto, revisión independiente y sonda autorizada |
| Resto de módulos/IA | Matriz canónica conservada; IA negocio writesOFF | Cierre por requisito; ningún banco promueve342filas |

Los ceros del dashboard personal describen asignación; no se sustituyen por un
conteo del cliente en memoria. La vista del espacio sólo existe para owner/admin
y el servidor conserva su autorización. Carga/error no se presentan como cartera vacía.

El editor integrado diferencia propuesta, confirmación, operación incierta,
recibo y recuperación. Guardar borrador no emite. El parser y SpeechStub no son
IA generativa ni voz real. El PDF recalculado por servidor con autorización de
factura se distingue del artefacto privado almacenado bloqueado por Storage P0.

Catálogo simple publica precios mensuales, fechas y un componente base explícito;
no inventa prestaciones, bundles, activación de proveedor o cambios a contratos
vendidos. El nuevo test de persistencia real-local todavía requiere su CI.

Seguimiento24: el aviso de cohorte ausente se reprodujo en Next local hidratado,
con query consumida e input habilitado. Aviso persistente fijo:1FAIL→9PASS en tres
tamaños, sin Auth, credenciales o cambios de admisión; despliegue/QA independiente
pendientes. No se atribuye a Netlify una causa no observada. El reporte de
portapapeles sigue sin causa acreditada; las llamadas encontradas son botones
explícitos, se requiere paso/ruta/source/deploy saneados. La etiqueta de contraseña
tenía además3FAIL→3PASS en HTML compilado, tampoco una prueba de Auth.

Cinco HIGH actuales, escaneo histórico, Storage, plataforma/CI aplicables,
backups y revisor independiente siguen abiertos. No DEMO_ACCEPTED ni producción.
