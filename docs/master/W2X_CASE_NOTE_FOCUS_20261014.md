# W2-X — navegación de notas internas de incidencias

CLAIM: issue67 comentario6156379414. Base verificada: PR38 `60acdc5d6a2ae41ff3d751724582ade0c0762788`. Rama propia `codex/w2x-case-note-cursor-20261014`; integración pendiente de ACK del propietario.

## Problema y cambio

Con el componente real CaseDetail, al activar «Más notas internas» con teclado el pie desaparece durante la carga y el foco se pierde. La reproducción sobre la fuente base con HTTP controlado falla en la aserción de foco después de cargar la segunda página. Ahora el estado de página recibe el foco cuando este se ha perdido; si el usuario elige otro control durante la carga, se respeta su elección. El error de paginación también puede recibir foco. Escape sigue cerrando el panel y devolviendo el foco al botón de apertura.

El consumidor Auth/DB existente correlaciona las dos respuestas de notas por operación, incidencia, límite20 y cursor esperado, en lugar de operación solamente. Mantiene todas las aserciones originales: status200, primera página20/cursor20, segunda página4/primer seq21/sin cursor siguiente. No cambia timeout, permisos, consultas, SQL, imagen ni recurso W5.

## Evidencia y límites

- Navegador Chromium: 3/3 casos en390/768/1440 con componente, repositorio y parsers reales, HTTP controlado. Verifica20+4, retirada durante carga, foco recuperado, vuelta a primera página sin robar foco, denegación sin contenido anterior, cierre, ausencia de comandos y ausencia de desbordamiento horizontal. Capturas cargadas inspeccionadas en las tres anchuras.
- El primer fixture omitía la lectura ordinaria customer.list y produjo fallos de preparación; se conserva separado. La reproducción corregida demuestra únicamente el defecto de foco descrito.
- Typecheck y lint de los cuatro archivos de código pasan localmente. Los controles globales del nuevo SHA requieren su propia CI; no se heredan1430/362/Sup107 de la base.
- `npm test` local Windows: bootstrap606/611, cinco fallos IMPORT_STAGING_INVALID en el adaptador desechable que exige permisos POSIX0700. No se modifica ni se omite ese control. La cadena no llegó a ejecutar assistant; la ejecución independiente de assistant pasa819/819.
- Primer build local: Turbopack rechaza node_modules enlazado fuera del checkout. Se conserva el fallo; npm ci con instalación local propia y el mismo lockfile permite completar el build Turbopack normal, incluido TypeScript y generación de páginas.

PR151 `b9dbd868a52c1196eb08bc1b0917a468c74ad0e6`: fallo original Sup106/1 `case:note_paging`, `ACTION_FAILED/CASE_NOTE_CURSOR`, causa completa UNKNOWN. Una respuesta inicial tardía es una hipótesis de correlación, no una RCA demostrada. Este navegador controlado no acredita Auth/DB real, aceptación del recurso/cache151 ni una corrección causal de aquel fallo.

Contrato case.v1 y aislamiento multiempresa sin cambios. No se editan fuentes W3/W5 ni ramas propietarias. W4, cinco HIGH, full23, staging y modelo vivo pendientes; IA writes OFF, release NOT_ACCEPTED, gasto de API0. No se promueve ninguna fila completa de la matriz.

Siguiente unidad: inspección de Contactos Customer360 PAR-042, con nuevo CLAIM antes de editar y sin solaparse con Works activos.
