# Unidad13 — recuperación comercial integrada

Fuente propia d3e06db622da2fe20299533e45d9205d8b0a00f8, árbol4d73142c7f1ef9571c6cc40e0b5f105a027ab41b. Importación selectiva de diez consumidores y dos modos optativos de fixtures dePR1615d58a56dbbe00e5eaefa6228420322d268f7c5c7, más sus bancos. ACK6289164421. No se incorpora historia/ZIP masivos ni trabajo posterior no revisado.

Cartera, Agenda, Documentos, Inbox, Catálogo y creación de oportunidades conservan intención ante resultado no verificable. Cartera, Incidencias, Inbox, SIM y Portabilidad contrastan consulta con recibo confirmado antes de sustituir datos; a igual versión se comprueba el estado/origen y campos correspondientes. Tras recibo confirmado se repite lectura. SIM/Portabilidad identifican datos de la lectura anterior. Nuevo contrato manual abre su formulario. No se modifican primitivas, permisos, contratos o backend.

## Evidencia propia sobre d3e06db

- Causal1f49: atajo de contrato1FAIL/1PASS390; resolución de incidencia4FAIL/2PASS390 por lectura vieja/estado/origen/resolución incompatibles. Trazas y positivos conservados.
- Composición237PASS390/768/1440,9.3min; regresión102PASS,3.7min. Total339casos únicos en esta fuente,0fallos/saltos/reintentos/inestables.
-63pruebas de lógica en ocho bancos propios de dominio PASS. No se heredan las96 de Oier.
- Lintglobal, tipos ybuild44PASS. Las primitivas ui.tsx/ConfirmDialog conservan sus blobs de888; verificación Git explícita.
- Vistas capturas390 del contrato correcto/registrado y oportunidad con respuesta ilegible, campos retenidos y recuperación. No se acredita idempotencia AuthDB por contadores de transporte.

Bancos en tools/oier_commercial_qa y evidencia work/unit13-*.log, qa-unit13-{before,case-before,after,regression}/. Se conserva45s/expect4s,1worker,retries0 y el recurso existente. Los modos de catálogo/portabilidad son optativos y mantienen los modos previos.

Aceptación individual: los recorridos medidos incluyen creación manual de contrato/servicio, agenda, resolución de incidencia, metadatos, notas de Inbox, altas de catálogo, cancelación interna SIM/Portabilidad y creación de oportunidad. No se amplían a otros roles, estados, operaciones, precios de proveedor, efectos sobre línea o envíos externos. AuthDBhospedadoNOT_TESTED. Los resultados pertenecen a d3e06db; unidad15 cambia después la confirmación de archivo y tiene su banco separado. No sumar339+18 de fuentes distintas como357PASS sobre un único SHA.

Perfil nativo87, manifiestoW5, W4/P0Storage/EdgeAccess/cohorte siguen pendientes. IA writesOFF/modeloNOT_RUN/gasto0, main/cloud/resellpro sin cambios. Producto y342requisitos NOT_ACCEPTED.
