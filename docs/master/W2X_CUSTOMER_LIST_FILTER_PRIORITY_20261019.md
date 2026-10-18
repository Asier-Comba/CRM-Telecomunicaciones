# W2-X97 — Dar prioridad a los clientes en el inventario móvil

CLAIM6256082724. Rama propia `codex/w2x-customer-list-filter-priority-20261019`, padre `3a0c602ec3ebd3bbce34e4b05f65f92de1193864`. Los resultados del padre no se heredan.

## Problema medido

Después de alinear el título Clientes con el borde superior del contenedor, a390 el nombre largo ocupa y927–1119 dentro del área visible y64–960. El encabezado del escenario de prueba queda excluido de esa medida. La primera tarjeta ordinaria ocupa y883–1055: solo77 de172 píxeles resultan visibles, menos de la mitad. El propio nombre ordinario sí se alcanza a ver, y no se presenta como un nombre recortado.

El primer banco produjo2FAIL4PASS en53s: nombre largo móvil recortado, control desplegable todavía ausente en el ordinario, y cuatro controles de escritorio correctos. Antes de modificar el producto se añadió una medición explícita de la tarjeta ordinaria:1FAIL por visibilidad inferior al50%. Se conserva la distinción entre ese resultado físico y la ausencia esperada del nuevo botón; no se convierte el primer intento en dos fallos idénticos.

## Cambio

El inventario integrado ofrece un botón nativo «Filtros de clientes» en móvil. Los filtros comienzan plegados; la tabla o tarjeta queda como contenido principal. Todos los controles siguen disponibles al desplegarlos y el botón indica cuando existen filtros aplicados. En768/1440 los controles mantienen su presentación abierta.

La expansión pertenece a IntegratedCustomers, de forma que los cambios de filtro, cursor o actualización pueden remontar Customers sin perderla. Se mantienen los valores seleccionados, el estado de los filtros, sus consultas, el comportamiento de selección y la tabla. El id de controles y aria-expanded se conectan con el botón. No se introducen una primitiva, otra pantalla, API o servicio. Los consumidores previos que no proporcionan estos controles conservan el comportamiento abierto.

El banco de nombres96 recibe únicamente la apertura del panel antes de elegir el filtro móvil. Sus aserciones y datos se conservan y la reversión de esa inserción se verifica contra el padre. El banco nuevo añade la visibilidad de al menos media tarjeta y del nombre, el despliegue, los valores, la expansión persistente tras filtrar, la indicación de filtros aplicados y el foco al cerrar. La suite propia tiene66 casos en7 archivos:15 relacionados directamente con el inventario y51 contextuales. No se anticipa su resultado en este documento.

## Alcance de aceptación

IntegratedCustomers, Customers, repository y parsers reales con HTTP sintético y el contexto Router de prueba existente. No aceptación de navegación Next integrada, AuthDB/JWT/RLS/roles o pertenencia vigentes, aislamiento físico multiempresa, accesibilidad completa o táctil. Primarios sin comandos; las regresiones conservan solo su alcance. Modelo vivo NOT_RUN y API0, sin ausencia/quiescencia/reinicio/handler/full23.

Capturas actuales realmente vistas, hashes, resultados y fallos originales quedan identificados en `work/w2x-customer-list-filter-priority-checkpoint.json`. Las imágenes de96 que no mostraban la tarjeta móvil siguen sin acreditar esa aceptación visual; las imágenes nuevas solo acreditan su propia fuente.

PAR046 conserva su evidencia94 y la matriz342/32PARTIAL/310sinreconciliar/0READY permanece igual.2043/source88 y2109/source92 mantienen pines y controladores sin acreditar97. F736/B9 y demás originales conservan su causa y alcance, sin atribuirlos a este cambio. CincoHIGH y W4 pendientes, IA comercial writesOFF, issue10OPEN, releaseNOT_ACCEPTED. Sin cambios a main, ramas ajenas/principales/congeladas, W3/W4/W5, recurso nativo o producción.
