# W2 — Customer360 tras crear contratos y encuadre de inventarios

## Evidencia y ámbito

Base de desarrollo: #52 `20300df2b0fc7fad9bf719ec7b5db8332c501867`, árbol `d7c2df78b5bb99b38c5efdce3597596e15956453`. Su run real `37868283862`, job `113620152349`, ejecutó `08a32f678120e48202fbe8893221f27596274d0f` con árbol idéntico: 107/107, Auth 200, backend 3535+227, 73 migraciones, historial backend/API/browser, contexto y grounding, teardown PASS. Calidad `37868283828`/`113620152565`: lint/tipos 411+482/build PASS; full audit cinco HIGH FAIL (#29). Este verde no se transfiere a esta nueva unidad.

Se revisaron las seis capturas originales del artefacto `11589758572`. En contratos 768/1440, el resumen tenía 1 mientras la lista mostraba 2 después del alta confirmada. El código recargaba únicamente `CustomerDomainPages` dentro de `ContractsInventory`; el hermano `Customer360Overview` conservaba su lectura anterior. Las capturas de ubicaciones 768/1440 y algunos pies quedaban fuera del scroll interior; `scrollIntoViewIfNeeded` no alineaba un título ya parcialmente visible. Estos defectos impiden aceptar completamente la evidencia visual de #52.

Propietario: W2. No se modifican API/RPC, migraciones, roles, RLS, kernel IA ni infraestructura W4/W5. Fuentes maestras 00–19 no disponibles: se usan contratos actuales y el flujo `useReviewedCommand` vigente; no se deducen decisiones empresariales nuevas.

## Comportamiento y consumidores

`ContractsInventory` expone un callback opcional `onCreated`. Solo lo invoca después del recibo normal y de una lectura `portfolio.get` válida que confirma el mismo cliente. `CustomerIntegratedPanels` lo transmite a `IntegratedCustomerDetail`, que cambia exclusivamente la clave del resumen. El resumen elimina su instantánea anterior y consulta otra vez `customer360.summary` y `telecom.attention` con la autoridad actual. La pestaña, la notificación de alta y el inventario conservan su estado. El inventario global sigue funcionando sin callback.

No se incrementan contadores en memoria ni se sustituye el servicio de lectura. Una respuesta perdida mantiene el mismo UUID/cuerpo; una escritura confirmada cuya lectura falla mantiene el aviso de recuperación y repite solo esa lectura. El callback llega al completar la recuperación, conservando el rechazo seguro si falla o cambia el acceso.

## Regresión real y evidencia pendiente

Se conservan los 107 recorridos y todos los controles de SQL/CAS/exact retry/roles/privacidad. En los tres recorridos existentes de contratos, se registra antes de la acción un observador de la respuesta real de resumen: primera alta=1, reintento exacto=2 y recuperación de lectura=3. Se exigen HTTP 200, identidad del cliente, recuento del cuerpo igual al SQL independiente, KPI renderizado y número de filas visible. Durante la lectura fallida se exige que no se dispare prematuramente el callback; se conserva una única escritura y versión 1. No se añade presupuesto, retry, skip ni un recuento de test ficticio.

Las seis capturas de detalles se mantienen, alineando explícitamente el panel al inicio del scroll. Se exige intersección completa del panel, la última fila relevante y el pie; se conserva el enmascarado de dirección y la ausencia de desbordamiento horizontal. Las capturas originales permanecen. Las imágenes se capturan del navegador real, sin editar píxeles.

Antes de publicar: sintaxis de ambos scripts, lint de los cinco archivos y tipos locales. Suite completa, build remoto, nueva inspección de seis capturas y consumo en #38: PENDIENTES en este commit. La ejecución pesada local no se inicia: 2,58 GiB libres de aproximadamente 15,7 GiB; Docker sigue detenido. La CI desechable no acredita instalación persistente local.

PUBLIC sigue siendo riesgo crítico; recomendación PRIVATE sin cambiar visibilidad. #29, #10 y aprobación W4 independiente siguen abiertos; escrituras IA deshabilitadas, modelo/planner real no aceptado. VPS, producción y proveedores intactos. Próximas tres: recoger terminal exacto; revisar seis imágenes y corregir solo defectos demostrados; integrar las ramas aceptadas en #38 con ledger vigente y nuevo gate completo.
