# W2-X · Oportunidades: lectura tras recibo tardío ·15/10/2026

CLAIM6199848668. Base investigada2468b2d376d8d1de5a1303e175de4833b312467d. Antes de controles finales se compone la fuente propia de Cartera solo si está publicada y cualificada; el checkpoint identifica el padre real.

Cambio de etapa y actualización desde editor: recibo pendiente, cambio de empresa y liberación. Ambos originales realizan una lectura work.get del contexto retirado (esperado0/observado1). Primer banco4:3FAIL/1PASS. Dos FAIL causales; el tercer fallo es el positivo de editor que medía antes de esperar el cierre de UI. Se ajustó solo la espera de ese positivo y se ejecutó únicamente ese caso:1PASS21.6s, producto original intacto. No se declara4PASS ni se oculta el intento inicial.

La vista scoped comprueba vigencia antes/después de work.get en movimiento y callback del editor. Un componente retirado no encadena lectura ni publica sus mensajes/estado. Los comandos pendientes no se cancelan; recibos, idempotencia, CAS, validaciones, permisos y recuperación de errores se conservan. Reutiliza fixture/proveedor existentes; sin nueva primitiva ni recurso.

24 casos nuevos de dos caminos por empresa/actor/lector/vigente y390/768/1440. Los positivos esperan el resultado visible antes de medir lecturas; conservan operación/cuerpo/expected_version y exactamente un comando simulado. Los negativos comprueban ausencia de lectura posterior a retirada. Regresiones de pipeline/editor se ejecutan sobre la composición final y sus cifras reales quedan en checkpoint.

HTTP controlado y efectos simulados, no Auth/DB/Storage ni modelo vivo. Visual pendiente hasta revisión real de capturas. HIGH5/W4/ACK principal pendientes, IA comercial writesOFF, issue10OPEN y releaseNOT_ACCEPTED. Ramas38/142/153/main y W3/W4/W5 intactas. Fuente, fallos, hashes y próxima tarea en checkpoint.
