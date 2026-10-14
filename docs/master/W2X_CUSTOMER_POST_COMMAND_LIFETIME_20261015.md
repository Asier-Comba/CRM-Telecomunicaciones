# W2-X · Customer360: continuación después de navegar · 15/10/2026

CLAIM6180715846, base4405c13f0ad724ec3538735182e1187522ce4372, rama codex/w2x-customer-post-command-lifetime-20261015.

## Problema real

Guardar cliente A, navegar B mientras el comando está pendiente y recibir la confirmación inicia un refresco de la ficha A ya retirada. Reproducción previa con customer.update:2 customer.editor esperadas (inicial+verificación obligatoria de customerSaveIntent),3 observadas. Solo la tercera es el refresco obsoleto. No se atribuye fuga del servidor ni persistencia real.

## Cambio

ScopedCustomerDetail marca montaje/retirada. load retorna antes de iniciar una consulta si la ficha está desmontada. El orden por customerReadEpoch existente permanece, para que una lectura anterior no sobrescriba una observación más reciente ni una denegación. La verificación obligatoria tras guardado y la recuperación del mismo intento no se eliminan; no se cancela ni revierte un comando enviado. CustomerEditor/repository/backend/contratos sin cambios.

## Pruebas

45 propias HTTP controlado PASS53.4s:18 nuevas (guardar cliente, crear contacto, archivar cliente ×continuación retirada/activa ×390/768/1440),6 precedencia de recarga/denegación,9 cambios de recurso y12 recuperación de respuesta perdida/lectura fallida. Un comando por prueba nueva; regresiones de idempotencia mantienen su alcance simulado. Lint completo y build66 PASS; escaneo cerrado en checkpoint de publicación. Visual propio parcial de cliente actualizado inspeccionado en los tres anchos: cabecera y resumen, sin desbordamiento visible. Recuentos/finanzas/transportes son fixtures, no métricas reales. El aviso de integración local no convierte respuestas controladas en persistencia Auth/DB.

Sin promoción de matriz ni aceptación integral. Auth/DB/Storage/modelo vivo NOT_RUN/API0. No heredamos36/620 entre SHAs. CincoHIGH/W4/ACK principal pendientes; IA writesOFF, issue10OPEN, releaseNOT_ACCEPTED. F736/B9/7F/3c7 y fallos separados intactos. W3/W4/W5/recursos/ramas38/142/153 no modificados; entregaCI aislada pendiente6166572940.

Siguiente control útil: calificar todo el candidato comercial actualizado con la unión de pruebas anteriores y las33 nuevas en esta fuente exacta, sin repetir ninguna suite verde de una fuente anterior. Después investigar otro defecto comercial independiente.
