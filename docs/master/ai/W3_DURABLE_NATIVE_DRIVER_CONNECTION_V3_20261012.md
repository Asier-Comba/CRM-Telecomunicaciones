# W3 — Primer método del driver nativo v3

durable-native-driver-v3.mjs implementa connectWorker mediante el constructor
nativo existente. No crea, reinicia ni retira un cluster; no entrega el recurso
propuesto de W5 ni supone su ACK. El proceso fija una sola conexión, su backend,
application_name y callbacks query/close. Una segunda conexión, identidad
inválida o distinta al releer, cierre concurrente y respuesta tardía se deniegan.
Errores solo con enum cerrado, sin material privado de conexión.

La unidad añade una prueba al fixture de completion propio ya existente:
launchDurableWorkerV3 abre un Node independiente y obtiene su PID PostgreSQL;
el padre comprueba pg_stat_activity antes de START, el trabajador hace dos
lecturas fijas pg_backend_pid/current_database/application_name en la conexión
admitida, cierra y sale limpiamente; el padre verifica retirada de esa sesión
precisa. No imprime IDs/application/container/SQL. No duplica el recurso W5 ni
rehace reserva/completion/RLS/ACL/restauración. Solo acredita conexión y cierre
del probe, no ausencia/quiescencia de un efecto comercial.

Cuatro pruebas locales usan constructor/SQL controlados: NO son PostgreSQL.
La prueba física está pendiente del job nativo de la nueva fuente. El runner
completo debe rechazar el módulo parcial: metadata y setupScenario/execute/
inspectBoundary/inspectScenario/cleanupScenario aún ausentes. Full11/23, cuatro
carreras completas, seis cortes, fencing/ausencia, reinicio y W4 siguen abiertos.

Nueva fuente exige1266 (543+723)/334/native85_320 con dos ledger13 y el nuevo
marker de conexión físico/Supabase107 propios. Conserva autoridad documental
corregida, plazo total10s, PDF local real y lecturas33/casos214/inventario220 de
esta rama sin SIM. Composición futura requiere34/215 y ledger33/19/14. Windows5
y cincoHIGH conservados; modelo vivo NOT_RUN, IA writes OFF, release NOT_ACCEPTED.
