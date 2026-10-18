# W2-X93 — Títulos completos de citas en Agenda

CLAIM6255765905. Rama propia `codex/w2x-calendar-event-title-wrap-20261019`, padre `f20dfd511bb36e5064761d27b303cba3b3c89e2f`. Ningún resultado del padre se hereda.

## Defecto y cambio

En el componente Calendar real, un título sintético de160 caracteres sin espacios llevaba la tarjeta de Agenda móvil desde x41 hasta x1114,40625 dentro de una sección cuyo borde derecho era366. El documento seguía midiendo390: medir solamente el ancho de página no detectaba el recorte. El título ordinario terminaba en349. La medición causal precede a cualquier modificación del producto.

Solo cambian dos atributos de clase del botón de evento existente: mínimo de ancho0 y envoltura del título no compacto. Se conservan texto completo, identidad, callback de selección, colores, hora, filtros, orden y estados. La representación compacta conserva altura48, truncado y title nativo; no se convierte la cuadrícula semanal en tarjetas altas. La misma presentación no compacta se reutiliza en próximas citas y mes.

El fixture Calendar existente incorpora un modo optativo por fragmento URL para título largo/ordinario y selección interna del detalle. Su comportamiento por defecto permanece idéntico. No se crea otro servidor, recurso nativo, servicio ni primitiva.

## Evidencia y límites

Banco propio: seis casos, largo/ordinario a390/768/1440. Mide tarjeta y texto dentro de Agenda, además del evento correspondiente de próximas citas. Abre el detalle real, comprueba título/empresa y cierra con el botón nativo. Las regresiones propias incluyen Hoy, filtros, selección, intención incierta y el título de Cartera compartido. Resultado final, capturas realmente inspeccionadas y hashes se registran en `work/w2x-calendar-event-title-wrap-checkpoint.json` fuera del repositorio; no se adelanta PASS en este documento.

Fallos originales conservados por intento: dos navegaciones con query no servida por el fixture, dos selectores ambiguos entre Agenda y próximas citas, y un intento con un fallo de geometría del producto y otro por nombre incorrecto del botón de cierre en el test. Se corrigieron únicamente navegación, alcance y nombre del selector, sin borrar aserciones. El control ordinario corregido pasó una vez en el mismo producto padre,12s. Una lectura de fixture con codificación Windows alteró texto ajeno; se recuperaron los bytes UTF8 del padre y se reaplicaron exactamente las tres extensiones optativas antes del control final. Todos los snapshots/logs/resultados originales se conservan. Los errores de preparación no son la causa del desbordamiento.

Presentación React/Tailwind real con datos sintéticos y servidor HTTP controlado. Este banco no atraviesa repositorio ni parsers de calendario: no acredita DTO, permisos, Auth/DB/JWT/RLS/SQL, agenda integrada, revocación, privacidad o aceptación comercial completa. Las regresiones contextuales sí pueden utilizar repositorio y comandos simulados, sin escribir datos reales. Modelo vivo NOT_RUN, API de pago0; sin reinicio/ausencia/quiescencia/handler/full23. Revisión visual limitada a los cuadros identificados, sin aceptación general de roles, accesibilidad o táctil.

Las suites globales2007/source86,2043/source88 y2109/source92 conservan sus propios pines y no acreditan esta fuente93. F736, B9 y fallos anteriores no reciben causa ni corrección por este cambio. Matriz342/31PARTIAL/311sinreconciliar/0READY; cincoHIGH y revisión W4 pendientes, IA comercial writesOFF, issue10OPEN y releaseNOT_ACCEPTED. Sin cambios a ramas principales, W3/W4/W5, recurso nativo o producción.
