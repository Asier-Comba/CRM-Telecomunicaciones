# Unidad11 — propuestas de factura y contexto vigente

Fuente propia medida:94102c24d0d2d854f96bbe384c0abf402039232c; árbol6a5b5c762d3aa8983cf1b5d2309b023416881f45. Base474e7e2. Adopción selectiva de PR160 HEAD8fca4c8bfb921fd61ab02310999716ffaf9023cf: tres archivos comerciales y19archivos de bancos, sin incorporar sus ZIP/historia/documentación masiva. ACK técnico6288602043, alcance comunicado6288948712.

## Comportamiento

El parser conserva conceptos compuestos como instalación de fibra, interpreta vencimiento en quince días y evita tomar una cláusula monetaria como concepto. El dictado que falla al construirse o iniciarse conserva el texto y su procedencia; sólo una transcripción no vacía marca audio. La propuesta mantiene revisión humana y no guarda/emite por sí sola.

IntegratedBilling retira las respuestas de propuesta anteriores al cambiar/quitar cliente, abrir otra factura, nuevo borrador, ficha fiscal o confirmación. Una respuesta tardía de error tampoco contamina el contexto nuevo. Cliente ambiguo o distinto requiere corregir texto/selección antes de proponer. PromptBuilder se remonta al cambiar cliente para retirar texto y reconocimiento anteriores. No se cambian contratos, permisos, backend o primitivas.

## Pruebas propias sobre la fuente indicada

- Parser antes sobre474:21PASS/3FAIL de24; conceptos truncados/ausentes y quince días sin vencimiento. Después:24PASS,10escenarios.
- Selección anterior sobre474:2FAIL390; tras cambiar/quitar cliente, la propuesta retenida abría el editor del cliente anterior. Banco y trazas conservados.
- Después:99PASS390/768/1440,0FAIL/skip/retry/flaky,9.5min. HTTPcontrolado; componente real, repositorio y DTOs. Micrófono/voz son simulados; no modelo ni proveedor.
- Regresión existente:88PASS,0FAIL/skip/retry/flaky,2.2min. Total187casos únicos, sin sumar fotos a pruebas. Incluye recibos inválidos/incertidumbre, selección, resumen financiero y límites de lectura.
- Lintglobal/typecheck/build44PASS. BootstrapWindows643PASS/5FAIL de648; cinco fallos conocidos de permisos POSIX de importación. No se borran ni se convierten aPASS.
- Revisadas las capturas del diálogo fiscal vigente390/768/1440: la respuesta anterior no lo sustituye, campos y botón visibles. No acredita estética de todas las pantallas.

Evidencia en work/unit11-*.log, unit11-parser-*.json, unit11-concept-after.json y qa-unit11-{before,after,regression}/. Configuración de QA de integración en work/crm-unit11.config.cjs conserva45s/expect4s,1worker,retries0 y tres tamaños; usa el recurso de facturación existente sin copiarlo.

Esta fuente se publicó después dentro de2f87fdc8 con corrección loopback yPT409/migración87. Los resultados187 pertenecen a941; la composición posterior requiere su propia validación. La fuente Oier8fca y su merge/CI tienen procedencia distinta y no se heredan.

## Límites

AuthDB alojadoNOT_TESTED, voz realNOT_RUN, modeloNOT_RUN, IA de negocioOFF/gasto0. Fuente de releaseNOT_ACCEPTED. Guardar/emitir/PDF/roles con AuthDB dependen de CI y QA hospedada propias. Las342exigencias comerciales no quedan aceptadas por estos bancos. Sin main, hosting, SQL alojado o resellpro modificados.
