# W2-X · Reintento exacto de altas manuales · 15/10/2026

CLAIM6188526258. Investigación desde c15f4620e49d839818d32455829644b32ad81f79, compuesta mediante avance directo de la rama propia sobre2268fbe53d03cbe5bebff5eff2f7234c02751675. PortfolioCreate no cambió entre ambas bases; el hash de la corrección local se conservó al componer.

Reproducción causal original: recibo de service.create_manual con versión inválida tras efecto simulado; reintentar cambia command_id. Se conservan diff de dos identificadores y observaciones del fixture. No prueba duplicación SQL real. El consumidor corregido pasa ese mismo caso conservando cuerpo/identificador y un identificador de efecto simulado.

PortfolioCreate trata internal_safe y transport_uncertain como resultado desconocido. Conserva el intento exacto, bloquea cierre/Escape/campos y ofrece reintentar la misma acción. Un recibo confirmado sigue recuperándose con consultas, sin reenviar comando. Una denegación confirmada permite cerrar. No cambia parser, contratos, permisos, backend ni efectos del operador.

Banco propio172 en seis archivos:46 casos nuevos (identidad causal y45 de cinco tipos de alta por recibo inválido/perdido/denegación y390/768/1440);18 regresiones de recuperación de alta;36 de líneas;54 de renovaciones/permanencias y18 de selector de contrato. Ver resultado real y fuente exacta en w2x-portfolio-invalid-receipt-checkpoint.json. No se heredan57,54 ni740 de fuentes anteriores. Los nuevos casos comprueban cuerpo completo idéntico al reintentar, un identificador de efecto simulado, bloqueo de cierre/campos durante incertidumbre y cierre permitido tras403. No son pruebas Auth/DB.

Preparación fallida conservada: contrato no llegó al formulario porque el label de contrato simulado no contenía input.query y parseGlobalSearchV1 lo rechazó correctamente. Primer control de dos flujos1FAIL/1PASS; corregido solo label de fixture y repetido únicamente contrato fallido,1PASS. Permanencia verde no repetida en esa comprobación. La composición posterior tiene controles nuevos propios.

Visual parcial y capturas inspeccionadas según checkpoint. Datos, recibos y efectos sintéticos; Auth/DB/Storage/modelo vivoNOT_RUN/API0. La suite global de la fuente compuesta requiere su propia ejecución, sin trasladar740 de b509 ni elevar aceptación de módulos por cifras agregadas. Matriz sin promociones.

Se conservan todos los fallos originales y warning previo de lint en IntegratedBilling. HIGH5/revisiónW4/ACK principal pendientes; IA comercial writesOFF, issue10OPEN y releaseNOT_ACCEPTED. Sin cambios de fuentes/ramas38/142/153/W3/W4/W5, recurso nativo, producción ni secretos. Continuar otra unidad comercial reproducida tras publicar fuente, controles y checkpoint.
