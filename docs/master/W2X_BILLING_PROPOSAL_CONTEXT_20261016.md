# Propuestas de factura: responder solo al contexto vigente

CLAIM6213214507; base f0f0b2b491412292b2123c096c136f6898329aaa; rama propia codex/w2x-billing-proposal-context-20261016.

Antes de cambiar producto: original a1440 1FAIL/1PASS30.2s. Tras generar propuesta local, retener su validación invoice.propose y quitar explícitamente el cliente, la respuesta tardía abría el editor antiguo (esperado0/observado1). La respuesta del contexto conservado abre el editor y pasa. Se preservan test, log y trazas originales. No se guardó ni emitió factura en esa reproducción.

onGenerate usa el invoiceRequest y mounted existentes. Cada propuesta guarda su revisión actual y solo publica editor/mensaje/error si sigue vigente y montada. Cambiar cliente, abrir borrador manual u otra propuesta ya retiran esa revisión con los controles existentes. No se cancela ni se interpreta revertida una petición emitida; se evita publicar su respuesta retirada. No hay helper, servicio, driver o estado nuevo. Parser local, DTO, presupuesto W3, permisos y comandos sin cambios.

Banco propio61:18 propuestas en6modos/3anchos (cliente quitado, borrador manual, última propuesta, error retirado, vigente,403vigente), más43 regresiones de filtro/cliente/preparación/resumen financiero. Las respuestas cerradas savedfalse/requires_reviewtrue reflejan el draft enviado y su cálculo real; no certifican efectos SQL. No se ejecuta invoice.create_draft ni invoice.issue en el nuevo banco. HTTP controlado con componentes/repositorio/parsers reales, sin LLM/API externa.

Nueve capturas clear/current/latest a390/768/1440 fueron realmente revisadas: el contexto retirado no abre drawer; el vigente abre revisión y el cliente/serie/fecha son legibles. Revisión parcial: conceptos, importes y acciones inferiores quedan fuera del viewport en los drawers; su conservación se acredita por aserciones DOM, no por estas imágenes. No aceptación del módulo entero, permisos reales ni accesibilidad integral.

El checkpoint externo registra controles terminales propios y hashes; no hereda43 ni globals. Auth/DB/JWT/RLS, Next integrado y modelo vivo NOT_RUN; API pagada0. Global2741fb8 original1266FAIL1253PASS13FAIL conservado por CWD del lanzador; los13 de setup se reejecutan separadamente desde repositorio en el mismo pin, sin repetir1253ni declarar1266singlePASS. El1311 de4221edc se detuvo antes de dispatch y requiere cierre documentado/resume propio.

Cola342/22PARTIAL/320sinreconciliar/0READY. HIGH5/W4 pendientes,IA writesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9/981 original/primer210/script33 intactos; fuentes ajenas y recurso W5 sin cambios.
