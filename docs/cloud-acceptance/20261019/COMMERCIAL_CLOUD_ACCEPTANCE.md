# COMMERCIAL_CLOUD_ACCEPTANCE

Fuente inicial PR156 `5332d9899eb1062a7db6b1800e9f0eda1151bac3`; observación posterior `2cbdc4b66315a52720c19c60e5d7ebe4e6adc996`; propuesta y deploy declarado W5/PR159 `bb16afe512be1cb04d6c86ecadb2064966a062aa`. Fecha de corte 2026-10-19T18:59:45.925355+00:00. CLAIM[6274698885](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6274698885). Las fuentes son candidatas, no composición aceptada. No herencia de PASS entre SHAs.

La fuente contiene342 filas (244paridad+98telecom), con9 revisiones parciales/333sin reconciliar/0release-ready en su cola. Es el estado de ESA fuente; no son34 revisiones de W2-X ni un recuento de funcionalidad ausente. La cola aún cita fuentes candidatas históricas. COMMERCIAL_CLOUD_ACCEPTANCE.json conserva cada ID/capacidad, fuente/registro, estados históricos separados, contrato por reconciliar, tipo de prueba, entorno, riesgo, responsable y próximo paso.

Las342 filas quedan NOT_VERIFIED para aceptación cloud de este corte: no hay evidencia hospedada individual suministrada para promoverlas. Esto no afirma342 ausencias ni revoca pruebas históricas. Los10 recorridos prioritarios siguientes tienen una puerta de ejecución separada; BLOCKED en una familia no modifica en masa la matriz histórica.

| Recorrido | Requisitos de referencia (mapeo parcial) | Estado cloud | Siguiente evidencia |
|---|---|---|---|
| Acceso/login/logout | PAR-003 | NOT_VERIFIED | Cohorte y ventana privada; Auth real/refresh/logout/reingreso |
| Dashboard | PAR-010..023 | NOT_VERIFIED | Lecturas y permisos en fuente desplegada exacta |
| Clientes y cartera | PAR-024..038 | NOT_VERIFIED | CRUD sintético autorizado, CAS/recibos/lecturas tras recarga |
| Customer360/contactos | PAR-039..044 | NOT_VERIFIED | Cliente/empresa correctos, contactos y permisos |
| Contratos/servicios/SIM | PAR-045..047 y telecom específicos | NOT_VERIFIED | Mapear cada contrato y tenant; SIM/eSIM sin promoción por RPC aislada |
| Agenda/actividad | PAR-051..052 y agenda específicos | NOT_VERIFIED | Tarea/actividad persistente con rol y cursor |
| Oportunidades/portabilidades | PAR-050 y telecom específicos | NOT_VERIFIED | Transiciones válidas e idempotencia según contrato |
| Facturación PRO | Filas específicas por reconciliar | NOT_VERIFIED | Borrador/importes/impuestos/recibo; no usar88/71/89 como cobertura total |
| Documentos/PDF | PAR-053 y documentos específicos | BLOCKED | P0 Storage + PDF/descarga/revocación bajo autorización |
| Asistente/RAG/automatización | Filas específicas por reconciliar | BLOCKED | IA writesOFF; proveedor real y calidad no medidos; sin llamadas de pago |

HOSTED_QA_PLAN.json prepara18casos con gates, evidencia y entorno; todos NOT_RUN_OWNER_WINDOW_REQUIRED. No hay usuarios creados ni escrituras hospedadas. Los rangos deID anteriores son orientación parcial, no cobertura exhaustiva de familia.

Taxonomía obligatoria: MOCK, CONTROLLED_HTTP, SUPABASE_LOCAL, SUPABASE_CLOUD y NEXT_CLOUD_E2E. El propio auditor offline tiene categoría separada; ejecutarlo enGitHub no convierte sus siete tests sintéticos en pruebas cloud del CRM. Visual, permisos, datos reales desechables y modelo vivo se registran por separado. Fuente8f83/71HTTP y349549/89HTTP son evidencias declaradas por el integrador para sus SHAs, no nuevosPASS sobre5332/2cbd.
