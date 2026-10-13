# Postmaster definitivo y diagnóstico cerrado

Petición W2/W3: issue67/comment6145956668, SOURCE444b572dee2391487467d580c1949d59f1a8edb2, run38400090197/job115305176216. FAIL13/14 en la primera consulta después de la creación. La causa original sigue UNKNOWN: no se conserva stderr y no se atribuye retrospectivamente a inicialización, red o registry.

Se identifica un defecto independiente reproducible: el factory admitía una consulta por socket durante la inicialización de la imagen oficial. El entrypoint inicia un servidor temporal socket-only, lo detiene y luego ejecuta PostgreSQL definitivo. Referencia primaria: https://github.com/docker-library/postgres/blob/master/docker-entrypoint.sh (docker_temp_server_start/stop y exec final).

La disponibilidad ahora exige consulta TCP a 127.0.0.1 dentro del mismo contenedor network-none. No abre puertos ni cambia la imagen, interfaz, DB vacía, propiedad, limpieza, límite total de 60s o plazo de consulta de 5s. Reinicio comprueba la misma identidad y un postmaster posterior como antes. El control de regresión simula éxito temporal por socket y dos negativas TCP antes del servidor definitivo; el código anterior falla ese control.

Las fallas de consulta conservan únicamente categorías SQL, transporte, timeout, límite de salida, cliente ausente, interrupción o causa no diferenciable. psql exit1 se mantiene CLIENT_OR_SQL_FAILED, sin inventar certeza. El timeout de disponibilidad incluye la última categoría cerrada. Referencia: https://www.postgresql.org/docs/16/app-psql.html (Exit Status).

Base congelada propia DD2/PR143; no incorpora SOURCE444 ni modifica ramas del consumidor. CI nativa propia y adopción W2/W3 todavía requeridas, sin trasladar PASS anteriores. Full23, revisión W4 y release no aprobados; IA de escritura OFF.
