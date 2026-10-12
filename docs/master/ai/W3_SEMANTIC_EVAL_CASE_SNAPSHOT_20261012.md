# W3: banco de casos estable durante una evaluación

El padre `af98c6ab88318ac716429f99afafdd891db80aa5` conservaba referencias a los casos del llamador mientras esperaba al transporte. Dos regresiones sintéticas fallaban antes del arreglo: cambiar el gold durante la llamada convertía una respuesta incorrecta en intent correcto y eliminaba la aplicabilidad de rechazo inseguro; modificar y retirar el segundo caso cambiaba su prompt/evidencia y el conjunto empleado para calcular denominadores.

`runLiveSemanticEval` toma ahora una copia estructurada del banco completo antes de cualquier espera. Peticiones, mapa de casos, juicio y métricas utilizan esa misma copia; el transporte recibe únicamente copias de contexto/evidencia, nunca el gold. Se conserva el banco original para el llamador, la pertenencia e identidad admitidas, los errores/timeouts y la ocultación existente de IDs/respuestas esperadas. No cambia el planner ni sus capacidades.

Verificación local: dos regresiones previas FAIL;16 pruebas de evaluador/benchmark PASS;642 pruebas del asistente PASS; tipado estricto focalizado y lint PASS. Las pruebas exigen casos puntuados y comprueban las observaciones fuera del adaptador, además de denominadores, grounding y pertenencia. Datos y transporte sintéticos, sin API/modelo real ni escrituras CRM. La configuración `mode:llm` de un stub no acredita modelo vivo.

Cada SHA necesita sus controles propios antes de integración. RAG operativo, presupuestos duraderos por empresa, recurso W5, controlador físico completo y aceptación W4 permanecen pendientes. IA writes OFF; release NOT_ACCEPTED.
