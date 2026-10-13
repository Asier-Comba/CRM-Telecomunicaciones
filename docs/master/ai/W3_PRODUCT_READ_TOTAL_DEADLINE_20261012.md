# W3 — Presupuesto total de espera de un plan de lectura

Nueva política de disponibilidad:20s para el plan completo, además del límite
existente10s por espera. Autoridad inicial/fresca, resolución y hasta ocho
lecturas comparten un deadline monotónico/controlador. No reinicia al cambiar de
nodo; agotamiento o cancelación devuelve unavailable/evidence[] y no registra
resultado válido. Timer/listener limpiados en finally; callbacks de autoridad
permanecen fijados, autorización se consulta de nuevo antes/después de cada
espera. Datos parciales se descartan incluso tras una lectura exitosa si su
comprobación final llega tarde.

Dos negativos sintéticos sobre16B demuestran que esperas individuales menores
de10s acumulaban24s/30s y devolvían hechos más allá de la nueva política. No se
declara incidente ni fallo de los controles originales: el límite total es una
política añadida. El primer intento del segundo fixture no drenaba la última
autorización mock y se conserva; se corrigió para concluir normalmente. Caso
positivo de tres nodos en12s conserva sus tres evidencias. Timers/adaptadores
controlados NO son latencia de RPC/DB ni rendimiento de un modelo vivo.

La espera acotada no garantiza cancelar una consulta cuyo adapter no atienda
AbortSignal; no cambia API/servicios W1 ni se acredita cierre físico de esa
consulta. JavaScript bloqueado no se interrumpe, pero valores tardíos se
rechazan al volver. Ninguna escritura comercial, llamada de modelo ni cuota
facturable. Plazo documental10s independiente y admisión RAG corregida intactos.

Fuente nueva requiere1269 (543+726)/334/native85_320 con dos audit13 y probe de
conexión del driver/Supabase107 propios. El driver mantiene solo connectWorker,
no full23/W5/reinicio.33 lecturas/214 casos/220 entradas; composición SIM futura
34/215 y ledger33/19/14. Windows5/cincoHIGH/fallos anteriores conservados; IA
writes OFF, modelo vivo NOT_RUN, release NOT_ACCEPTED y aceptación W4 pendiente.
