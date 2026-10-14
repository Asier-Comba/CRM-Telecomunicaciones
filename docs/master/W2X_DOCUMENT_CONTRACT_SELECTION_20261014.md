# Customer360: distinguir contratos al consultar documentos

CLAIM W2-X #67 /6165893506. Base273e3f1704b65d2c01967f6c39b1219205ccb790.

## Problema comercial

El selector documental rotulaba contratos únicamente con su fecha de inicio. Contratos de distintos operadores iniciados el mismo día resultaban indistinguibles. La reproducción refinada confirma21 opciones (selector vacío y20 contratos válidos) antes de fallar por ausencia de nombres de operador. Los intentos y el error de preparación de diagnóstico se conservan por separado; no se cuentan como verificaciones aprobadas.

## Cambio

Las etiquetas de contrato muestran operador, fecha y estado; consumen el resolvedor de etiquetas ya existente y sus lecturas autorizadas. Los20 contratos de prueba comparten dos operadores: se ejecutan dos lecturas, sin una petición por cada fila. Una denegación de operador muestra Operador no disponible; no expone UUID ni inventa su nombre. El resultado tardío de otra página o consulta se descarta mediante el ciclo de vida existente.

Se conservan customer_id, límite20, cursor y el identificador exacto del destino documental. Los otros tipos de destino mantienen su recorrido. La anchura del selector se limita al contenedor móvil; el operador precede a la fecha para que el dato diferenciador aparezca antes del recorte del control nativo.

## Verificación y límites

Controles finales y hashes en checkpoint.24 pruebas HTTP controlado cubren12 casos nuevos (etiquetas, segunda página, operador denegado y consulta de contratos denegada con recuperación en390/768/1440) y12 regresiones de selección de metadatos. Componentes/repositorio/validadores reales, datos y HTTP sintéticos. Ningún comando comercial; cada selección consulta document.list con target_kind=contract y target_id exacto.

La primera revisión visual detectó que la fecha ocultaba el operador al principio del selector móvil; se conserva esa versión y se revalida el orden corregido. Las capturas son evidencia parcial del recorrido, no aceptación integral de documentos, Auth/RLS/DB/Storage reales o accesibilidad completa.

Sin cambios de contratos backend, permisos, dependencias, W3/W5 o infraestructura. HIGH5/W4/ACK principal pendientes; writesOFF/modeloNOT_RUN/API0/issue10OPEN/releaseNOT_ACCEPTED. PR1537F y fallos históricos no se promocionan. Siguiente tarea: consumo coordinado en composición propia después de terminar controles activos.
