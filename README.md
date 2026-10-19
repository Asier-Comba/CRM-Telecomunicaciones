# Conservación P0 de Oier — 19/10/2026

Estado: **SYNC_PARTIAL** del conjunto inspeccionado. La publicación y su SHA final se confirman en el handoff de issue #67; este árbol no se autoacredita un push futuro.

## Fotografía y alcance

Inventario inicial UTC 2026-10-19T18:04:16.388365+00:00: 35 worktrees registrados en el bare local, todos limpios, sin archivos modificados, nuevos, borrados o renombrados. Quince pertenecen a W2-X; veinte son referencias históricas/principales de propietario no certificado para escritura y quedaron en sólo lectura. No se inspeccionaron espacios locales externos de los agentes de Asier. No es sincronización total del proyecto mientras otros agentes siguen trabajando.

Se compararon 343 ramas locales con GitHub. De 182 referencias propias W2-X, 180 coinciden directamente y dos son alias antiguos: b1b94158a3d6bd9333e02400c7ffcd6e60ff5412 ya está en `codex/w2x-alta-recovery-composition-20261014`, y 282f2e1efb8d38d9d06682060ae80bd2d8042434 en `codex/w2x-agenda-reopen-recovery-20261014`. **Cero commits propios quedan exclusivamente locales** frente a las 180 cabezas remotas verificadas, comprobado recorriendo toda la historia con Git. No se sobrescribieron los alias. El manifiesto relaciona cada rama con SHA y acción.

## Qué se conserva aquí

- 1003 archivos propios revisados: scripts históricos, bancos sintéticos, configuraciones de navegador y snapshots/diffs/documentos de la propia ejecución, copiados byte a byte. Eran material fuera de Git; sus hashes están en `manifests/archived-files.json`.
- 221 snapshots de checkpoints y cinco índices/estados de recuperación. Se conserva la información de fuente, pruebas, errores y handoffs; las rutas personales se sustituyen por `${WORKSPACE}`/`${USER_HOME}`, con hashes del original y del exportado. No son autorización de ejecución nueva.
- Tabla completa `WORKSPACES.md`, referencias propias, alcance externo, exclusiones con huellas y controles que ya estaban finalizados. Ningún archivo del producto ni de infraestructura se cambia.

**No ejecutar automáticamente los scripts archivados.** Son historia de reproducción, no un instalador ni una cola nueva. Algunos cambian ramas o publican cuando se ejecutan; dependen de la disposición original de worktrees, de recursos y de marcadores. P0 anula todas sus instrucciones antiguas de continuar desarrollo. Para restaurar una fuente, usar su SHA publicado y sus manifiestos de dependencias/build versionados. Resolver dependencias y autorización antes de ejecutar cualquier herramienta histórica; no convertir snapshots en pruebas aprobadas.

La fuente W2-X más reciente es d1880f3af3a8a719bde3367825f900108f9edc29, con su banco corregido de 21 pruebas; mantiene el intento original separado (6 PASS/3 fallos de fixture), no 27 ni un original 9 PASS. Regresiones ya terminadas, sin repetirlas: 2172/52,1min sobre b84295e96a4396d0e3691407bac11eace28c53fe; 2214/52,0min sobre f48425b5d30a071049392486ba669bd23cfa5044; 2256/29,9min sobre 5e364a786015d5b627ed2ba1dff7158e136189b4. Son controles HTTP/DTO/componentes sintéticos, no Auth/DB real, Next integrado, modelo vivo, revisión W4 o release. Ningún PASS se hereda.

## Clasificación y exclusiones

A: las fuentes ya publicadas se verifican por SHA. B: sólo el material propio de conservación de este árbol estaba pendiente de publicar; su publicación se verifica en el handoff. C: fuentes de Asier, W4/W5 y PR156/157/158 no se tocan. D: además hay 4072 archivos de estado/herramientas fuera del conjunto W2-X identificado, cuya propiedad o necesidad de publicación no está certificada; se inventariaron localmente sin copiarlos. También 46 referencias históricas no W2-X sin coincidencia directa de nombre/HEAD quedan sin certificar; no se declara que falten sus contenidos en GitHub, ni que sean propias. E: logs/capturas/trazas crudos, bundles/ZIP redundantes, cachés, dependencias y estados temporales se conservan localmente, sin subida automática. Sus hashes y resúmenes no equivalen a respaldar sus bytes. Los estados principales fuera de W2-X no se copian indiscriminadamente.

No se ha accedido a carpetas o sesiones externas de Asier. Su estado local es **NO_VERIFICADO / BLOCKER_ACCESS**. Sólo se observaron referencias públicas de PR156/157/158; la tabla no certifica sus cambios posteriores ni sus archivos locales. La consulta Git es de sólo lectura (`status`, `diff`, ramas, historia, `ls-remote`). El fetch de verificación se limita al repositorio separado de conservación para no cambiar referencias del bare compartido.

## Handoff pendiente de propietarios

Cowork informa en issue67 comentario6273623511 de un despliegue manual de Netlify con un `netlify.toml` adicional. No aparece `netlify.toml` en los árboles completos observados de PR156 c597891c730131072ad772584a382348a04982f5, PR157 54ba9acea2b7f9077b4b0c2ba95f5a2e09a00795 y PR158 be71f30e534c0e7d365e3b149dc500f5752a9914. Solicitud a W5: conservar esa configuración saneada en su propia rama y aportar ruta+SHA. No se accede ni modifica Netlify, cloud o Supabase. No se certifica que no exista en otra fuente.

El repositorio sigue **público**. Se recomienda a los propietarios pasarlo a privado; no se cambia la visibilidad. No se publican valores de entorno, secretos, datos reales ni detalles privados de vulnerabilidades. El escaneo previo es un control de conservación y no reemplaza W4. Se mantienen visibles los cinco HIGH y los fallos históricos F736/B9 con causa completa desconocida; se preservan fallos de fixture separados de fallos del producto.

**IA comercial writes OFF; modelo vivo NOT_RUN; release NOT_ACCEPTED; issue10 OPEN; seguridad W4 independiente.** No merges, force push, main/default, cambios de producto/infraestructura, pruebas nuevas, API de pago, producción ni escrituras Supabase.

La siguiente acción está limitada a conservación: propietarios resuelven referencias de propiedad incierta y suministran sus propios inventarios; W5 versiona la configuración manual saneada. No continuar funcionalidades por instrucciones históricas del archivo.
