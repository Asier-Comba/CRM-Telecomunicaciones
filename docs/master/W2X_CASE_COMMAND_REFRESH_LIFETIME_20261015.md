# W2-X · Incidencia: refresco después de navegar · 15/10/2026

CLAIM6180657019. Base propia71fe4471335742983aff453ce9863fdb3f8fdc2f. Rama codex/w2x-case-command-refresh-lifetime-20261015.

## Problema y corrección

Un comando case.update manual confirmado cuya respuesta llega después de navegar de incidencia A a B llamaba al onRefresh retirado: case.get de A pasaba de una lectura a dos. Se reproduce antes de modificar producto con el repositorio/parsers reales y respuestas HTTP controladas. No prueba fuga del servidor ni persistencia real.

ScopedCaseDetail conserva una referencia de montaje, retirada en cleanup. El refresco comprueba vigencia antes de case.get, después de esa respuesta y después de la identidad customer.list. Conserva la lectura activa normal, validaciones y denegaciones. No cancela ni revierte un comando ya enviado; no altera CAS/idempotencia/backend/contratos. CaseDetail ya remonta por id y el Provider real por ámbito.

## Evidencia propia

36 pruebas HTTP controlado PASS (55.8s):15 nuevas (respuesta de comando, respuesta de case.get, identidad de cliente después de navegación, guardado activo, lectura403) ×390/768/1440 y21 regresiones de carga inicial/notas/Customer360. Un comando simulado por prueba de guardado, sin duplicarlo al refrescar. Tres imágenes del caso activo inspeccionadas: título/formulario actualizados y sin desbordamiento visible; alcance visual parcial del detalle, no aceptación integral.

Primer ensayo falló antes de la reproducción: el fixture clasificaba escrituras por URL /commands, pero case.update usa /api/cases/v1. Se conserva log/observaciones, sin atribuirlo al producto. Se reparó solo la clasificación por operación. Reproducción corregida confirma1 lectura esperada/2 observadas. No relajación de aserciones ni permisos.

Lint completo y build66 PASS. Escaneo se registra en el checkpoint de publicación. Auth/DB/Storage real NOT_RUN, modelo vivo NOT_RUN, llamadas pagadas0. No se heredan620 de71FE a esteSHA. No cambios de matriz ni promoción de aceptación.

## Límites y coordinación

PR153 mantiene7F fallido; PR38/142 solo handoff, sin escrituras de ramas ni ACK inferido. W3/W4/W5 sin cambios, entrega CI aislada pendiente6166572940, sin solicitud duplicada. F736/CASE_NOTE_CURSOR B9/7F/3c7 y fallos de fixture se conservan; este resultado no acredita reparación de sus causas desconocidas. CincoHIGH visibles, escrituras IA OFF, issue10 OPEN, release NOT_ACCEPTED.

Siguiente investigación independiente: Customer360 después de una respuesta de guardado recibida tras navegar a otro cliente. Requiere CLAIM y reproducción antes de editar.
