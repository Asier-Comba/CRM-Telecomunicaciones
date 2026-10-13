# Lectura mensual autorizada de facturación

La capacidad `crm.billing.monthly_series` utiliza el servicio existente
`BillingAnalyticsServiceV1`, el usuario de la cookie actual y los parsers cerrados
W1 `billing.analytics.v1`. No incorpora una ruta SQL al planner, comandos de
facturación, permisos nuevos ni otro planner. El inventario de 220 candidatos se
conserva; hay 31 lecturas registradas. `billing.top_customers`, detalle de facturas
y movimientos de pago siguen sin registro en el asistente.

Solo titular y administrador reciben esta capacidad en el contexto semántico.
El ejecutor comprueba los roles de todos los nodos antes de leer o resolver
referencias; un plan financiero de miembro/lector se abstiene sin consultar
servicios, incluso si incluye otros nodos válidos. El servicio W1 y PostgreSQL
mantienen su autorización propia. Actor, espacio y época se revalidan alrededor
de cada espera y cualquier cambio descarta todas las evidencias del turno.

Se requiere una moneda EUR/USD/GBP y un rango inclusivo de meses, con día 01 y
máximo 24 meses. Una selección de cliente usa una referencia opaca ofrecida y
reautorizada en el servidor, nunca un UUID proporcionado por el modelo. Las
respuestas deben incluir todos los meses en orden, la misma moneda/rango y las
ecuaciones exactas de importes emitidos, marcados pagados, pendientes y vencidos.
Un error, mes ausente, campo fiscal adicional o ecuación incorrecta produce
indisponibilidad, sin convertirlo en cero.

La base es `issue_month_cohort_current_status`: facturas agrupadas por mes de
emisión con su estado actual en `as_of`. No reconstruye cobros del mes ni saldos
históricos. La tabla lo identifica como «Facturas por mes de emisión · estado
actual», distingue «Marcado como pagado» y muestra la moneda en las columnas.
El formateo usa las cadenas de unidades mínimas sin conversión a `Number`, para
preservar también importes superiores a su rango entero seguro.

## Evidencia y límites

- 626 pruebas assistant locales PASS, incluidas ocho de esta capacidad:
  permisos previos a toda consulta, filtros cerrados, referencias, revocación,
  importes grandes exactos, DTO corrupto, servicio ausente y catálogo por rol.
- Lint y comprobación estricta ES2017 PASS. Las primeras 200 preguntas del banco
  quedan intactas; se añaden doce sobre rangos/monedas/referencias/aclaraciones,
  con 212 identificadores y preguntas únicas y cobertura de 31 lecturas.
- La comprobación completa local de tipos agotó el límite de memoria de 512MiB
  en Windows. Se conserva el fallo, sin alterar la configuración o declarar un
  pase; la compilación completa requiere el control propio Linux de la candidata.
- Evaluación del proveedor: `NOT_RUN/provider_not_configured`, 212 escenarios;
  no evidencia de modelo vivo, coste, latencia comercial ni exactitud factual
  obtenida de llamadas a un proveedor.
- Se amplía el control propio de grounding con tres turnos previstos: serie
  densa de un cliente nuevo sin facturas, referencia extranjera sin consulta
  financiera, y revocación real después de leer que descarta todos los hechos.
  Usa Auth/cookie/PostgREST y el endpoint autorizado existentes, con planner
  sintético; requiere su propia ejecución Linux/Supabase. El caso positivo real
  de esta integración acredita ceros del cliente vacío; los importes no cero
  se prueban localmente y en los controles W1 de cohortes, con alcances distintos.

Las verificaciones propias de la nueva candidata permanecen pendientes hasta
cerrar sus artefactos. No se heredan los pases de otra revisión. RAG operativo,
embeddings, budgets por tenant, issue10 completo y revisión independiente W4
siguen pendientes. Escrituras IA OFF; release NOT_ACCEPTED.
