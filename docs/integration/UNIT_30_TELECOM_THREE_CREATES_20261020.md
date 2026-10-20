# Unidad30 — contrato → servicio → línea, tres altas separadas

Decisión publicada ANTES de implementar/probar en issue67/6300214768.
CORE162 conserva exactamente customer.create + invoice.create_draft.
Esta ventana adicional usa cliente, operador, plan y versión publicados ya
preparados y autorizados. No publicar catálogo ni activar contrato/servicio/línea
en esta ventana. W5 conserva recursos/SQL/fixtures/despliegue; Oier su QA.

## Representación conforme al modelo existente

Contrato.plan_version_id fija las condiciones vendidas de una revisión inmutable.
Servicio.plan_version_id es opcional y NO se hereda en SQL: el consumidor anterior
lo omitía. Ahora el usuario puede asignar explícitamente esa misma versión del
contrato tras leer encabezado y términos publicados. No cambia DTO/RPC/SQL.
La línea referencia el servicio; su colección deriva versión/cliente/operador a
través del servicio. No posee otra tarifa ni precio propios.

La selección mínima admite tarifa publicada de un solo servicio base compatible,
no bundle, con vigencia que incluye el inicio del contrato. Se contrastan UUID,
plan, operador, número de versión, moneda y cuota entre encabezado/términos.
La cuota es recurring_amount_minor (cadena decimal de unidades menores), periodo
month, currency explícita; alta es one_time_amount_minor. No precios inventados,
conversión monetaria ni reparto/suma por contrato+servicio+línea. Importe es dato
comercial publicado, no factura/cargo ejecutado. Prestaciones y componentes sellados
permanecen en la versión referenciada. La opción empieza SIN seleccionar; sin ella
el servicio queda sin versión/precio asignados, explicado en la pantalla.

Identidades/ancestría/versiones vendidas son inmutables. Renombrar el plan o
publicar otra revisión no sustituye el UUID vendido ni sus términos. Versiones
existentes abiertas no se acortan: el modelo no implementa supersession. Una
comprobación posterior de cambios de catálogo necesitará otra ventana autorizada;
no añadir una cuarta escritura oculta a estas tres altas.

## Recorrido y exigencia de aceptación

| Paso | Acción humana | Datos/estado que deben recuperarse tras recargar |
|---|---|---|
|1|Cliente existente → Contratos → Registrar contrato manual; operador/fecha/plan/versión aprobados; consultar condiciones; revisar y confirmar|receipt.id = portfolio.get contrato.id; cliente/operador/version vendida exactos, status draft/source manual/version1; precio consultado por ese UUID |
|2|Servicios → Nuevo servicio manual → seleccionar ese contrato → familia compatible; marcar «Asignar al servicio la versión vendida del contrato»; guardar|servicio.id del recibo; contract/customer/operator exactos; plan_version_id elegido explícitamente; pending/manual/version1, sin activated_on/ended_on; cuota/alta/moneda de la misma revisión |
|3|Líneas → Nueva línea manual → seleccionar ese servicio → nombre → guardar|línea.id del recibo; service_id exacto; pending/manual/version1, sin activación ni identificadores ficticios; colección mantiene contrato/cliente/operador/versión del servicio |

Cada intención mantiene command_id/cuerpo congelados si la respuesta es incierta.
Un recibo confirmado permite reconsultar sin otra escritura. Después de cada alta,
recargar y comprobar lectura autorizada y colección acotada, no sólo un aviso UI.
Verificar una fila, un ledger y una auditoría por efecto. No reintentar comandos
originales de otra ventana ni generar otro ID para resolver una respuesta incierta.

Negativas reales pendientes de ventana: viewer no escribe; B admitido no accede a
ancestros A; suspendido/fuera de cohorte separados; contrato/servicio externo o
cerrado no autoriza descendientes; versión ajena/incompatible no se acepta. Errores
de lectura/permiso no se presentan como lista vacía ni como creación confirmada.
No llamadas al operador, portabilidad, provisión, SIM/MSISDN o cobros.

## Implementación y pruebas propias

Fuente dbc904ac4981b402bb6b9fbc3bc2c08b9b09a252, árbol199b644e212d14194a1d8b4b024b1b78de6682fb.
PortfolioCreate + ServiceSoldVersion añaden selección explícita y congelación de
la referencia. El lector no envía comandos, incluso mediante submit programático;
la autorización de API/SQL sigue siendo autoridad final. Reutiliza repositorio,
DTOs, fixture comercial y bancos de regresión existentes; sin backend alternativo.

ANTES tres FAIL por ausencia de la selección (390/768/1440). DESPUÉS fuente final:
18/18 Chromium PASS, sin retries/skips/flaky: tres selección/precio/replay exacto,
nueve límites y seis regresiones de referencia/selección.15 controles existentes
portfolio-v1/immutable-commercial-catalog PASS; lint global, tipos y build por
defectoTurbopack44páginas PASS. Capturas390/1440 revisadas. Evidencia local
qa-service30/service-version-after03 y qa-selection29/service-*.
after01 conserva17PASS/1FAIL del control sintético de rol detrás del modal; su
log prueba intercepción del clic por dialog. Corregida sólo la inyección de rol,
manteniendo las exigencias, y ejecutada después la suite final completa18PASS.

Son componentes/repository/validadores reales con HTTP sintético. No persistencia
Supabase, RLS físico, telecom alojado ni micrófono. La cadena completa alojada y
real-local de esta unidad sigue NOT_RUN hasta entorno/fixture aplicable.

W5 debe entregar manifiesto: source/tree/config/deploy; ventana exclusiva y
expiración; IDs sintéticos ya aprobados de cliente/operador/plan/version, fecha,
familia, precio/moneda/período/alta exactos; actores A/B admitidos/roles; límites
de tres creates, readbacks y limpieza. Credenciales por canal privado, nunca GitHub.
Solicitud agrupada6300012899/6300214768; no modificar accesos ni comprar servicios.

Sin hosted SQL, migraciones, Storage88, lockfile o permisos nuevos. IA writes y
contenido privado afectado OFF; emisión original UNKNOWN. CincoHIGH, historia,
revisión independiente, backups, acceso privado y voz real siguen abiertos.
Esta unidad prepara el recorrido, no declara DEMO_READY ni SaaS completo.

| Entrega | Fuente | Selección | Pruebas | Integrado |
|---|---|---|---|---|
| Asier30 | propuesta6300214768, sobre f315ee7a | dos componentes Portfolio; fixture comercial; service-sold-version.spec; selector de regresión | 18Chromium/15contratos/lint/tipos/build44 PASS locales | dbc904ac4981b402bb6b9fbc3bc2c08b9b09a252 |
