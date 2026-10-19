# Unidad 01 — notas de incidencias

Fuente ejecutada: `78a2361b5aeadde9b4af1d137908bbff95dc882d`, árbol `25d2d4b4cdd84c11a050f2279ce4e4d6b322eefe`. Merge normal de `a650a9b348cade254a115fcda89bd2b49ecbbb83` sobre auditoría `aa4a11ee0ba8ae6fa9f0cf76643fcc50d714048b`. Cinco archivos; cero SQL/contratos/infraestructura modificados.

- Antes: banco publicado y fixture a650 sobre producto da468/aa4,390px, FAIL en foco de «Página2·4notas» tras paginar. Es el defecto local reproducido, no RCA del histórico CASE_NOTE_CURSOR151.
- Después:3/3 PASS13,4s,390/768/1440. Componente/repositorio/parser reales, HTTP sintético. Cursor20+4, contenido retirado durante carga/denegación, foco respetado al elegir cerrar, Escape devuelve foco y commands[] comprobados.
- Tres capturas cargadas realmente vistas. Móvil muestra4notas y pie en dos filas, otros anchos4notas y pie en una fila; fondo contiene denegación sintética de responsable. No se afirma aceptación integral de pantalla, roles ni accesibilidad.
- Lint global y typecheck PASS; build normal Turbopack PASS, prebuild público sin configuración PASS, limpieza postbuild PASS. Lint dirigido Node24 de4archivos PASS adicional por diagnóstico de duración, sin cambios ni repetición posterior.
- Bootstrap Node24.19.0:615/620PASS,5FAIL IMPORT_STAGING_INVALID en staging cifrado/permisos POSIX. No se altera este control. La ejecución base Node22.20.0 tenía614/620 y un sexto fallo de preflight; éste desaparece al usar Node24 exigido por .nvmrc, sin corregir producto. Assistant825/825PASS sobre base da468 con fixtures de notas añadidos, NO atribuido a78 como ejecución propia de assistant.

Primeros intentos conservados: navegador faltante3FAILantes de ejecutar; loader síncrono Node22/Playwright TypeError1FAILantes del cuerpo. Se verificó que el fixture compila fuera del runner y se usó PLAYWRIGHT_FORCE_ASYNC_LOADER=1, presente en el propio código instalado de Playwright. Banco causal/final y aserciones idénticos; no timeout/retry/permiso relajado. No corrección de dependencias ni bypass de tests.

Reproducción: npm ci fijado; Chromium1228 fijado por lock; configuración temporal Playwright con testDir tests/e2e-preview, timeout60000,workers1,retries0,sin webServer/proyectos (cada banco inicia/cierra su servidor de componente). Ejecutar case-note-pagination.spec.ts. Logs, traces y PNG originales permanecen en work fuera del repositorio; huellas en evidencia adjunta. Las pruebas regulares del repositorio siguen siendo obligatorias.

Auth/DB hospedado nuevo NOT_RUN. CI audit-only aa4:39289546945 tenía fallo de inicialización de contenedores en nativo y fallo quality, además de auditoría all-ref39289546985FAIL; no son resultado de78. Cowork conserva bloqueos Storage/HTTP. Las342filas y0READY permanecen sin promoción; IA writesOFF y releaseNOT_ACCEPTED. Siguiente unidad contactos9c361c9, con reproducción propia y regresiones del Drawer/ConfirmDialog compartido.
