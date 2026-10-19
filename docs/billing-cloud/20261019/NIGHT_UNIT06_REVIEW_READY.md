# Unidad06: propuesta de retiro de respuestas, sin aplicar

[proposal-context.patch](../../../tools/oier_billing_qa/candidates/proposal-context.patch) es un delta preparado para IntegratedBilling, no aplicado al archivo comercial de Asier. Añade contador de solicitudes; invalida al cambiar cliente/disponibilidad o desmontar; retira resultado/error si otra solicitud o contexto lo ha reemplazado. No cambia permisos, recibos, efectos, contratos ni configuración.

[Metadatos](evidence/proposal-context-candidate.json): ambas propuestas de patch pasan juntas `git apply --check`; el TSX propuesto tiene cero diagnósticos de sintaxis, analizado en memoria sin ejecutar el componente ni escribir una copia de producción. **No hay typecheck, lint ni pruebas funcionales del cambio aplicado**: requieren ACK exacto, aplicación y ejecución propias. No se fabrican PASS de corrección a partir de un diff o AST.

El banco causal de unidad04 permanece3PASS/12FAIL, y unidad03,27PASS/3FAIL. Se preservan los controles y trazas de sus propios árboles. Tras delegación hay que comprobar el momento de cleanup, A→B→A, solicitudes consecutivas, desmontaje, recibos inciertos y controles positivos antes de publicar una corrección. La precedencia de un nombre de cliente dictado que contradiga el selector requiere criterio comercial aparte; este delta no lo define.

Se corrigió también el enlace relativo al patch de parser en el documento05 y se verificó que resuelve dentro del checkout.

[RECOVERY_CHECKPOINT.json](RECOVERY_CHECKPOINT.json) permite recuperar fuentes, resultados, límites y próximas acciones desde GitHub sin depender de los checkpoints locales. No main/merge/SQL/deploy/flags/usuarios/producción, IA comercialOFF yreleaseNOT_ACCEPTED.
