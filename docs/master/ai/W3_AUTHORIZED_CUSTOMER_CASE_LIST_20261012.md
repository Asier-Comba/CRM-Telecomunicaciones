# W3 — Incidencias registradas del cliente autorizado

crm.case.list utiliza CaseServiceV1 existente y cookie/empresa seleccionadas
por el servidor. Cliente obligatorio mediante referencia opaca o dependencia
única autorizada; default20/máximo20, filtros de tipo/prioridad/estado y pareja
de fechas civiles (rango≤366d). El puerto runtime admite únicamente case.list:
get, notas y cualquier comando se rechazan antes de resolve/RPC. Roles W1
owner/admin/member/viewer intactos. Local ON; stage/prod OFF; no writes IA.

Se valida todo el DTO W1, orden único/keyset/cursor/filtros/estados/fechas antes
de proyectar tipo, prioridad, estado, vencimiento, fechas y códigos registrados,
overdue calculado por W1 y origen. ID/cursor permanecen internos al ejecutor;
las tablas/respuestas no muestran IDs. Título, notas/conteo interno, relaciones,
comercial, versión y timestamps privados excluidos. No inferir SLA, ausencia
fuera del filtro ni resolución confirmada independientemente a partir del
código. Estado/prioridad/tipo visibles en español; códigos explícitamente
etiquetados como registrados. Fuentes/readAt/partiality conservadas.

Banco de rama:34 lecturas/215 casos/220 entradas únicas. Los214 casos previos
permanecen; nuevo positivo español con cliente seleccionado. Esta rama incluye
facturas/portabilidades/incidencias, todavía NO SIM. Historial propio esperado
33/19/14 (tres turnos adicionales=3user+2assistant). Composición futura con SIM
exige35 lecturas/216 casos/220 e historial38/22/16 observados, sin heredar PASS.

Prueba Auth/DB real desechable preparada, no ejecutada aún: crea una incidencia
W1 y nota interna fuera de los turnos IA; owner read+source/minimización,
viewer cookie+proyección interna, foreign ref sin query, revocación/403 y snapshot
de incidencia/notas intacto. Modelo/planner sintético. Fixture se cancela por W1
en finally solo si identidad/empresa/cliente/creador/título/version/notas siguen
siendo propios e intactos; no delete ni desactivar triggers append-only.

Cada limpieza se intenta aunque la otra falle; la factura B0BF mantiene su
transacción/guard/ausencia. Sidecar seguro en el artifact W3 existente conserva
el enum del fallo inicial y ambas limpiezas, sin IDs/SQL/cookies/errores crudos.
NO_OWNED_HANDLE no demuestra ausencia. Dos limpiezas fallidas nunca se ocultan
ni una limpieza nueva impide limpiar la factura anterior. Tres tests controlados
verifican estos fallos, además de ocho tests de lectura/privacidad/seam.

Local737 assistant/11focused/contexto global/tipos/lint/sintaxis; nuevos propios
1280 (543+737)/334/native85_320+dos audit13/probe conexión/Supabase107 requeridos.
Driver solo connectWorker; otros cinco métodos/full23/recurso/reinicio W5 y
seguridad independiente W4 pendientes. Modelo vivo NOT_RUN; Windows5/cincoHIGH/
fallos previos conservados. IA writes OFF; release NOT_ACCEPTED.
