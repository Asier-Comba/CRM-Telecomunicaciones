# DEMO_READINESS — CRM Telecom

Estado vigente 20/10/2026. Orden4561dee1; [coordinación W0/6301933535](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6301933535). **DEMO_NOT_READY; RELEASE_NOT_ACCEPTED.** Este es el único estado comercial vivo; el [corte anterior34948905](https://github.com/Asier-Comba/CRM-Telecomunicaciones/blob/34948905cb04d359b7d237516dc98d129da19572/docs/commercial-cloud/DEMO_READINESS.md) conserva el historial detallado. Publicado, integrado, desplegado y aceptado son estados distintos.

## Corte vigente tras revisión24

- PR175: **8ee0b9ba61cd45072fbce75f12c6e684e3f3e6a6**, árbolbbf296ae7b97cf64ae939cd2689e5c18f17a7688. Integra21/22/caller20 y selección explícita de versión/condiciones30. No volver a solicitar adopción. Ocho workflows terminales:2SUCCESS/6FAIL; conserva sus gates propios.
- [Revisión independiente Oier24](https://github.com/Asier-Comba/CRM-Telecomunicaciones/blob/eda01024c7822787f93b2a3bf045c3a50b676cfb/docs/commercial-cloud/20261020/REVIEW8EE24.md): los cinco blobs21/22 y PromptBuilder173 coinciden; versión vendida explícita, sin cargo duplicado ni activación. Fuente/semántica/artefactos revisados, sin volver a ejecutar4042/116/766.
- Safe12298385248/run39492445322/job118868853983 revisado directamente: checkout8b906a6e5483098cc713251330358a6f1d5098b4, árbol idéntico a8ee/parentsa9e+8ee.87migraciones/3815+227backend/116UI únicos, Auth y cleanup LOCALES/server0/teardownPASS. Ejecución de Asier, revisión propia Oier; no nuevo ensayo físico Oier. Fallos no enumerados=null, no cero medido.
- Telecom de tres altas PASS en ese recurso: versión publicada preexistente,19EUR/mes+alta0, contrato/servicio/línea draft/pending/pending, mismos IDs/relaciones/versión tras recarga, command/receipt/audit únicos, sin activación.
- LOST_REPLY e INVALID_RECEIPT de emisión observan ledger/recibo/audit0→1, factura v1→v2, coherenciaTRUE,2solicitudes con cuerpo idéntico y sin efecto adicional. Recibo backend validado antes de inyectar fallo al navegador. **Original39458747653 conserva causa/efectoUNKNOWN**, no reemitido; estos positivos no son reparación causal retrospectiva.
- W5 PR171 HEAD observado **1239d8664511a274974397aa700a716a1e0a5ece**:5SUCCESS/1FAIL/3activos en ese corte; no cualificado por Oier. El corte anterior db454 era6SUCCESS/3FAIL, sin herencia. Revisión28 sólo cierra el hallazgo26 ena13787d1; cambio de alcance completo/revisiónW4 e integración siguen separados.
- Último deploy reportado W5: **6ad78f6c810c781fba4f5880** = **a9e977adf90b1e83cded23fb54aefc696839d014**, no8ee. Config/adapter del nuevo deploy pendientes. No HOSTED_PASS propio ni de8ee.
- Supabase zgwotxnyqzfuzcnmgvtn:87migraciones/90tablas públicas RLS/2buckets privados/ACTIVE_HEALTHY según W0 sólolectura. Conector Oier projects=[] era visibilidad, no backend caído. No SQL/reset/reapply88/permisos/resellpro.

## Corrección independiente25 publicada

[PR177 DRAFT](https://github.com/Asier-Comba/CRM-Telecomunicaciones/pull/177), fuente80d3a4f136a436e289f4bf1a4de4c8fa4c4ef653, tests964795d5/fixcec44342 desde8ee. Callback de una sesión de dictado fallida podía alterar la siguiente:3FAIL causales→42/42PASS propios, lint/TypeScript/build44estáticasPASS. Sólo retira callbacks obsoletos, sin tocar parser/API/SQL/permisos. [Evidencia](https://github.com/Asier-Comba/CRM-Telecomunicaciones/blob/80d3a4f136a436e289f4bf1a4de4c8fa4c4ef653/docs/commercial-cloud/20261020/SPEECH_ERROR25.md). SpeechStub/HTTP: no micrófono/AuthDB/cloud o modelo vivo. No integrarlo por silencio, no heredar CI8ee ni publicar encima de checks activos.

[Revisión W5/26](20261020/PLATFORM_REVIEW26.md): el nuevo helper forward-only acepta dos altas posteriores con timestamp duplicado; unionMigrations las rechaza. Reproducción pura de fuente exacta, no bypass completo probado ni migraciones reales. W5 lo corrigió ena13787d1056828f0f45e083cb73f44b87b763ceb; revisión28 con el helper exacto confirma negativos/positivos y cierra sólo ese hallazgo. No aprobación completa del alcance, W4, adopción en175 o release.

## Estado por recorrido

| Recorrido | Fuente revisada / desplegada reportada | Resultado y límites | Siguiente responsable |
|---|---|---|---|
| Login/dashboard/cliente360 |8ee / a9e|W5 reportó API/page-read A/B ena9e; Oier anónimo401. No contexto privado propio o visual completo. Foco22 integrado y conservado.|W5 entrega ventana; Oier QA de esa versión.|
| Catálogo/condiciones→contrato→servicio→línea |8ee / a9e|Tres altas y readbacks87 desechablePASS revisados; elección explícita de versión, cuota/alta/moneda/estado/relaciones. No prueba telecom cloud.|Asier fuente/alcance ya definidos; W5 fixtures/ventana separada3mutaciones; Oier revisión de bordes/aceptación.|
| Factura textual→draft→recarga |8ee / a9e|21preserva cifras; corrección humana173 integrada. Fuente/artefactos revisados; pruebas de propuesta controladas y físicas por sus fuentes. No CORE162 propio alojado.|W5 nuevo deploy y contexto; Oier CORE1622mutaciones, recibos y mismosIDs/importes.|
| Recuperación de emisión |8ee / a9e|Nuevos ensayos desechables31medidosPASS; originalUNKNOWN. No autorización de emisión en demo.|Asier conserva ownership; Oier revisión causal si aparece otro defecto.|
| A/B/permisos |8ee / a9e|Auth/RLS locales del run; W5 positivoA/B y negativos API/page-read ena9e. No toda seguridad/visual ni aceptación8eecloud; actores anteriores revocados.|W5 nuevos A/B admitidos/roles/fixtures; Oier positivos propios antes de cruzadas.|
| Dictado |8ee / a9e|SpeechStub existente, no micrófono real. Edición humana retira callback de resultado incluso si abort falla.|Oier comprobar borde asíncrono nuevo; micrófono realNOT_VERIFIED.|
| PDF/documentos/emisión/cobros |aceptaciones separadas|StorageP0/contenidoOFF; no terminados por guardar un draft.|W5/Asier/revisor independiente según contrato.|
| Resto342/SaaS |backlog canónico|No aceptación por suma de tests; onboarding/planes/pagos/proveedores/backup pendientes.|Por unidad y dependencia.|

## Acceso y QA alojada

**Decisión definitiva del propietario: PRESUPUESTO0EUR**, publicada en[6302343684](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6302343684). Pro rechazado, no compra/tarjeta/crédito/invitación o gasto; conservar NetlifyFree/site/deploy/protecciones intactos. La propuesta6299975950 ya está contestada, no pendiente de contratación. QA independiente queda pendiente por acceso, no detenido el desarrollo. [Estudio27](20261020/FREE_HOSTING27.md) cerrado: VercelHobby descartado por uso comercial; Cloudflare no validado por tarjetaAccess/Nodeproxy/CPU; RenderNode queda como propuesta deshabilitada con schema y guardias verificadas, sin aceptación de privacidad o runtimehosted. El contrato real de origen rechaza cualquier nuevo host. No migrar, ampliar política o desplegar por esa propuesta. Resultados owner-hosted se atribuyen al propietario/W5 y pueden revisarse independientemente; no compartir sesión.

Ventana W5 preparada pero no abierta. Reusar **tools/oier_cloud_qa/CORE162**, manifestv2/journal/lock. Requiere nuevo deploy/source/tree/config/build/adapter/artefacto/rollback y contexto propio legítimo, A/B admitidos de empresas distintas/roles/fixtures/expiración/serialización/límites/limpieza. No cookies/sesiones prestadas o usuarios revocados. CORE conserva exactamente **customer.create + invoice.create_draft**, una cadauna;300EUR+IVA21%=363/15días, revisión humana, recibos/readback mismosIDs/draft/importes. Añadir concepto600Mbps ya integrado21 al caso pertinente sin ampliar mutaciones. Positivo B propio antes de negativas A; fuera-cohorte separado. Sin emisión/cobro/perfil fiscal/comunicaciones.

Telecom separado:3altas manuales contrato→servicio→línea desde catálogo/versión aprobados. Ya demostrado en desechable8ee; no repetirlo sin hipótesis. Para hosted acordar fixture/fecha/familia/precio/moneda/versión, readbacks/negativos/limpieza. No herencia implícita de plan_version_id, cuarta escritura escondida o activación/operador.

## Próxima cola útil

1.25cerrado enPR177, controles remotos propios pendientes; no repetir verdes ni empujar encima de checks. Revisar nuevas entregas reales antes de cambios.
2.26corregido porW5/28ACK técnico limitado; seguir integración/revisión por su fuente. Publicar evaluación coste0 con uso comercial/límites/Next.js/privacidad; sólo preparar configuración si cumple, nunca migrar automáticamente.
3. CORE162 tras ventana real y nuevo deploy; telecom en otra ventana. Voz real sólo con navegador/micrófono consentidos; mientras tanto NOT_VERIFIED. Paridad inmobiliaria sólo lectura y funciones equivalentes, sin otra auditoría general.

Guion privado de5–10min, **sólo cuando ese deploy tenga aceptación propia**: acceso/versión→dashboard/filtros→cliente360→texto300+IVA→revisión→draft→recarga mismoID/importes→catálogo/condiciones→tres altas/recarga→permisos. Omitir voz/emisión/cobro/PDF/Storage no aceptados. Hoy sólo se atribuyen al alojado los resultados API/page-read de W5; todavía no se acredita el recorrido visual independiente en esa URL.

CincoHIGH, historial/vendor, StorageP0, revisión independiente disponible, backup/restauración y gates siguen abiertos. Perfil87 no es full23/ausencia/restore. F736/CASE_NOTE_CURSOR/100bf/172conservan causasUNKNOWN; no ceros inventados ni replays de efectos históricos inciertos. **IA negocio writesOFF; modelo vivoNOT_RUN; voz realNOT_VERIFIED; issue10OPEN; DEMO_NOT_READY; RELEASE_NOT_ACCEPTED.**
