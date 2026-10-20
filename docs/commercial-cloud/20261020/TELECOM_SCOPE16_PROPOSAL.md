# TELECOM16 — segunda ventana propuesta, sin autorización de ejecución

CLAIMOier6295919214; responde a solicitudAsier6295698972. **PROPOSAL_ONLY;
DISPATCH_NOT_AUTHORIZED.** No es un manifest del runner. CORE162 permanece intacto
con sus dos mutaciones. No se ha ejecutado esta segunda ventana en ningún entorno.

Fuente propuestaa9e977adf90b1e83cded23fb54aefc696839d014, deploy6ad78f6c810c781fba4f5880
reportadoW5. Refrescar y acordar fuente/deploy exactos antes de la ventana; una
composición sucesora requiere nueva identidad/elegibilidad, sin heredar PASS.

## Alcance concreto para aprobación

Reutilizar fixtures sintéticos preexistentes de A: cliente activo, operador activo,
tarifa móvil y versión publicada vigente en la fecha civil revisada del contrato.
Leer versión/condiciones/precio y verificar IDs antes de empezar. No crear catálogo
ni cliente dentro de este alcance; esa preparación requiere su propia autorización.

| Orden | Acción UI existente / endpoint | Input del contrato | Recibo y recuperación esperados |
|---|---|---|---|
|1|Cliente→Contratos→Registrar contrato manual; /api/portfolio/v1/commands, contract.create_manual|command_id, customer_id, operator_id, start_date, plan_version_id elegido; assigned_user_id sólo si se acuerda|Mismo command_id/id, version1/source manual/status draft; portfolio.get contract y C360 tras recarga con cliente/operador/versión/fecha exactos|
|2|Contrato manual→Añadir servicio o plazo; service.create_manual|command_id, contract_id del recibo1, service_kind mobile, display_name sintético|version1/manual/pending; portfolio.get service vincula cliente/operador/contrato1, activated_on null; recarga/colección del mismo ID|
|3|Servicio manual→Añadir línea; line.create_manual|command_id, service_id del recibo2, display_name sintético|version1/manual/pending; portfolio.get line vincula servicio2, activated_on null; cadena de relaciones hacia contrato1/clienteA tras recarga|

**Máximo propuesto: tres solicitudes de mutación, una por operación.** No activación,
transición, SIM/MSISDN/ICCID, emisión/pago, operador externo, permisos, SQL, altas de
usuarios ni cambios cloud. No retry automático ni nueva identidad ante incertidumbre:
parar, conservar journal/command_id/recibo/IDs y acordar recuperación antes de repetir.
Una lectura fallida tras recibo confirmado sólo permite recuperar datos, no otra alta.

La implementación actual PortfolioCreate omite plan_version_id al crear servicio;
la inserción canónica conserva ese campo como null cuando falta. No afirmar precio
heredado del servicio por la versión vendida del contrato. Esta ventana acredita
relaciones y condiciones del contrato; precio/versión efectivos del servicio quedan
observados por separado y NO_VERIFICADOS si no se consultan. SolicitudAsier: confirmar
si el objetivo comercial exige versión explícita en servicio y qué consumidor actual
lo permite; no ampliar contratos ni escribir SQL para simularlo.

## Precondiciones que W5/propietarios deben entregar privadamente

- Fuente/árbol/deploy/config y acceso independiente privado legítimo, sin sesión de
  propietarios ni cambio de protección/gasto por Oier. NetlifyFree actual bloquea
  esta independencia; resolución del propietario, no bypass.
- Ventana exclusiva y ACK exacto a estas tres operaciones/límite. A owner/admin
  admitido y B equivalente, de empresas distintas, fixtures propios positivos.
  Las cuentas B/suspendido/viewer de6295591477 están revocadas: no reutilizarlas.
- IDs privados de clienteA/operador/tarifa/versión, vigencia, moneda/importes y
  condiciones esperadas; fecha civil y zona horaria revisadas. Sin datos reales.
- Positivo de cadena propiaB antes de negativas de lectura a los nuevosIDsA;
  registrar código403/404 y ausencia de datos. Negativas de modificación NO incluidas
  en las tres solicitudes; requieren alcance separado. Cohorte/suspensión separados.
- Responsable/estrategia de limpieza, retención de recibos y qué hacer con efectos
  parciales. Sin borrado/cancelación/rollbackSQL automático ni mutaciones extra.

[Validación local del contrato](evidence/telecom16-contract-validation.json): ejemplos
sintéticos de los tres inputs/recibos aceptados por parsers existentes y autoridad
inyectada rechazada. No son pruebas de permiso, negocio, persistencia, voz, modelo,
Auth/DB o cloud. No se crea otro runner/recurso W5 ni se cambia tools/oier_cloud_qa.
IA comercial writesOFF; releaseNOT_ACCEPTED; cincoHIGH/Storage/revisión conservados.
