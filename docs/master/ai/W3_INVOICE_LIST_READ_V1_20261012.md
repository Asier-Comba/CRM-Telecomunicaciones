# Lectura autorizada y minimizada de facturas por cliente

`crm.invoice.list` usa exclusivamente `BillingServiceV1.read('invoice.list', ...)`
con el puerto y cookie actuales. Solo titular y administrador; un plan de miembro
o lector se rechaza antes de resolver referencias o consultar facturas.

El cliente es obligatorio y procede de una referencia opaca autorizada o una
dependencia única válida. El modelo no puede elegir UUID, workspace, actor o rol.
Se permiten estado registrado, intervalo de emisión `[from,to)` y hasta20 filas.
La paginación conserva parcialidad; el planner no puede inventar ni reproducir
cursores, inferir totales del cliente o sumar monedas diferentes.

El DTO W1 completo se valida antes de minimizar. También se comprueba que todas
las filas correspondan al cliente y filtros solicitados. Solo se conservan ID
interno de evidencia, estado, emisión, vencimiento, moneda, total exacto en
unidades mínimas y el indicador de vencida devuelto por la consulta. La respuesta
visible elimina IDs y formatea el importe sin conversión a coma flotante.
No incluye número/serie, versiones, datos fiscales, impuestos desglosados, notas,
líneas, direcciones ni archivos. «Marcada como pagada» es un estado del CRM y no
acredita un movimiento bancario. No hay lectura de cobros ni comando registrado.

La autoridad actual se reconsulta antes/después de las esperas y al finalizar.
Una referencia extranjera no llega al servicio de facturas; la revocación tras
una lectura descarta los hechos y evita emitir final financiero.

## Controles propios

La batería específica cubre minimización/contrato completo, cliente y filtros,
límites/intervalos, plan sin identidad, roles, adapter ausente, cursor parcial,
monedas distintas, estado pagada y cambios de autoridad. Se conserva el banco
anterior de212 casos y se añade un positivo escrito para esta lectura:213 casos
y32 herramientas locales en la hoja; las200 preguntas originales permanecen.
El inventario220 conserva tamaño y unicidad, sin activar el resto. Stage/prod false.

El recorrido desechable existente incorpora un borrador sintético creado por W1
mediante cookie real en la preparación, fuera de los turnos del asistente. Luego
comprueba lectura no vacía, importe/moneda, ausencia de datos privados, referencia
extranjera sin query y revocación real tras lectura con403 y sin final. La huella
de negocio incluye las facturas para detectar efectos durante las consultas.
Ese recorrido solo puede ejecutarse en CI local desechable y no se declara PASS
hasta cerrar su SHA ejecutado propio. El planner de aceptación es sintético.

No cambia SQL, permisos, parsers W1, fuentes W4/W5, endpoint comercial ni UI IA.
Sin modelo vivo/API de pago, RAG operativo o presupuestos por tenant acreditados.
Escrituras IA OFF, W4 pendiente, auditoría HIGH FAIL y release NOT_ACCEPTED.
