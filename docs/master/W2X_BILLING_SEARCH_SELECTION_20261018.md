# Facturación: selección estable y propuesta vinculada al cliente

CLAIM6252718955, ampliación6252756216. Base `9c2aac6e78fba83785cf47cc1457e40ddd3b64ea`; rama propia `codex/w2x-billing-search-selection-20261018`.

Primer intento: tres fallos de fixture, conservados separados. La consulta First search no coincide con las etiquetas y el parser estricto rechaza el DTO; el positivo también falla. El contrato admite customer active/inactive y cinco resultados por tipo. La variante archived prevista no se ejecutó en ese intento y se sustituyó por un 403. Solo se corrigieron consultas concordantes y ese negativo, sin cambiar validador, límites, caption o controles.

Reproducción corregida sobre el mismo producto padre: **dos fallos y un positivo en29,6s**. Una búsqueda válida de otra empresa borra la identidad verificada del cliente que sigue seleccionado. Cambiar explícitamente A por B mantiene el texto de propuesta escrito para A. El positivo coincidente pasa. Logs, exit1 y ambos snapshots de test se conservan; no se mezclan los tres fallos de fixture con estos dos defectos.

Dos cambios locales: la búsqueda correcta conserva únicamente la identidad previamente seleccionada cuando no está en los nuevos resultados, sustituyendo los demás resultados antiguos; PromptBuilder usa customerId como key y reinicia su intención al cambiar explícitamente el cliente. No se añaden estados, efectos, consultas, permisos, cálculos o comandos. El catch sigue desverificando y bloqueando ante error. La identidad inicial tardía67 y los avisos65 permanecen. Revertir ambas expresiones devuelve exactamente el padre; editor, parser, contrato, cálculo y repositorio intactos. El banco final es idéntico al banco causal corregido, sin relajar aserciones.

Controles propios: **111/111 navegador en2,2min;49/49 funcionales en874,1793ms;build66;lint0errores/3warnings conservados**. Quince nuevos: búsqueda otra/vacía/coincidente/cambio explícito/403 en390,768,1440. Otra realiza B y después C: conserva A y su texto, retira B obsoleto y ofrece C. Cambiar a B limpia la propuesta y mantiene invoice.list filtrado por B. Una identidad inicial y una búsqueda excepto las dos de otra; nuevo banco sin comandos ni invoice.propose. Noventa y seis regresiones de identidad inicial/filtro/archivo/contexto/preparación/avisos. Ningún PASS global heredado.

## Capturas realmente vistas

- search-selection-denied-1440.png — SHA256 40c6096ff591a56c199a595ab8fd87e6d66e4f5718a626379b78bea6ce8d9811
- search-selection-change-768.png — SHA256 63301603a1e8050e899e900a169f80345209d20e9cfda21233f77a30a1a256bc
- search-selection-other-390.png — SHA256 67dca3153801bb47c136f325ee324ca7bb3b84920d946fd39a5480751558edff
- search-selection-change-390.png — SHA256 03a313200e54a65f0b5a5392bff3c531da67f7f7e1e26aa69aeec3026d78a1c0
- search-selection-denied-768.png — SHA256 2a7e16f7fb918f63b2c66ce8e45c58b14bc51a3725304116a24eef0dd6286896
- search-selection-other-768.png — SHA256 04490ef19e827a0903cf703bdcec0644b52ff93432f40228714349e460bb8111
- search-selection-denied-390.png — SHA256 4df7e8d03fb3f08bcd3150a1ad8c63baa705eb02a002044f80a7fbc59e99b8a0
- search-selection-other-1440.png — SHA256 d8ddb5a9ef058a3c022f085e7ac96673d830383bbfa8289d49698871a51e2541
- search-selection-change-1440.png — SHA256 f23068f4da52731e30375b487adb32b9dd843b536ab54276efa85802391c4907

Nueve capturas: otra empresa, cambio explícito y denegación en los tres anchos. Otra conserva A, disponibilidad y texto; B muestra textarea vacía con placeholder gris y Generar deshabilitado. El 403 muestra error seguro, cliente sin verificar, Nuevo deshabilitado y ausencia del formulario de propuesta. Opciones cerradas y sustitución de resultados se verifican por DOM, no como píxeles visibles. Móvil inferior recortado; filas vacías del fixture no prueban ausencia SQL. Banner del fixture excluido. Dictado/voz NOT_RUN; no aceptación visual integral del módulo.

Componentes, repositorio y parsers reales con HTTP/DTO sintético; AuthDB/JWT/RLS/Next integrado/modelo vivo NOT_RUN/API0. Matriz342/29PARTIAL/313sinreconciliar/0READY sin promoción por estos tests. CincoHIGH y W4 pendientes; IA comercial writesOFF, issue10OPEN, releaseNOT_ACCEPTED. Full1755 fuente64 publicado y1773 fuente65 separado, sin arreglos67/69. Próxima regresión coalescida1806/104 únicamente tras1773 terminal/publicado/PASS, con fuente nueva propia. F736/B9/981/1266 y originales de fixture/preparación conservados, sin atribuirles esta causa UI. Fuentes ajenas,PR38/142/153/main/W3/W4/W5/recurso nativo intactos.
