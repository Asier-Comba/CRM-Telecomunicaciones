# Recuperar una reapertura de oportunidad sin quedar bloqueado

W2-X, CLAIM issue #67 / 6164159920. Base propia `c7eab4bcbf5547c3c8ae03f773a1fa731e3334c1`.

## Defecto reproducido

Una oportunidad ganada o perdida se reabre mediante «Aplicar etapa». Si se pierde la respuesta, el editor conserva correctamente el comando y bloquea el cierre. Sin embargo, también deshabilita «Reintentar la misma acción»: reutiliza la condición de edición del registro cerrado anterior. Además, el guard del ejecutor rechaza el reintento iniciado por ese botón porque llega como `save` y el registro anterior no está abierto. El intento original con estado `won` y transporte perdido falla al verificar que el botón está habilitado; se conserva su log y captura.

## Corrección acotada

El botón permite recuperar una intención incierta existente aunque el registro previo no sea editable. El guard distingue iniciar una operación nueva de ejecutar otra vez el comando ya guardado en memoria. La reapertura conserva operación, UUID, versión esperada y cuerpo; nunca se convierte en `opportunity.update` ni se vuelve a construir el comando.

Sin intención pendiente, las oportunidades cerradas siguen sin admitir Guardar. Se mantienen los guardias de permisos, origen importado/integración, conflicto, estado cancelado y ejecución en curso. Un recibo confirmado seguido de lectura fallida continúa recuperándose solo mediante consulta. El backend, RLS, reglas de etapa y contratos permanecen intactos.

## Controles de esta unidad

Pruebas de navegador con HTTP controlado en 390/768/1440:

- Estados previos won/lost, pérdida de transporte y recibos inválidos (JSON, UUID y sobre): dos comandos idénticos, una sola transición simulada y revisión 1→2.
- Recibo válido seguido de consulta fallida: una sola escritura y recuperación por lectura.
- Denegación 403: ningún efecto simulado, cierre posible y Guardar todavía deshabilitado.
- Regresiones existentes de crear, editar y archivar, incluyendo recuperación de lectura tras confirmación.

El resultado exacto, SHA, capturas revisadas y hashes se fijan en checkpoint y handoff después de cerrar los controles propios. No se heredan resultados. Esta prueba no es una ejecución Auth/DB real ni una aceptación de todas las transiciones del pipeline. No promociona filas de la matriz.

Modelo vivo NOT_RUN, IA comercial writes OFF, cinco HIGH sin resolver, issue10 OPEN, revisión W4 y consumo principal pendientes, release NOT_ACCEPTED. Los fallos originales de PR153 y REQUEST6162715998/6162753210 permanecen independientes de esta corrección causal de producto.
