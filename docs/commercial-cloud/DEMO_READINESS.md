# DEMO_READINESS — CRM Telecom

Estado vigente20/10/2026, ordenf7d04fdf y W06294187656. **DEMO_NOT_READY; releaseNOT_ACCEPTED.** Objetivo: demo privada repetible la semana26/10; no producción. Este corte sustituye las lecturas de estado anteriores. El historial íntegro permanece en Git, incluido [checkpoint153a04e2](https://github.com/Asier-Comba/CRM-Telecomunicaciones/blob/153a04e2e0f0dbfa38d2bb3ac0df6e38c3b4a82b/docs/commercial-cloud/DEMO_READINESS.md).

## Actualización vigente: candidata175 y acceso privado

El propietario ha elegido preparar una solución privada para las cuentas propias de Oier y Asier. [REQUEST W5 6296238416](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6296238416) pide verificar el equipo propietario real, plan/modalidad, usuarios y roles incluidos, moneda, subtotal, impuestos, total mensual, créditos y posibles extras. **Sólo propuesta: no compra, upgrade, invitación, cambio de permisos o protección.** El precio público no sustituye el presupuesto del equipo real; cualquier total dependiente del checkout debe verificarse antes de presentarlo como final. Mientras tanto, coordinar pruebas alojadas legítimas del propietario con alcance/ventana explícitos y atribución correcta; no compartir sesiones ni reactivar cuentas revocadas.

La candidata designada por Asier es ahora **PR175 / b9e1eefeea3342b40bdd9584747e9e7ff47bf1cd / árbol6012a6c409733f60282d0ca997d414dd31a11394**, entrega6295970548. Adopta los componentes originales Oier172/173 y preparación174. Sus controles locales son reportados por Asier, no ejecución propia Oier. No hay despliegue175 acreditado: el entorno alojado sigue reportado a9e/6ad78f6c. No trasladar resultados entre fuentes.

## Entorno alojado y fuente anterior

| Objeto | Fuente / evidencia | Alcance |
|---|---|---|
| Integración PR156 | a9e977adf90b1e83cded23fb54aefc696839d014; árbolac48598bffd8a528919f63f2bcad1d07365c775d; productobd0b353c | HEAD observado, no modificado por Oier |
| Supabase desechable de esa candidata | run39443419236/job118698939240/artifact12275853607, checkoutaafcf42 con árbol idéntico | Revisado directamente:87migraciones,3815+227backend,115UI únicos, incluidoslayout/catálogo; server0/teardownPASS. LOCAL_SUPABASE_DOCKER |
| Nuevo deploy privado |6ad78f6c810c781fba4f5880, appa9e/árbolac48598; W56295242000 | REPORTADO_POR_W5, no inspección propia del proveedor; adapter efectivoNOT_RECORDED. A/B W5 posteriormente reportadoPASS en6295591477, sin ejecución propiaOier |
| Acceso independiente Oier | GETanónimo /dashboard401, sin cookies/credenciales/cuerpo guardado | Sólo barreraHTTP; no prueba Auth/DB/RLS. Contexto privado/ventana propios pendientes |
| Demo anterior |6ad75c93ac4914f9005f4767/appe42 | Login→cliente→factura300+63=363/readback reportadosW5, fila corroboradaW0. Histórico; no herencia al nuevo deploy |
| Supabase hospedado |crm-telecom-staging/zgwotxnyqzfuzcnmgvtn,87migraciones segúnW0/W5 | No reset/reapply87/88/resellpro. Conexión propia previamenteprojects=[]; no SQL repetido ni cambios de permisos |

[Revisión propia de la candidata](20261020/evidence/master-a9e-local-qualified.json), [lectura anónima](20261020/evidence/new-deploy-anonymous-access.json), [snapshot recuperable](20261020/DEMO_STATUS15.json).

## Propuestas propias — componentes172/173 ya adoptados por Asier175

| Unidad | Fuentes / entrega | Resultado propio y límites |
|---|---|---|
| [Cartera390 diagnóstico170](https://github.com/Asier-Comba/CRM-Telecomunicaciones/pull/170) |funcionalcba9d55f; remoto0d00e41a |Original100bf/checkout72f79/árbolf0fc y artefactos preservados.15componentes/HTTP+9NodePASS. Timeout NO_REPRODUCIDO, causaUNKNOWN. Reusa observador; mismas3acciones/tiempos/expectativas, fases separadas. Replay AuthDB local bloqueado por daemonDocker ausente |
| [Cartera feedback172](https://github.com/Asier-Comba/CRM-Telecomunicaciones/pull/172) |funcional960d2d8c; remoto4bfddd3a |3FAIL→9PASS más6regresiones; lint/defaultbuildTypes44PASS. Dos inserciones markup, aviso visible también dentro del viewport390/768/1440. Primer aviso móvil fuera del frame preservado; no reparación causal100bf |
| [Corrección manual/dictado173](https://github.com/Asier-Comba/CRM-Telecomunicaciones/pull/173) |funcional853d30cd; remoto5f00ab8b |Pérdida de corrección3FAIL y limpieza3FAIL preservadas; final36prompt+12diálogo+9intenciónPASS, lint/defaultbuildTypes44PASS. SpeechStub/HTTP, no micrófono real, cloud o escritura |

Cada PR contiene fuentes exactas, casos fallidos y evidencias propias. No sumar resultados de SHAs/entornos diferentes. Los componentes172/173 fueron adoptados por Asier175; no reenviarlos. Los23blobs antiguos de167–169 tampoco se reenvían ni se fusiona161 en bloque. Asier revisa e integra selectivamente; Oier no escribe su rama. El nuevo delta de callers17 en172 sigue separado, pendiente de revisión y controles propios.

## Controles remotos de estas propuestas

Snapshot exacto enDEMO_STATUS15.json. Sin cancelaciones, reruns ni publicación encima de checks activos.

- PR170: CI39451802607FAIL. Checkout realc43a55ba/árbol4fa2100f es mezclaa9e+0d00; **no** árbol de head0d00. Quality669bootstrap/827assistant/lint/types/build44PASS; gate5HIGHFAIL. Preview718=359desktop+359mobile, unión exacta propia, sóloSYNTHETIC_PREVIEW. Nativo general falla cuota antes de checkout: sin prueba de producto. Supabase39451803219SUCCESS:87migraciones/4042backend/115UI/teardownPASS en esa mezclac43; fases390 fill→click→enabled completan1255ms. Snapshot del contrato esperado todavíaPENDING/DTOnoobservado al habilitar botón; referencia exacta posterior pasa por separado. [Evidencia](20261020/evidence/portfolio12-real-local-qualified.json). Causa original100bf sigueUNKNOWN.
- PR172 original4bf: quality118734033533 sobre0c5ce385/árbolf69510ba idéntico a4bf:664bootstrap/827assistant/lint/types/build44PASS; gate5HIGHFAIL. CI39453449139FAIL; preview718 propio y nativo general118734033068PASS (no recursoW5/full23). **Supabase39453448961 FAIL:87migraciones/4042backend/111UI únicos+4TIMEOUT, server0/teardownPASS.** Fallos SIM creation prepare y tres visores de SIM/portabilidad/incidencia. Originales safe12281805996 y capturas12281677547 preservados. Causa completaUNKNOWN; Resumen/Consultando… no demuestra caídaAuth/DB, bucle infinito o culpa del markupCartera. [Proyección original](20261020/evidence/portfolio13-original-failure.safe.json).
- PR173: Quality118739067912 sobrea332bb0642a2766e47275657769fbc8ad52d6453/árbol0697aaacd182d7987ee6d67b6685895177d9bf81 idéntico a5f:664bootstrap/827assistant/lint/types/build44PASS; gate5HIGHFAIL. CI39454896937FAIL; preview718 propio/artifact12281306457. **Supabase39454896864 SUCCESS:87/4042/115UI únicos, Auth/cleanup locales, server0/teardownPASS.** Lista de fallos ausente: null, no cero medido. Los cuatro casos fallidos172 pasan aquí, pero es otra fuente: no demostración causal de reparación. [Proyección segura](20261020/evidence/billing14-real-local-qualified.json). No cloud, micrófono real o modelo vivo.
- PR172 nuevo92397a543f2f1013c47914a0e57c414ed144d9aa: caller1cc02065, sólo fases fijas/report en5callers, delta15+/15−; guard byte-normalizado, sintaxis y lintPASS. Sin nuevas esperas, assertions, timeouts, API, SQL, producto o imagen. **Supabase39460320957 y CI39460320953 en curso al corte**, W5enterprise39460320830 y W4all-ref39460320567FAIL. No heredar111/115; no push/rerun/cancelación. Handoff6296205990 conserva los originales.
- PR175: Asier6296031051 documenta EXACT_PINNED_OWN_RESOURCE físico, COMPOSITION_BLOB_DRIFT y cierres antiguos de migraciones. PropiedadW5; no editar sus fixtures/recursos. Perfil87/reinicio reportado en su propia fuente; full23/verifiedAbsenceNOT_RUN. No aceptación de175 o release.
- W4/historyFAIL y plataforma/vendor mantienen sus fallos. Un job de secreto exitoso no es aprobación independiente. Perfil87/reinicio W5, nativo general/restauración, ausencia/full23 y release son alcances distintos.

## Ventana cloud y aceptación individual

REQUEST existente6291203581, ACKs6295229738/6295296550. Falta entrega privada de acceso legítimo/contexto dedicado, ventana exclusiva, A/B admitidos de empresas distintas con roles y fixtures propios, operaciones/límites, limpieza y recuperación ante resultado incierto. W56295591477 reporta positivosA/B, negativasB→A y suspendido/fuera-cohorte separados, mediante API/page-read: ventana de navegador no pintada, no visual completo. Después revocaB/suspendido/viewer: no son fixtures reutilizables. No es ejecución propiaOier. La [documentación oficial Netlify](https://docs.netlify.com/manage/security/secure-access-to-sites/project-visibility/) confirma el límiteFree/Personal privado; ahora existe autorización para preparar el presupuesto, no contratar. El [precio oficial](https://www.netlify.com/pricing/) no es el total final del equipo. Sin préstamo de sesión o cambios de protección/cohorte.

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

Siguiente: cerrar controles propios923 por SHA/árbol/artefacto, conservando fallos y sin repetir verdes. W5 verifica equipo y presupuesto privado, coordina ventanas alojadas legítimas del propietario. CORE162 sólo tras entrega privada propia, una vez con journal. Continuar defectos comerciales reproducidos o revisión independiente útil; no fabricar actividad. DockerLinux local no disponible; ningún stack iniciado por Oier. Guion5–10min: acceso/versión→dashboard→cliente/360→texto300+IVA→revisión→draft→recarga; añadir telecom/voz únicamente si aceptados en ese deploy. **IA comercial writesOFF, modelo vivoNOT_RUN, vozrealNOT_RUN, issue10OPEN, releaseNOT_ACCEPTED.**

## Revisión174 y siguiente alcance preparado

Revisión independiente Oier174 sobre2de85705:12casos propios/lint/typesPASS, sin modificar fuente/banco ni PR nueva, sin hallazgo accionable en el delta acotado; no seguridad/release. Evidencia c27e87db, REVIEW174.md en su rama, handoff6295862372. No sumar esos12 a los controles173.

[PropuestaTELECOM16](20261020/TELECOM_SCOPE16_PROPOSAL.md): tres altas UI contract→service→line desde fixtures publicados, draft/pending/pending, máximo3solicitudes, sin activación/identificadores/SQL. CORE intacto2mutaciones; no ejecución autorizada. Incluye ACK/ventana/limpieza/negativas sólolectura; precio del servicio no se infiere de contrato. Validación local de ejemplos de schema, no prueba de negocio.

La solicitud Asier175 plantea cuatro operaciones diferentes: customer.update, plan_version.create, contract.create_manual y service.create_manual. Acordar alternativa/límite exactos antes de ejecutar; ninguna amplía CORE por silencio. Refrescar fuente/deploy y fixtures para la ventana; la propuesta16 histórica sobrea9e no autoriza ejecución175.
