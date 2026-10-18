# W2-X99 — Orientación por teclado al paginar Clientes

CLAIM6256232595. Rama propia `codex/w2x-customer-list-page-focus-20261019`, padre `9da84e03651de7aef03d7d0057252bac596f976c`. El padre solo añade evidencia; src/tests permanecen iguales a97. No se heredan sus resultados.

## Defecto reproducido

Con una primera página sintética válida de20 clientes y cursor al último, se activa Página siguiente mediante Enter y se retiene su respuesta. Al llegar la página de un registro o la respuesta403, el resultado aparece pero el foco queda en BODY. El control positivo enfoca deliberadamente Nuevo cliente durante la espera y conserva ese botón. El causal propio2FAIL1PASS en49,6s guarda lecturas, foco, capturas y errores; sin comandos ni errores de página. No se presenta como fallo de backend o autorización real.

## Cambio

IntegratedCustomers conserva una intención de orientación solo para siguiente/anterior. Al terminar la carga, si el foco sigue en el cuerpo, enfoca el estado de página o la alerta correspondiente. Elegir otro control impide robar su foco. Filtrar o actualizar retira la intención anterior; las respuestas tardías siguen gobernadas por la retirada ya existente de la petición.

Customers recibe una referencia de presentación opcional a su estado de página y lo hace enfocable mediante tabindex negativo. La alerta obtiene su referencia y la misma capacidad de enfoque. Se consume el patrón de foco existente en CustomerDomainPages, sin otra primitiva, servicio, consulta o cambio de permisos. Se mantiene el desplegable de filtros97 y se corrige la concordancia del estado: «1 empresa» frente a «20 empresas».

## Controles propios

Doce casos nuevos: éxito, denegación, foco elegido y filtro que sustituye a la página pendiente, en390/768/1440. Se retiran las filas mientras se espera, se comprueba el foco final y se vuelve de la página denegada a la primera mediante teclado. El filtro vigente no acepta filas de una respuesta antigua ni recibe foco de paginación. Se conservan los límites de20+1 y los DTO/cursor válidos, sin comandos.

La suite propia78/8 incluye27 casos directamente relacionados con el inventario y51 contextuales de Customer360/Servicios/foco/retirada. El banco nuevo conserva sus aserciones causales; se amplía la cobertura a las otras anchuras y a la sustitución por filtro. El resultado, imágenes realmente inspeccionadas y hashes constan en `work/w2x-customer-list-page-focus-checkpoint.json`; no se anticipa PASS aquí.

IntegratedCustomers, Customers, repository y parsers reales con HTTP sintético y contexto Router de prueba existente. No navegación Next integrada, AuthDB/JWT/RLS/roles o membresía vigentes, aislamiento multiempresa físico, teclado de todos los módulos, accesibilidad completa o táctil aceptados. Modelo vivoNOT_RUN y API0; sin ausencia/quiescencia/reinicio/handler/full23.

Matriz342/32PARTIAL/310sinreconciliar/0READY sin promociones. PAR046 mantiene evidencia94 y PAR086 sus fuentes individuales.2043/source88,2109/source92 y2139/source97 conservan sus pines/controladores y no acreditan99. F736/B9 y originales conservan su causa y alcance. CincoHIGH y W4 pendientes, IA comercial writesOFF, issue10OPEN, releaseNOT_ACCEPTED. Sin cambios a main, ramas principales/ajenas/congeladas, W3/W4/W5, recurso nativo o producción.
