# W2-X · Borrador de portabilidad: operador coherente con la línea ·15/10/2026

CLAIM6202367152, based56ae41202464c793d46a3ab9058126b08450732 propia con3 finales+33 complementarios, build66 y visual de campos. La regla existente de supabase/migrations/20261006110000_commercial_portability_workflow.sql exige destino=operador de línea en entrada, origen=operador de línea en salida. El borrador permitía cambiar los dos selectores y preparar una entrada que el servidor rechaza.

Seis causales originales: entrada/salida por390/768/1440, operador ligado a la línea esperado deshabilitado/observado habilitado. Registros originales válidos según dirección; las seis fallan antes de comando. Copia exacta de test y logs conservados, sin extrapolar Auth/SQL.

OperatorFields privado permite fijar un lado. El borrador fija destino en entrada y origen en salida y explica que lo determina la línea vinculada. Revisión exige además coincidencia con context.line.operator_id. El lado alternativo sigue seleccionándose; vacío e igualdad bloquean la revisión. Alta y helper compartido no se cambian ni aceptan por esta unidad; no cambia regla backend, permisos, CAS, contrato ni consultas.

Banco final39 previsto:seis flujos vigentes entrada/salida por ancho con nombres/capturas, campo fijado estable, vacío/igual negativos, alternativa8 y comando válido según dirección con expected_version1 y403 simulado que permite cancelar;33 regresiones de retirada de contexto/servicio/scope. Cifras reales y SHA en checkpoint. El403 no acredita guardado ni rechazo SQL real.

Build/lint/cola/scan y visual final se conservan por fuente. Global981 pertenece solo6b469 y terminó979PASS/2FAIL de arranque coincidentes con suspensión del equipo; recheck2 aparte, sin ocultar fallo ni cerrar RCA por un verde. No se hereda a esta fuente. AuthDB/Storage/modeloNOT_RUN/API0, HIGH5/W4/ACK principal pendientes, IA writesOFF/issue10OPEN/releaseNOT_ACCEPTED. Sin fuentes38/142/153/main/W3/W4/W5 ni recursos.
