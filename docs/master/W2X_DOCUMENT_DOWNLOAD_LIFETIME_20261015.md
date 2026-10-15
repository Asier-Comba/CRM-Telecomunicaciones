# W2-X · Descarga documental y retirada de ámbito · 15/10/2026

CLAIM6181043016; basec13787ad27009022d54b3b1ef2231fdadaa4b00f; rama codex/w2x-document-download-lifetime-20261015.

## Reproducción y cambio

Con ticket de document.request_download retenido, cambiar empresa desmonta la vista mediante el límite de Provider existente. Al recibir el ticket, la vista retirada todavía iniciaba document.download:0 peticiones binarias esperadas,1 observada. Reproducción causal previa conservada con observaciones; no se atribuye una fuga del servidor.

IntegratedDocuments marca montaje y retirada. Tras recibir ticket comprueba vigencia antes de iniciar descarga; tras recibir binario vuelve a comprobarla antes de crear URL/enlace. Errores y finalización de una operación retirada no actualizan estado. Mantiene operaciones/parsers/permisos y reglas existentes de reintento, no cancela ni revierte comandos enviados ni cambia recursos/backend/W3/W4/W5. ProductProvider real ya remonta por modo/actor/empresa/rol; fixture reutiliza ese límite. Cambios que no desmontan la instancia quedan fuera de esta aceptación.

## Evidencia propia

73 pruebas navegador PASS1.5min:27 nuevas (ticket/binario pendientes por empresa/actor/lector en3 anchos, descarga activa y denegaciones de ticket/binario),27 integridad,7 archivo/restauración y12 selección/retirada de metadatos. Las27 nuevas usan componentes/repositorio/parsers reales con HTTP controlado; las12 de metadatos usan transporte/repositorio de fixture y React de producción. No son Auth/DB reales. Un ticket simulado por caso, petición binaria0 al retirar antes del ticket y1 si ya estaba en curso; cero descargas retiradas. Positivo:una descarga. No cambios en límites ni aserciones.

Lint completo y build66 PASS. Tres visuales propios390/768/1440 inspeccionados con empresa B, documento nuevo y controles operativos; sin diálogo/error antiguo ni desbordamiento visible. Alcance parcial de Documentos, sin aceptación integral. Contenidos/tamaños/recuentos del fixture simulados, no Storage/persistencia ni mediciones reales. Auth/DB/Storage y modelo vivo NOT_RUN/API0.

No se heredan677 de c137: su ejecución completa PASS10.5min conserva fuente exacta. Se mantienen primer intento a292640/13 por cwd más13 complementarios del mismoSHA, F736/B9/7F/3c7 y preparaciones fallidas. CincoHIGH/W4/ACK principal pendientes; IA writesOFF, issue10OPEN, releaseNOT_ACCEPTED. Matriz sin promoción y ramas38/142/153 intactas.

Siguiente: control completo del candidato actualizado704 previsto (colección por verificar) y auditoría independiente de conservación del identificador de ticket ante respuesta inválida o perdida; CLAIM y reproducción antes de nuevos cambios.
