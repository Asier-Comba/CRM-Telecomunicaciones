# Atención: limpiar filtros con el día actual de Madrid

CLAIM6213430782; base2c4512fe0e7e4d2d029d247b462d24044a23365c; rama propia codex/w2x-attention-current-day-20261016.

Original6 a1440:3FAIL/3PASS52.2s. Tras cambiar el reloj de la página a la siguiente fecha civil de Madrid, Limpiar filtros reutilizaba today capturado en montaje: rango desplazado un día. Se reproduce medianoche en verano16oct2026, cambio de año invierno1ene2027 y29feb2028. Actualizar atención con fechas manuales conserva el rango y pasa. Test/log/DTOs originales quedan preservados; el reloj del equipo nunca se cambia.

Solo la acción explícita Limpiar filtros llama de nuevo al madridDay existente y reutiliza offset para los límites de treinta días. No hay intervalos, autoactualización, helper o servicio nuevos. No modifica fechas manuales en Actualizar; conserva limpieza de tipo/responsable/cliente/cursor y las validaciones existentes.

Banco propio63:18 fechas(tres fronteras por limpiar/actualizar por390/768/1440),27 contexto de cliente y18 identidad. Son Date fijo únicamente dentro de la página de Playwright, temporizadores reales, HTTP controlado y DTO sintético con componentes/repositorio/parsers reales. No datos/cómputos del servidor real, Auth/DB/JWT/RLS, Next integrado ni modelo vivo. API pagada0.

Nueve capturas clear de las tres fronteras/anchuras realmente revisadas: rangos16sep–15nov2026,2dic2026–31ene2027 y30ene–30mar2028, con as_of sintético coherente y filtros legibles. Visual parcial: parte inferior móvil fuera del viewport y páginas vacías de fixture, no ausencia real ni aceptación del módulo completo. El checkpoint externo registra63 final y lint/build/scan propios, sin herencia.

Cola342/23PARTIAL/319sinreconciliar/0READY. Global1311de4221edc activo aparte. Global2741fb8 original1266FAIL1253PASS13FAIL y13complementariosPASS16.1s mismoSHA conservados;no1266singlePASS. F736/B9/981 original/primer210/script33 intactos. HIGH5/W4 pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED;fuentes W3/W4/W5/recurso y ramas ajenas intactas.
