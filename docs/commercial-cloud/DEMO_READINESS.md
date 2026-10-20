# DEMO_READINESS — CRM Telecom

Estado vigente20/10/2026, ordenf7d04fdf y W06294187656. **DEMO_NOT_READY; releaseNOT_ACCEPTED.** Objetivo: demo privada repetible la semana26/10; no producción. Este corte sustituye las lecturas de estado anteriores. El historial íntegro permanece en Git, incluido [checkpoint153a04e2](https://github.com/Asier-Comba/CRM-Telecomunicaciones/blob/153a04e2e0f0dbfa38d2bb3ac0df6e38c3b4a82b/docs/commercial-cloud/DEMO_READINESS.md).

## Candidata y demo

| Objeto | Fuente / evidencia | Alcance |
|---|---|---|
| Integración PR156 | a9e977adf90b1e83cded23fb54aefc696839d014; árbolac48598bffd8a528919f63f2bcad1d07365c775d; productobd0b353c | HEAD observado, no modificado por Oier |
| Supabase desechable de esa candidata | run39443419236/job118698939240/artifact12275853607, checkoutaafcf42 con árbol idéntico | Revisado directamente:87migraciones,3815+227backend,115UI únicos, incluidoslayout/catálogo; server0/teardownPASS. LOCAL_SUPABASE_DOCKER |
| Nuevo deploy privado |6ad78f6c810c781fba4f5880, appa9e/árbolac48598; W56295242000 | REPORTADO_POR_W5, no inspección propia del proveedor; adapter efectivoNOT_RECORDED. A/B W5 posteriormente reportadoPASS en6295591477, sin ejecución propiaOier |
| Acceso independiente Oier | GETanónimo /dashboard401, sin cookies/credenciales/cuerpo guardado | Sólo barreraHTTP; no prueba Auth/DB/RLS. Contexto privado/ventana propios pendientes |
| Demo anterior |6ad75c93ac4914f9005f4767/appe42 | Login→cliente→factura300+63=363/readback reportadosW5, fila corroboradaW0. Histórico; no herencia al nuevo deploy |
| Supabase hospedado |crm-telecom-staging/zgwotxnyqzfuzcnmgvtn,87migraciones segúnW0/W5 | No reset/reapply87/88/resellpro. Conexión propia previamenteprojects=[]; no SQL repetido ni cambios de permisos |

[Revisión propia de la candidata](20261020/evidence/master-a9e-local-qualified.json), [lectura anónima](20261020/evidence/new-deploy-anonymous-access.json), [snapshot recuperable](20261020/DEMO_STATUS15.json).

## Propuestas propias nuevas — integración pendiente

| Unidad | Fuentes / entrega | Resultado propio y límites |
|---|---|---|
| [Cartera390 diagnóstico170](https://github.com/Asier-Comba/CRM-Telecomunicaciones/pull/170) |funcionalcba9d55f; remoto0d00e41a |Original100bf/checkout72f79/árbolf0fc y artefactos preservados.15componentes/HTTP+9NodePASS. Timeout NO_REPRODUCIDO, causaUNKNOWN. Reusa observador; mismas3acciones/tiempos/expectativas, fases separadas. Replay AuthDB local bloqueado por daemonDocker ausente |
| [Cartera feedback172](https://github.com/Asier-Comba/CRM-Telecomunicaciones/pull/172) |funcional960d2d8c; remoto4bfddd3a |3FAIL→9PASS más6regresiones; lint/defaultbuildTypes44PASS. Dos inserciones markup, aviso visible también dentro del viewport390/768/1440. Primer aviso móvil fuera del frame preservado; no reparación causal100bf |
| [Corrección manual/dictado173](https://github.com/Asier-Comba/CRM-Telecomunicaciones/pull/173) |funcional853d30cd; remoto5f00ab8b |Pérdida de corrección3FAIL y limpieza3FAIL preservadas; final36prompt+12diálogo+9intenciónPASS, lint/defaultbuildTypes44PASS. SpeechStub/HTTP, no micrófono real, cloud o escritura |

Cada PR contiene fuentes exactas, casos fallidos y evidencias propias. No sumar resultados de SHAs/entornos diferentes. Los23blobs antiguos de167–169 ya adoptados no se reenvían ni se fusiona161 en bloque. Asier revisa e integra selectivamente las propuestas; Oier no escribe su rama.

## Controles remotos de estas propuestas

Snapshot exacto enDEMO_STATUS15.json. Sin cancelaciones, reruns ni publicación encima de checks activos.

- PR170: CI39451802607FAIL. Checkout realc43a55ba/árbol4fa2100f es mezclaa9e+0d00; **no** árbol de head0d00. Quality669bootstrap/827assistant/lint/types/build44PASS; gate5HIGHFAIL. Preview718=359desktop+359mobile, unión exacta propia, sóloSYNTHETIC_PREVIEW. Nativo general falla cuota antes de checkout: sin prueba de producto. Supabase39451803219SUCCESS:87migraciones/4042backend/115UI/teardownPASS en esa mezclac43; fases390 fill→click→enabled completan1255ms. Snapshot del contrato esperado todavíaPENDING/DTOnoobservado al habilitar botón; referencia exacta posterior pasa por separado. [Evidencia](20261020/evidence/portfolio12-real-local-qualified.json). Causa original100bf sigueUNKNOWN.
- PR172: quality118734033533 sobre0c5ce385/árbolf69510ba idéntico a4bfddd3a:664bootstrap/827assistant/lint/types/build44PASS; gate5HIGHFAIL. CI39453449139FAIL por5HIGH; preview718 propio/árbol0c5 verificado y nativo general118734033068PASS (no recursoW5/full23). Supabase39453448961 pendiente al corte. No trasladar115de a9e a esta fuente.
- PR173: controles recién publicados, Quality118739067912 sobrea332bb06/árbol0697aaac idénticoahead5f:664bootstrap/827assistant/lint/types/build44PASS, gate5HIGHFAIL. CI39454896937FAIL por5HIGH; unión718propia en a332bb06/artifact12281306457 verificada. Supabase39454896864 pendiente.57locales no equivalen a su AuthDB física.
- W4/historyFAIL y plataforma/vendor mantienen sus fallos. Un job de secreto exitoso no es aprobación independiente. Perfil87/reinicio W5, nativo general/restauración, ausencia/full23 y release son alcances distintos.

## Ventana cloud y aceptación individual

REQUEST existente6291203581, ACKs6295229738/6295296550. Falta entrega privada de acceso legítimo/contexto dedicado (W5informa planFree privado sóloowner), ventana exclusiva, A/B admitidos de empresas distintas con roles y fixtures propios, operaciones/límites, limpieza y recuperación ante resultado incierto. W56295591477 reporta positivosA/B, negativasB→A y suspendido/fuera-cohorte separados. Después revocaB/suspendido/viewer: no son fixtures reutilizables para mi ventana. No es mi ejecución de aislamiento. La [documentación oficial Netlify](https://docs.netlify.com/manage/security/secure-access-to-sites/project-visibility/) confirma el límite Free/Personal: proyecto privado sóloTeamOwner. Propietarios/W5 deciden vía de colaboración privada; no gasto, cambio de plan/protección o préstamo de sesión autorizados. No compartir sesiones ni habilitar usuarios/cohortes.

Reusar tools/oier_cloud_qa, manifestv2/journal/lock. CORE: exactamente una customer.create y una invoice.create_draft por A; propuesta editable, recibo, recarga y mismos IDs/importes/draft sin emisión. PositivoB propio antes de negativasA; anónimo y fuera de cohorte separados. Tarifa/edición/contrato/servicio/línea requieren segunda unidad y autorización de alcance; no ampliar CORE silenciosamente.

| Requisito/recorrido | Evidencia disponible | Aceptación pendiente |
|---|---|---|
| TEL-014 publicación simple catálogo |a9e real-local incluye nuevo recorrido115, propio48controlado histórico7c0 |Cloud, permisos/visual completos; bundles/prestaciones avanzados conservados |
| PAR-133 prompt de texto |853d30cd conserva corrección y propuesta revisada; frase300+IVA21%+15días cubierta |Integración, cloud/write/readback y resto de fila; sólo propuesta parcial |
| PAR-134 dictado español |Ciclo/error/edición controlados conSpeechStub |Micrófono, permiso/transcripción reales, cancelación/error/corrección y revisión humana |
| Cliente→contrato→servicio→línea |Consumidores integrados existentes y pruebas por fuente |Segundo scope acordado, recorrido UI alojado y readback por efecto; no sembrarSQL ni llamar operadores |
| Resto342 |Matriz canónica conservada, sin promociones masivas |Evidencia individual por módulo/rol/entorno; no deducir ausencias de estadosNOT_RECONCILED |

## Bloqueos y próxima tarea

Asier conserva integración/producto; CoworkW5 hosting,SQL,Storage,infra y entrega de ventana. PR171 sustituye165 como propuesta de plataforma: revisión/adopción propias, no permiso Oier para cambiar manifiesto/recurso/imagen/workflow. Propietarios identifican revisor independiente de Auth/cohorte/RLS/Storage. CincoHIGH, historia, vendors, StorageP0/contenidoOFF y backup/restore siguen abiertos.

Conservar F736/CASE_NOTE_CURSOR/a32/137 y causas desconocidas.100bf catálogo pudo escribir antes del timeout según errata6294158041: estadoUNKNOWN, nunca repetir a ciegas. Artefactos/fixtures fallidos y conteos no medidos permanecen separados; no fabricar ceros/full23.

Siguiente: cerrar las ejecuciones propias ya iniciadas por SHA/artefacto, sin repetir verdes. W5 entrega acceso/ventana; ejecutar CORE162 una vez con journal, después acordar segunda unidad telecom. Guion5–10min: acceso/versión→dashboard→cliente/360→texto300+IVA→revisión→draft→recarga; añadir telecom/voz únicamente si aceptados en ese deploy. **IA comercial writesOFF, modelo vivoNOT_RUN, issue10OPEN, releaseNOT_ACCEPTED.**
