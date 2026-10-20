# Facturación: recuperación al actualizar — Oier31

Claim [6303154547](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6303154547), reservado expresamente por Asier en [6303189755](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6303189755). Rama propia `codex/oier-billing-refresh31-20261020`, desde la fuente publicada de PR178 **11769380081d7248dc913efc636c5a3ee97b8a5e**. No se modifica esa rama durante sus checks ni las ramas de Asier.

Al actualizar tras una lectura rechazada, las facturas podían volver a cargarse y conservarse el error anterior «No tienes permiso para esta acción». El botón sólo incrementaba la recarga. La corrección retira el error anterior en la acción explícita de refresco, antes de volver a consultar; un nuevo rechazo sigue mostrando su propio error. No se limpian errores desde éxitos de fondo ni se modifican el guard de operación pendiente, comandos, permisos, dinero, SQL o voz.

- Tests **3afde2772d7042f682f5bb4a5a812ac89b9e283f**: tres FAIL causales en 390/768/1440. Secuencia normal→403→normal, fila recuperada y alerta antigua todavía presente; esperado0, observado1. Se conserva el intento original.
- Fix **f1a7262f02c1c26a7002d5b03b29eaeea48bd8b9**: **25/25 PASS**, sin retries, skips o flaky. Tres casos nuevos y las 22 regresiones relacionadas de selección, foco, finanzas y serie. En cada caso nuevo se observan exactamente tres lecturas y cero comandos/errores de página. Lint, TypeScript y build de 44 páginas estáticas PASS sobre este código. El commit de evidencia posterior no cambia la aplicación.
- Seis capturas nuevas de rechazo y recuperación revisadas directamente. La vista móvil de recuperación encuadra los controles y el inicio de la lista; la comprobación de fila recuperada es una aserción DOM. No se presenta como revisión visual completa del módulo.

[Manifest con resultados, errores originales y hashes](refresh31/acceptance.safe.json). Se reutiliza el componente real y el banco HTTP existente, con un rechazo puntual en la ruta de lectura. Esto **no prueba restauración de permisos reales, Auth/DB ni cloud**, y el PDF de la fixture no acepta Storage.

Handoff: seleccionar sólo los commits de tests y fix de esta unidad, después de la selección revisada de Oier30, o componer semánticamente el mismo handler. No importar la rama entera ni promover una nueva sucesora mientras tenga checks activos. No se abre una PR duplicada ni se empuja encima de PR178.

Presupuesto0EUR; Netlify y despliegue intactos. IA comercial writesOFF, contenido StorageOFF, cincoHIGH e historial/W4 abiertos; voz físicaNOT_VERIFIED, issue10OPEN. **DEMO_NOT_READY; RELEASE_NOT_ACCEPTED.**
