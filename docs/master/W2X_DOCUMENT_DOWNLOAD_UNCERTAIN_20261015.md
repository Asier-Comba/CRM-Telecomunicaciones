# W2-X · Reintento de descarga privada · 15/10/2026

CLAIM6181243189, base dec2edcad7f4796440daff2c1e59dde6ca7981c1, rama codex/w2x-document-download-uncertain-20261015.

Reproducción causal original: respuesta de ticket inválida, reintentar descarga y comparar cuerpos → command_id distinto. El fixture registró dos identificadores para un acceso lógico. Se conserva log y observaciones. Es evidencia simulada del consumidor, no dos efectos SQL reales.

IntegratedDocuments conserva intención/ticket con transport_uncertain e internal_safe. Mientras el resultado es desconocido bloquea Cancelar/Escape/cierre y explica que debe reintentarse la misma descarga. Una denegación confirmada permite cerrar y limpiar el intento. Si solo falla el binario se reutiliza ticket, sin solicitar otro. El guard de retirada del ámbito de la unidad anterior permanece. No modifica endpoints, autorizaciones, duraciones, límites, contratos, backend ni W3/W4/W5.

91 propias navegador PASS3.1min:18 nuevas (ticket/binario × respuesta inválida/perdida o denegada ×390/768/1440) y73 regresiones documentales. Comprueban mismo cuerpo/identificador al reintentar, un ticket simulado, mismo ticket del binario, una descarga exitosa, bloqueo Escape cuando incierto y cancelación permitida tras403.12 regresiones de selección usan repositorio de fixture; las nuevas usan componentes/repositorio/parsers reales y HTTP controlado. Lint/build/escaneo se cierran en checkpoint antes de publicar.

Tres capturas propias del ticket inválido inspeccionadas: mensaje seguro, Cancelar deshabilitado y reintento visible en390/768/1440, sin desbordamiento visible. Aceptación visual parcial. Datos/binarios/efectos del fixture sintéticos; Auth/DB/Storage y modelo vivo NOT_RUN/API0. No se heredan704 de dec2 ni se declara aceptación integral. La ejecución completa704/704 PASS11.7min de dec2 conserva suSHA/handoff6181375437.

Se conservan todos los fallos originales, incluida reproducción causal de esta unidad, a292640/13+13 complementarios por cwd, F736/B9/7F/3c7 y preparaciones. CincoHIGH/W4/ACK principal pendientes; IA writesOFF, issue10OPEN, releaseNOT_ACCEPTED. Matriz sin promoción; ramas38/142/153 y fuentesW3/W4/W5 intactas.

Siguiente control útil: colección y ejecución completa de fuente actualizada722 previstos, sin trasladar704; verificar fuente/cwd/propiedad y cuota real antes de despachar. No repetir suite verde anterior.
