# DEMO-CATALOG-10 — publicación de precios de tarifa

Propuesta exclusiva Oier, CLAIM6291773384, sobre3b80. Asier publicó c0e906fe durante la unidad; catálogo, contrato catalog.v1 y validador no cambian entre esos dos objetos Git, verificado antes de editar. No se importa otra integración ni se heredan sus pruebas. Fuente funcional final7c0a17b055828ff23a623b318f09fd1f229fe766.

## Carencia y comportamiento nuevo

El catálogo existente permite crear operador/tarifa y consultar versiones, pero no publicar plan_version.create desde la UI. El banco propio sobrecb4f reproduce la ausencia del botón en390/768/1440,3FAIL. Confirma el informeW56291579424 sin volver a crear operadores/tarifas cloud.

La tarjeta de tarifa activa ofrece Publicar nueva versión a owner/admin. Un drawer del catálogo existente consulta plan.get fresco antes de habilitar edición: conserva ID y versión CAS autorizados del servidor, sin seleccionar tenant/actor mediante formulario. La propuesta cubre un servicio simple con un componente base del tipo de la tarifa; sin inventar bundle, prestaciones o precios. Editor completo de paquetes y entitlements permanece en backlog, no se declara implementado.

El usuario introduce vigencia, cuota mensual y alta explícitas, incluso cuando el alta sea cero; selecciona EUR/USD/GBP y revisa el resumen antes de confirmar publicación inmutable. Importes convertidos con aritmética decimal entera, sin Number/redondeos silenciosos, hasta el límite del contrato. El backend conserva permisos, procedencia manual, no-solapamiento, CAS y asignación de versión; una tarjeta activa no autoaprueba elegibilidad backend de una tarifa histórica.

El consumidor usa únicamente collection/telecom y DTOs actuales. No backend, SQL/migraciones, roles, políticas, Storage, IA o llamadas externas. No emisión de factura/cobro. El texto explica que una vigencia abierta no se puede acortar y que no se sobrescriben versiones vendidas.

## Efecto y recuperación

- Primer dispatch congela command_id e input revisado. Incertidumbre por transporte/JSON/receipt invalidados mantiene la misma identidad e input, bloquea campos/cierre/Escape y ofrece Comprobar la misma publicación. In-flight ref evita doble envío concurrente.
- Error de lectura previa no se convierte en supuesto comando enviado. Reintentar esa lectura no crea efectos.
- Denegación conocida cierra sin reintento automático; conflictoCAS exige lectura nueva y revisión explícita antes de otro comando. No se altera el control backend para hacerlo pasar.
- Receipt validado queda registrado antes del readback. Se consultan plan_version.get y terms_get, verificando ID, plan, número de versión, fechas/divisa/importes/componente y ausencia explícita de prestaciones. Readback incoherente conserva el recibo y permite sólo recuperar versión registrada, sin volver a publicar.
- Caller se remonta por plan/actor/workspace/rol y no publica callbacks de componentes desmontados. Esto no demuestra aislamiento real AuthDB ni recuperación completa tras cerrar navegador.

## Originales y controles por fuente

| Intento | Fuente | Resultado propio |
|---|---|---|
|01|cb4f02e9|3FAIL: botón ausente en producto anterior|
|02|fe3cb212|3FAIL: ayuda dentro del label de Vigencia hasta impide asociación exacta; TypeScript además falla por dos literalesBigInt con target anterior aES2020|
|03|bfd54f92|3PASS publicación;3FAIL reproducción causal de bloqueo de lectura previa sin dispatch|
|04|f4339972|33PASS nuevos controles,lint/types0,build44PASS; regresión separada de tarifas15PASS|
|05 final|7c0a17b055828ff23a623b318f09fd1f229fe766|48PASS (33nuevos+15regresión) en390/768/1440, cero skips/flaky/retries; lint0 y build con TypeScript/44páginasPASS|

No se cambian expectativas, timeouts, permisos, límites o contratos. Se separa ayuda mediante aria-describedby; BigInt usa constructores compatibles sin cambiar tsconfig. Estado dispatched explícito corrige la clasificación de lectura. La última fuente separa visualmente acciones de tarjeta y captura revisión antes de confirmar; tiene su ejecución nueva, no hereda el verdef433. No sumar intentos ni estos48aotras fuentes/baterías. Originales por intento/hashes están en DEMO_CATALOG10.json; no sustituir fallos por el resultado final.

48controlados verifican éxito/readback, lectura previa fallida, transporte incierto, JSON/receipt inválidos,403,409CAS, readback errado sin republicación, CAS fresco distinto de tarjeta, precisión/negativos/overflow y botón ausente para viewer; además15regresiones originales de alta de tarifa. Fixture/repository/componentes reales, HTTP y rol provistos por el banco; NO AuthDB, persistencia real, RLS, Netlify o modelo. No ejecución de imagen nativa ni reintentos de cuota.

## Visual y aceptación pendiente

Seis PNG de intento05 copiados byte-idénticos y revisados (manifest catalog10/IMAGE_MANIFEST.json): revisión previa de precios y condiciones recuperadas en390/768/1440. Formulario una columna en móvil y dos en tablet/escritorio; cifras, fechas, advertencia y confirmación visibles sin corte material. Las capturas están en estado revisado/cargado, no se acepta una foto en Consultando. Fondo local mantiene los rótulos históricos de3b80; su corrección está separada en PR167, no se reintroduce aquí. Sin Auth/HAR ni datos reales.

Asier revisa/adopta delta exclusivo de dos componentes; no fusionar otro producto completo. W5 despliega sólo una nueva fuente acordada, devuelve deploy/config y habilita ventana independiente autorizada. Próxima prueba: publicar una versión sintética en esa ventana, recuperar mismos IDs y demostrar selección de versión vendida en contrato; no se ha hecho desde este work. Bundles/entitlements avanzados y aceptación de contratos quedan pendientes individuales. CincoHIGH,Storage/revisión independiente/releaseNOT_ACCEPTED; IA writesOFF.
