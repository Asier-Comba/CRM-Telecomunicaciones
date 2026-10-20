# QA independiente26 de los deltas W5 acordados

CLAIM6302517822, fuente PR171 **db4544893c62339e281c980b1a97e8879ad8820a**. Lectura de b484a25b/d34eca0f/db454489, sin editar pruebas/fixtures/ramas/infra W5, sin recurso físico ni SQL. No aprobación W4 o autorización de integración/deploy.

## Hallazgo acotado: falta negativo de versión nueva duplicada

**scripts/platform/composition.mjs:33**, checkForwardMigrations (añadido en db454489), comprueba preservación de blobs y que cada alta sea posterior al último timestamp compuesto. No comprueba que dos altas distintas entre sí tengan versiones nuevas diferentes. La función anterior unionMigrations sí rechaza esa colisión.

[Reproducción pura](platform26/forward-negative.safe.json): texto exacto de ambas funciones extraído por AST del blob Git acordado; sólo se retiró el modificador export para invocarlas en Node, sin reimplementación. Hash del módulo, texto/posición de función y entradas sintéticas en evidencia. Sin importar/ejecutar composition(), sin modificar índice/worktree, manifiesto de W5 o migraciones reales.

- Positivo: base intacta y una alta posterior aceptadas.
- Negativos conservados: cambio/borrado de base o alta anterior rechazados con FORWARD_ONLY_MIGRATION_DRIFT.
- Negativo ausente: dos nombres nuevos con el MISMO timestamp posterior son aceptados por checkForwardMigrations; con las mismas entradas unionMigrations rechaza MIGRATION_VERSION_COLLISION.

**Alcance:** brecha de validación y cobertura del helper nuevo. No demuestra bypass completo de la pipeline: otros gates de inventario/bootstrap/native pueden rechazar esos archivos. La candidata actual no contiene esas dos altas ficticias. No afirmar migraciones corruptas, fallo DB o vulnerabilidad explotada.

REQUEST W5: conservar unicidad global de versiones en la ruta forward-only y añadir negativo de dos altas nuevas con igual timestamp, además de los negativos actuales. Ejecutar sus controles propios en su fuente y entregar delta para revisión; Oier no cambia sus tests/fixtures. PrioridadP2 para cerrar la coherencia del nuevo contrato de composición antes de aceptarlo como garantía de evolución de HEAD.

## Otros dos cambios y límites de revisión

b484a25b: el predicado exige referencia oficial derivada del digest acordado y un RepoDigest exacto del mismo publisher. La prueba física ahora inspecciona la imagen por metadata.Image, además de mantener restricciones de red/volumen. Positivos de dos publishers y negativos de digest/tag/mirror ausente conservados en la fuente. No ejecución física propia ni ampliación de imágenes aceptadas por Oier.

d34eca0f: modo explícito histórico86 valida primero directorio87 exacto y devuelve sólo86blobs fijados, comprobados por hash; ante fallo87 usa el loader86 estricto. Loaders/manifest originales no se modifican en ese commit. Los workflows ahora etiquetan alcance histórico. Un verde ahí prueba86, NO aplicación o aceptación funcional87. Perfil87 y pruebas del producto actual siguen separados. No se vuelve a ejecutar el recurso.

db454489 cambia el objeto de la composición: árbol histórico32862faf debe ser ancestro y coincidir con las dos fuentes congeladas; HEAD sólo conserva migraciones anteriores/altas posteriores y su listadobootstrap. **src deHEAD queda declarado propiedad del integrador, sin vínculo de esa composición.** Requiere controles del producto, origen exacto y decisión/revisión independiente explícita; no convertir suPASS en aceptación del contenido de8ee o seguridad de release.

PR171 tiene6SUCCESS/3FAIL terminales observados, distintos de PR175/8ee2SUCCESS/6FAIL. No herencia de verdes entre ramas, reintento de cuotas, cancelación, modificación de digest/tiempos/límites ni aplicación deSQL. W5 conserva ownership; Asier integra selectivamente, revisor independiente disponible decide lo que corresponda. CincoHIGH/historia/vendor/Storage/backup y RELEASE_NOT_ACCEPTED permanecen.

Presupuesto definitivo0EUR/6302343684: NetlifyFree y deploy existente intactos; no Pro/tarjetas/créditos/gastos. Siguiente unidad autorizada: publicar evaluación de hosting gratuito basada en documentación oficial y límites de privacidad/runtime; ninguna migración o despliegue autorizado.

## Seguimiento28 — corrección W5 revisada, ACK limitado

Entrega W5/6302689889, CLAIM6302758694. Fuente nueva **a13787d1056828f0f45e083cb73f44b87b763ceb**, sólo composition.mjs y su test; sin cambio de hash/manifest/conteos. Añade unicidad global de los14dígitos sobre todas las rutas deHEAD después de los guards existentes.

[Probe independiente28](platform26/fix28-validation.safe.json), ejecutado con el texto exacto de funciones de ese blob: par duplicado y par+otra alta posterior ahora rechazan MIGRATION_VERSION_COLLISION; dos versiones nuevas distintas pasan. Base/una alta pasan; cambio/borrado/backdate siguen rechazados, y la unión mantiene su negativo. Nueve entradas medidas, no nuevo resource/pipeline/DB o ejecución propia112/19. Esos bancos globales son reportados por W5 y no heredados.

**ACK técnico Oier: se cierra el hallazgo26 del helper en a13787d1**, con sus negativos pertinentes. No aprobación del cambio completo de alcance histórico, adopción en175, CI de otra fuente, seguridadW4, deploy o release. Conservar la reproducción db454 como fallo original; Asier y el revisor independiente disponible conservan sus decisiones. La etiqueta srcHEAD fuera de composición sigue requiriendo controles propios del integrador y trazabilidad del SHA/artefacto.
