# Inventario SIM/eSIM minimizado y autorizado

Base: PR38 `d6e2ddba6535cc0b6d07fc99b8b48810140384eb`, propios1168/310/native85/320/Supabase107 cerrados con audit5HIGH FAIL. Esta nueva fuente necesita sus propios controles; no consume la candidata posterior A41 de PR142 mientras su preview falla y su Supabase no esté cerrado.

## Lectura registrada

Se registra exclusivamente `crm.sim.list`, con roles owner/admin/member/viewer admitidos por el servicio W1 `SimServiceV1`. Cookie y empresa vienen del port de servidor existente. Filtra cliente/operador/línea por referencias autorizadas o dependencia de resultado único; tipo, estado registrado, origen y límite son argumentos tipados. UUID elegidos por modelo y cursor no ofrecido se rechazan. No sim.get/history, PIN/PUK, ICCID/EID completos, QR, activación, sustitución o llamada de proveedor.

El ejecutor valida el DTO W1 completo, incluyendo orden/filtros/cursor/lifecycle/máscaras, y después proyecta siete campos: id interno, etiqueta, tipo, estado registrado, origen y máscaras ICCID/EID o null. IDs de cliente/operador/línea, timestamps y asociaciones privadas quedan fuera. La respuesta no muestra IDs; traduce los estados de SIM y añade “Estado registrado”. Estado activo no prueba conectividad o una activación actual del proveedor. Fecha as_of permanece null porque W1 no la publica; readAt es el momento real del ejecutor. Cursor indica parcialidad; error nunca se transforma en inventario vacío.

Autoridad fresca alrededor de cada espera y denegación de referencia extranjera se conservan. Sin adapter devuelve unavailable. Un cambio de usuario/empresa/rol/epoch tras leer descarta toda evidencia. Ningún dato recuperado se devuelve al modelo en un bucle de herramientas.

Registro220 conservado:32 lecturas locales y188 candidatos deshabilitados; stage/prod false. Un caso positivo de la nueva capacidad se añade al banco:213; los212 anteriores, incluidos rechazos de identificadores completos y QR, permanecen intactos. No modelo vivo ni calidad semántica acreditada.

## Defectos reproducidos y correcciones

La nueva regresión descubre que `sim-runtime-v1.ts` acepta updated_at anterior a created_at. Se añade la comprobación cronológica a la validación W1 de filas; igualdad y actualización posterior siguen válidas. Se conserva el fallo original y un control negativo sobre el runtime exacto de la base: mismo registro corrupto admitido por padre y rechazado por corrección. No se rebaja la prueba.

Preview propio A41:292/310 PASS,18 FAIL en selección de Agenda antes de hacer el click inicial; no se atribuye al constructor físico. El fixture generaba día UTC y la UI muestra la semana de Madrid. En domingo UTC/lunes Madrid produce filas fuera de la semana. El test ahora fija deliberadamente ese instante y usa `calendarDate`, la misma regla de presentación; conserva todos los modos, anchuras, recursos, respuestas tardías, negativas, cancelación y plazos. Regresión de fechas cubre frontera semanal y ambas temporadas DST. No cambia producto, no amplía timeout ni modifica aserciones para ocultar el fallo. Prueba local de navegador se registra por separado del preview completo Linux.

## Controles propios requeridos

Seis contratos SIM locales: roles/mínimo/máscaras; operaciones no registradas; corrupción de datos; parcial/verdadero vacío/denegación; referencia extranjera; revocación.632 pruebas assistant locales PASS,8 contratos SIM W1 y una regresión Madrid PASS, strict ES2017 y lint PASS. Fallos locales de descriptor de catálogo/orden y de invocación de tipos desde cwd incorrecto se conservan antes de corrección.

Grounding Auth/cookie/PostgREST propio crea una eSIM preparada mediante el servicio W1 autorizado durante setup, no desde IA. Snapshot posterior incluye esa SIM. Luego exige lectura no vacía minimizada, referencia extranjera sin consultar y suspensión real de membresía después de leer que impide emisión final. No se inserta una fila para fingir que el servicio la produce. Historial esperado13turns/23mensajes:13user/10assistant, dos finales extra y una cancelación; ninguna respuesta persistida incluye hechos privados. SQL/snapshot posterior exige que las consultas IA no alteren los registros de setup. Este conjunto está pendiente hasta CI propio; planner sigue sintético.

No migración ni resource W5; issue10 OPEN, IA writes OFF, RAG inerte/modelo vivo NOT_RUN/budgets pendientes, cola342/8PARTIAL/334NOT_RECONCILED/0RELEASE_READY, release NOT_ACCEPTED y W4 independiente pendiente. La corrección de prueba de Agenda requiere su propio preview completo y no elimina el FAIL histórico A41.
