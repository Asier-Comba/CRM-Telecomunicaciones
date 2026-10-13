# Driver v3: lectura de operación en la conexión admitida

La implementación parcial añade `inspectWorkerOperationV3`, sin exportar aún
`metadata`, `setupScenario`, `execute`, `inspectBoundary`, `inspectScenario` ni
`cleanupScenario`. El runner completo sigue rechazando este driver parcial.

Reutiliza `createNativeDurableOperationInspectorV3`: binding exacto capturado
antes del primer await, consulta fija readonly y validación de la fila completa.
Verifica backend/database/application de la misma conexión admitida antes y
después. Un cierre o cambio de identidad descarta el resultado; errores y
descriptores hostiles no publican SQL, credenciales ni datos privados.

Cuatro controles nuevos cubren captura inmutable, actor/backend sustituidos,
cierre durante la consulta y accessor rechazado antes de SQL. Junto con los
controles previos de conexión/operación suman once pruebas focalizadas. Son
adaptadores controlados; no equivalen a PostgreSQL físico.

Las dos fixtures nativas existentes de completion/reconciliation incorporan
lectura por el driver y comprobación independiente de desaparición de su propio
backend después del cierre. No se crea cluster/recurso/ledger ni se modifica
ninguna primitiva. La ejecución física del nuevo SHA permanece NOT_RUN hasta
su job nativo propio. La desaparición del backend no acredita ausencia de
efecto comercial, quiescencia, reinicio, autorización única ni full23.

La observación sigue limitada a operationCount/state: audit13 + operation2 +
effect1 = 16/21 campos parciales, sin cinco contadores restantes inventados.
W5 conserva el recurso nativo y restart/close; W4 mantiene revisión independiente.
IA writes OFF; release NOT_ACCEPTED; modelo vivo NOT_RUN; cinco HIGH pendientes.

Banco/registro/lecturas/catalogue/grounding/UI son exactos respecto a 3DD.
Previstos nuevos propios: 1332 (554 + 778), navegador352, native85/320 y dos
observaciones de driver/operación, Supabase107, historia45/26/19 y cleanupV3
cuatroPASS. No heredar PASS de 3DD ni de 99A.
