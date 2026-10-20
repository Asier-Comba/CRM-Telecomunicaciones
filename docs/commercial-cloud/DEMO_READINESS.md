# DEMO_READINESS — CRM Telecom

Estado vigente 20/10/2026. Orden456b1519; [coordinación W0/6299379216](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6299379216). **DEMO_NOT_READY; RELEASE_NOT_ACCEPTED.** Este es el único estado comercial vivo; el [corte anterior34948905](https://github.com/Asier-Comba/CRM-Telecomunicaciones/blob/34948905cb04d359b7d237516dc98d129da19572/docs/commercial-cloud/DEMO_READINESS.md) conserva el historial detallado. Publicado, integrado, desplegado y aceptado son estados distintos.

## Corte de fuentes y decisión inmediata

- Candidata Asier: **PR175 / b9e1eefeea3342b40bdd9584747e9e7ff47bf1cd**, árbol6012a6c409733f60282d0ca997d414dd31a11394. Refresco propio GitHub: ocho runs terminales, perfil87 SUCCESS y siete FAILURE; sin sucesora ni selección21/22 publicada. No se canceló ni relanzó ningún check.
- Último deploy **reportado por W5**, no nueva inspección del proveedor: **6ad78f6c810c781fba4f5880**, fuente **a9e977adf90b1e83cded23fb54aefc696839d014**, árbolac48598bffd8a528919f63f2bcad1d07365c775d; adapter efectivo NOT_RECORDED. **No es175**. Handoff6295242000; A/B6295591477.
- Supabase exclusivo: crm-telecom-staging / zgwotxnyqzfuzcnmgvtn, 87 migraciones y ACTIVE_HEALTHY según W0. Última comprobación del conector Oier: projects=[]; sólo visibilidad del conector, no salud del backend. Sin SQL, permisos, reset/reapply ni uso de resellpro.
- Oier: código publicado825e5575ec8bf7a331b2ec953c25ed32520d986f en **codex/oier-review175-20261020**; estado documental en **codex/oier-demo-status-20261020**. Ninguna rama/workspace Asier modificada. Entrega consolidada [6299659409](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6299659409).

## Entrega única al integrador: CONCEPT21 + PAGING22

**Base revisada de ambos: b9e1eefeea3342b40bdd9584747e9e7ff47bf1cd.** Seleccionar cada par de commits de forma independiente; no importar toda la rama QA, los componentes172/173 ya adoptados ni el caller20 por dependencia. Los padres históricos incluyen evidencia propia; eso no exige adoptarla. No hace falta otra PR masiva.

| Unidad / deltas exactos | Defecto causal y cambio mínimo | Controles propios ya cerrados y fuente |
|---|---|---|
| CONCEPT21: tests **7aa8e869fc652f14eee95722c4b804eb97d5b918**, fix **146a5433f28fd22eda0fb96373ffef3b5f2bf5c7** | «conectividad 600 Mbps» quedaba en «conectividad». Sólo el límite numérico sin preposición exige importe seguido por moneda reconocida; preserva cifras del concepto. Tests20 líneas añadidas; fix2+/1− en parser. | Antes:3 FAIL UI390/768/1440 y5 FAIL parser. Después, fuente146a:39/39 UI,16/16 conceptos y24 comprobaciones parser/10 escenarios PASS; lint global, TypeScript y build Next por defecto (44 páginas) propios PASS. Capturas revisadas en tres anchuras. |
| PAGING22: tests **6ca6f42cb58470d12699c4adf32e1b636cf7106f**, fix **d5922d843cac660f6bc954875a289267c5299f2b** | Enter en paginación de Servicios acababa con foco en BODY al cargar o recibir403. Foco en indicador/error y reintento; no lo roba si el usuario eligió otro control. Tests44 líneas añadidas; fix6líneas de componente y7de protección de foco en tests. | Antes:6 FAIL causales, BODY medido. Después, fuented592:9/9 PASS (6causales+3cursor/cliente/filtro/respuesta tardía), sin retries/skips/flaky; lint global, TypeScript y build Next por defecto (44 páginas) propios PASS. Capturas cargadas390/768/1440 revisadas. |

**Cinco archivos exactos.** Blobs Git verificados contra las fuentes de cada fix y contra825e; permiten verificar una selección futura sin exigir igualdad de commits. Si Asier adapta código, revisar el delta semántico y su justificación; igualdad textual parcial no basta.

| Archivo | Unidad | Blob base b9e | Blob esperado |
|---|---|---|---|
| `src/features/billing/parse.ts` | CONCEPT21 | `4dc0eb10f7801ca7d50e9cd0ec948eb462f95d21` | `649d9f49ee4c43f1d43e4c7b7af72cb6b1990474` |
| `tools/oier_billing_qa/prompt-interaction.spec.ts` | CONCEPT21 | `c87f66aed3a08d55f44f84651f648b7e5c881804` | `4b01920872329c2e88034b5df3684f6ae18fec56` |
| `tools/oier_billing_qa/concept-acceptance.mjs` | CONCEPT21 | `d503c3764bda4f97fda1d9961f7423961bba8882` | `97bb9be12d6fe2e8653ee7de0c663d64f8ccebac` |
| `src/features/customers/CustomerDomainPages.tsx` | PAGING22 | `ee933541614c40a02c15d73d9031fe998b47c2b8` | `c74443ba1f810a99f7535576ad2c3c74f76638da` |
| `tests/e2e-preview/customer-domain-scope.spec.ts` | PAGING22 | `e0604dec884fd30c88536c096c36902611123b4b` | `7aefc6e5f6fe100cab9e8a791cf50447c6eca1fa` |

Compatibilidad observada: los dos pares pasaron previamente apply--cached--check contra b9e en índices temporales propios. **Eso sólo demuestra aplicación textual limpia; no ACK, integración, elegibilidad ni corrección semántica de una nueva composición.** No se repitió ese control ni los bancos verdes en23. Fuera de esos deltas no se cambian SQL/DTO/permisos/precios/IVA/fechas/proveedor; lectura y efecto de CustomerDomainPages byte-idénticos.

Límites: HTTP controlado/SpeechStub, no Auth/DB real, cloud, persistencia comercial, micrófono o modelo vivo. CONCEPT21 deja intacto el límite existente «de/por + cifra»; no es comprensión general de lenguaje ni de todas las cantidades. Las capturas21 sólo acreditan el concepto visible, no todo el drawer. PAGING22 acredita DOM/foco de Servicios, no lector de pantalla físico ni todo Customer360. Ambos conservan sus FAIL originales, sin herencia de verdes a otro SHA.

Evidencia inmutable: [CONCEPT21](https://github.com/Asier-Comba/CRM-Telecomunicaciones/blob/d720d08905e3600a96b4f02a7d4d9671d4326a12/docs/commercial-cloud/20261020/BILLING_CONCEPT21.md) y [PAGING22](https://github.com/Asier-Comba/CRM-Telecomunicaciones/blob/825e5575ec8bf7a331b2ec953c25ed32520d986f/docs/commercial-cloud/20261020/CUSTOMER_PAGING22.md), con safe JSON, hashes y capturas. **Decisión Asier pendiente: aceptar cada par o rechazar con motivo y publicar nueva fuente.** Después Oier verificará blobs/deltas y ejecutará los bancos correspondientes sobre esa composición exacta, con sus controles propios pertinentes. No repetir39/84/4042 en la base sin cambio.

## Emisión: observación mínima y prueba causal conjunta pendiente

Original conservado: [run39458747653](https://github.com/Asier-Comba/CRM-Telecomunicaciones/actions/runs/39458747653), job118752349311, safe12282737717, capturas12282682770; checkout5f1eb783d737479abafc78d48e61dd05b72156ad, árbol6012a6c4 idéntico a b9e. 87migraciones/3815+227backend/114UI únicos+1TIMEOUT, server0/teardownPASS. Caso billing_invalid_receipt_seven_commands_same_intent_single_persisted_effect; fase invoice.issue:first_effect,11037ms. [Original y límites de correlación](https://github.com/Asier-Comba/CRM-Telecomunicaciones/blob/97a849c500307273b7b776b79248c4e234b80fdd/docs/commercial-cloud/20261020/REVIEW175.md); REQUEST6296545586.

La captura final muestra modal pendiente, alerta esperada y Cancelar deshabilitado. No acredita cuándo llegó la alerta, qué aserción expiró, el recibo válido o el estado DB. **Causa y efecto originales UNKNOWN.** El positivo de otra fuente no lo repara.

[Caller20](https://github.com/Asier-Comba/CRM-Telecomunicaciones/blob/5a9b6603d2ba77cb53a6c22060d5386ed4b4c924/docs/commercial-cloud/20261020/BILLING_PHASE20.md), commit **3e7f43c043c7f95bd552a7155ffcd14835fb3f4e**, sólo añade seis fases fijas a scripts/security/supabase-local/product-billing-uncertain-browser.mjs. Sin nuevos asserts, lecturas, tiempos, SQL, recurso o producto. Guard byte-normalizado/sintaxis/lint PASS en su fuente; **nuevo caller físico NOT_RUN**. Es una decisión separada, no requisito21/22 ni arreglo causal.

Protocolo preparado, **no ejecutado ni ventana acordada**:

1. Asier designa fuente/composición y selección del caller; W5 confirma recurso desechable existente, propietario, caso NUEVO sintético, ventana exclusiva, fixture, límites, recuperación/limpieza y evidencias seguras. No duplicar telecom.native-resource.v1. No usar la factura incierta original ni staging para investigar este fallo.
2. Navegador: distinguir clic, alerta, guard, bloqueo de cierre, clic de cierre, Escape y diálogo visible conservando expectativas/tiempos originales y capturas correlacionadas. El caller20 sólo separa esas fases; no registra por sí mismo toda la causalidad.
3. Transporte: vincular la operación y el mismo command_id al envío y respuesta del caso nuevo, sin registrar tokens/cookies/payloads sensibles. El caller existente cuenta bodies y committedStatus; un200 no sustituye prueba DB. El ensayo original inyecta recibo inválido DESPUÉS de route.fetch; conservar esa distinción frente al cuerpo recibido por la UI.
4. Recibo/UI: distinguir respuesta backend, cuerpo deliberadamente inválido entregado al navegador y recuperación existente del MISMO identificador dentro del ensayo acordado. No añadir otro comando/emisión para ocultar incertidumbre. Si no existe autorización exacta para recuperación, detener sólo ese caso.
5. Persistencia: el propietario del recurso confirma por separado documento/versión y unicidad del command/audit con las comprobaciones existentes en DB desechable. Correlación no medida queda UNKNOWN; HTTP200 o botón visible no son prueba persistente. Publicar fuente/resultado/capa/limpieza, sin inventar ceros. Tras arreglo causal, Oier revisa la misma fuente.

## Aceptación por recorrido: fuente → desplegado → prueba → resultado → límite → responsable

| Recorrido | Fuente candidata / desplegada | Prueba y resultado disponibles | Límite / próximo responsable |
|---|---|---|---|
| Acceso/login/workspace | b9e candidata; a9e desplegada reportada | W5 reporta API/page-read A/B; GET anónimo propio /dashboard401 | No login privado propio ni ventana; W5 presupuesto/acceso6296238416.401 sólo barrera, no Auth/RLS. |
| Dashboard y filtros | b9e candidata; a9e reportada | Componentes/bancos por fuente conservados en corte anterior | Sin recorrido visual cloud propio aceptado; comprobar datos/filtro real antes de diagnosticar ceros. Oier tras ventana. |
| Cliente/Customer360 | b9e sin22; a9e reportada | W5 reporta cliente/readback;22 foco9/9 controlado en d592 | No aceptación completa móvil/teclado/cloud. Asier seleccionar22; Oier revisar nueva composición. |
| Catálogo/precios simples | b9e integra cambios anteriores; a9e reportada | a9e Supabase desechable115UI y evidencia histórica TEL-014 | Cloud/roles/visual y precio efectivo telecom pendientes; Asier/W5. |
| Factura textual/propuesta | b9e sin21; a9e reportada | Base300EUR+IVA21%=363/15días en bancos;21 preserva concepto en146a | Parser determinista, HTTP/SpeechStub; sin aceptación cloud propia. Asier seleccionar21; Oier nuevoSHA. |
| Cliente→un borrador→recarga | b9e candidata; a9e reportada | W5 reportó persistencia/readback API/page-read | CORE162 propio NOT_RUN, requiere ventana/manifest y evidencia del mismoID/draft/importes. W5 entrega; Oier ejecuta. |
| Recuperación/aislamiento A/B | b9e candidata; a9e reportada | W5 reportó positivos A/B propios, negativas B→A404, suspendido/fuera-cohorte403 y anónimo401 | No propio Oier/visual completo/W4; actores temporales revocados tras ventana, no reutilizables. W5 nuevos fixtures acordados. |
| Contrato→servicio→línea | Propuesta16 sobrea9e; contrato sucesor pendiente | Sólo ejemplos de schemas/lectura de fuente, sin escrituras | Acordar scope3 frente alternativa175de4; condiciones/precio/moneda/versión reales. No inferir herencia service.plan_version_id. Asier decide; W5 recurso/ventana. |
| Voz real | Corrección173 integrada enb9e; clouda9e | Ciclo/edición tardía/error con SpeechStub, sólo controlado | Micrófono/transcripción reales NOT_RUN; permiso e intervención humana mínima cuando exista navegador legítimo. Oier/propietario. |
| Emisión/cobro/PDF/documentos | Aceptaciones separadas | Emisión175 conserva TIMEOUT; StorageP0/contenido OFF | No incluir como terminados en demo; Asier diagnóstico, W5 Storage, revisor independiente realmente asignado. |

CORE162 sigue en tools/oier_cloud_qa: exactamente customer.create y invoice.create_draft, una cada una; propuesta revisable300+63=363/15días, recibos y recarga de mismos IDs. Añadir concepto telecom íntegro sólo tras integrar21. Requiere fuente/deploy/build/config identificados, contexto legítimo propio, A/B admitidos de empresas distintas/roles/fixtures, ventana serializada, límites y limpieza/recuperación. Positivo B propio antes de negativas A; fuera-cohorte es otro control. Sin emisión/cobro/perfil fiscal/comunicaciones ni ampliación de mutaciones. Reusar manifestv2/journal/lock; no otro runner.

Ventana telecom separada: [propuesta16](20261020/TELECOM_SCOPE16_PROPOSAL.md), tres altas manuales contrato→servicio→línea sin activación/operadores y con catálogo preexistente, condiciones/precio/moneda/versión, enlaces/estados/recibos/readback y negativos/limpieza acordados. La alternativa Asier175 customer.update+plan_version.create+contract.create_manual+service.create_manual no es el mismo scope. Validar primero en recurso desechable y luego cloud autorizado; no inventar términos vendidos por etiqueta o por versión del contrato.

## Decisiones agrupadas y siguiente acción ejecutable

1. **Asier:** selección/rechazo motivado21/22, caller20 por separado y fuente candidata única; acordar con W5 caso/recurso desechable nuevo para emisión. Publicada selección, Oier revisa exactos blobs/deltas y regresión pertinente en ese SHA, sin escribir su rama.
2. **W5:** responder REQUEST6296238416 con equipo/plan reales, acceso privado propio para Oier+Asier, usuarios/roles, moneda/subtotal/impuestos/total mensual/extras, límites de consumo y acción humana concreta. **Sólo propuesta; no comprar, invitar, cambiar permisos o protección.** Preparar ventana CORE162 con fuente/deploy/config/build/adapter y rollback identificados, A/B/roles/fixtures/límites/expiración/limpieza por canal privado. No sesiones del propietario ni credenciales revocadas. Alternativa owner-hosted se atribuye a W5, no a Oier.
3. **Asier/W5:** contrato de precio/versiones/relaciones y alcance telecom antes de escrituras; luego ventana separada. **Propietario:** designar revisión de seguridad independiente disponible; no inventar cuarto agente W4 ni aceptación por silencio.

Todas las unidades conocidas restantes dependen de esas entregas. No hay nuevo defecto independiente reproducido en cola ni proceso local mantenido abierto. No se ejecutaron bancos verdes, voz simulada como real, escrituras cloud o reruns de CI en23. No iniciar otra auditoría genérica para eludir la decisión. Reanudar ante selección/composición, corrección causal o ventana real, sin polling continuo.

Guion de5–10min **condicionado a ese deploy y a sus aceptaciones**, no promesa de demo lista: acceso/versión→dashboard/filtros→cliente/Customer360→texto300+IVA21%→revisión humana→un draft→recarga mismoID/importes→Bpositivo/negativos acordados. Añadir telecom o voz sólo cuando tengan aceptación propia; omitir emisión/cobro/PDF/Storage no aceptados. Mientras tanto sólo pueden atribuirse al entorno alojado los resultados API/page-read reportados por W5; Oier no ha demostrado todavía qué puede completar visualmente un usuario en esa URL.

Cinco HIGH abiertos (cadena ESLint), historial/auditoría, fallos W5 EXACT_PINNED_OWN_RESOURCE/COMPOSITION_BLOB_DRIFT/cierres85/86 y vendors conservados. Perfil87 positivo no acredita full23/restauración/ausencia. F736, CASE_NOTE_CURSOR,100bf y cuatro timeouts172 conservan causas originales UNKNOWN; los posteriores positivos en otras fuentes no son reparación causal. Lista no medida permanece null, no cero. Backlog342 conserva evidencia individual, sin promoción por suma de tests. Storage/contenido afectado OFF, **IA comercial writes OFF, modelo vivo NOT_RUN, voz real NOT_RUN, issue10 OPEN, RELEASE_NOT_ACCEPTED**.
