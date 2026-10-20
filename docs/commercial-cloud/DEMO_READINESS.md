# DEMO_READINESS — CRM Telecom

Documento vivo único, actualizado 20/10/2026 según orden0533bd7f y coordinación6290919979. **DEMO_NOT_READY; release NOT_ACCEPTED.** Meta: demostración privada repetible la semana del26/10. No autorización de producción.

## Fuentes y procedencia vigentes

| Objeto | Identidad | Clasificación y límite |
|---|---|---|
| Integración Asier PR156 | 3b80c50d13bc0a9a52f6662de46a1e8b9581c62b, árbol a8dc2e8d878aef2d0b5eaadbe30ba9dfd9241722 | OBSERVADA_DIRECTAMENTE por Git; designada por Asier6290399103 para preparar demo, sin release |
| Aplicación comunicada desplegada | e42cfd59615a284bf26a758c4078c299bed39290 | REPORTADA_POR_OTRO_AGENTE: W5; base3b80 más delta de admisión Edge, pendiente ACK del integrador |
| Configuración de build | 7c2a276ebfc260998fe1dcf3f92598338cc1226f | Código publicado OBSERVADO_DIRECTAMENTE; uso del netlify.toml REPORTADO por W5; digest/ejecución automática PENDIENTES |
| Deploy | 6ad75c93ac4914f9005f4767 | REPORTADO_POR_OTRO_AGENTE en W5 d5b5a09ac29591e522927afa94c3d3053189c354, docs/w5/CLOUD_HANDOFF.md §10 |
| Destino | https://crm-telecom-staging-preview.netlify.app/ ; site3d75b8b6-701d-4021-8c0e-fec141dbef6f | Acceso normal privado independiente PENDIENTE; ninguna sesión del propietario compartida |
| Supabase | crm-telecom-staging / zgwotxnyqzfuzcnmgvtn,87migraciones | REPORTADO_POR_OTRO_AGENTE W0/W5; no reset/reaplicación/migración88/resellpro |
| QA histórico PR161 | 353eb862cf7af41f2028cc07a32f004bb0c33e3f; ejecutable31f95826ccfd05b58d27f391f0b576bdc42039e2 | OBSERVADO_DIRECTAMENTE: PR DRAFT con conflictos; producto seleccionado ya adoptado, no fusionar entera |
| QA consumible | codex/oier-cloud-qa-20261020, base3b80 acordada6290399103 | Extracción exclusiva tools/oier_cloud_qa y documentación mínima; sin producto, workflows, dependencias o capturas masivas |

La revisión de los objetos Git confirma que e42 modifica solo admisión y su test. No heredar los resultados de3b80 a ese delta o al deploy. La entrega W5 contiene secciones históricas1–9 contradichas por §10; prevalece la evidencia fechada de §10 para el recorrido reportado, sin promover pendientes a aceptación.

## Recorridos: separar informe, ejecución y aceptación

| Recorrido | Evidencia disponible | Evidencia siguiente / responsable |
|---|---|---|
| Netlify → login → dashboard | PROBADA_EN_CLOUD por W5, REPORTADA_POR_OTRO_AGENTE a Oier | Oier: acceso independiente normal y ventana autorizada; verificar identidad/rol/tenant de servidor |
| Cliente nuevo → recibo → recarga/Customer360 | PROBADA_EN_CLOUD por W5, REPORTADA_POR_OTRO_AGENTE | Oier: fixture previo por ID, una creación propia autorizada y readback del mismo ID/versión |
| Texto fibra300EUR+IVA21%+15días → propuesta → borrador | PROBADA_EN_CLOUD por W5, REPORTADA_POR_OTRO_AGENTE | Oier: revisión explícita de propuesta editable; un borrador sin emisión; UI/API tras recarga |
| Persistencia de ejemplo W5 | REPORTADA_POR_OTRO_AGENTE: W0 corroboró por lectura DB draft/EUR/30000/6300/36300/una línea/sin emisión | Oier: no atribuirse la lecturaW0; registrar por separado UI/API propio y lecturaDB autorizada de sus IDs |
| Aislamiento A/B | PENDIENTE en este deploy; runner NOT_RUN | W5: B preexistente admitido, tenant distinto y owner/admin con cliente/factura propios; Oier: positivo propio B antes de negativos A |
| Usuario fuera de cohorte | PENDIENTE, control separado de aislamiento | W5/Asier: identidad/ventana de negativo autorizadas; no habilitarla para forzar pruebas |
| Voz real | PENDIENTE / NOT_RUN; botón presente reportado | Recurso real de micrófono autorizado, transcripción/corrección/cancelación/error y texto alternativo; sin stub, guardado o emisión automática |
| PDF/documentos privados | PENDIENTE / excluidos por StorageP0 | W5 + revisor independiente asignado; Storagev2/88 propuesta, no permiso para aplicar |
| Resto de módulos/asistente | Aceptación alojada individual PENDIENTE | Mantener matriz canónica y dependencias, IA comercial writesOFF, modelo vivoNOT_RUN |

Ninguna fila convierte el CRM en DEMO_ACCEPTED. Existe un recorrido cloud reportado y corroboración de su ejemplo; falta la repetición independiente completa y sus negativos. No se describe todo el proyecto como «solo local».

## Controles por fuente y entorno — no agregables

- PROBADA_LOCALMENTE: Supabase39415508242/job118603412840, checkoutb955c12919e74ef36ec22f1a54b16cf23bf3b427 con árbol idéntico a3b80.87migraciones,4042backend(3815W1+227W2),114UI exactos, teardownPASS. LOCAL_SUPABASE_DOCKER; no AuthDB hosted.
- PROBADA_LOCALMENTE: preview710(355desktop+355mobile), mismo checkout/árbol, SYNTHETIC_PREVIEW_ONLY. No sumarlos a backend/UI.
- PROBADA_LOCALMENTE histórica: aplicaciónOier49bc357browserHTTPcontrolado/96logic y QA31f9 con14controles del arnés. No reasignar esos resultados a otro SHA/deploy.
- OBSERVADA_DIRECTAMENTE:18imágenes existentes del artefacto12262346907 revisadas, no18tests nuevos; Customer360desktop y responsables390 aún cargaban. Siguiente captura requiere cargado o error autoritativo; las originales se conservan. Una foto no demuestra bloqueo permanente.
- FALLIDA: CI3b80 global655/656bootstrap, perfil85/86rechaza87; cincoHIGH visibles. Nativo falla por cuota antes del checkout: SHA/pruebas no medidos; cero reruns Oier. W4/all-ref y otros workflows conservan sus fallos.
- PENDIENTE: perfil87a1ab802092ba38c7aca2dfea451922a3dcfa05c4 ya publicado,13/13locales W5; falta ejecución física y revisión. No otro loader ni copia del recurso nativo.
- PENDIENTE: workflow/configNetlify7c publicados, no ejecución operacional acreditada. W0 señala fail-open si falta testperfil87 y workflow ausente en default: W5 debe proponer cierre obligatorio e incorporación revisada, no edición directa de default.

## Ventana independiente: dependencia exacta

REQUEST agrupado6291203581 a W5: URL/site,deploy/appSHA/configfuente o digest, acceso normal independiente, A/B sintéticos preexistentes y admitidos con roles/empresas/fixtures propios por ID privado, ventana exclusiva, operaciones/límites, limpieza y recuperación ante resultado incierto. §10 solo acredita A; no crear/habilitar B, cambiar cohorte ni compartir sesión del propietario. Credenciales/cookies/JWT/CDP permanecen privados.

El runner existente mantiene manifestv2, dos mutaciones máximas A(customer.create e invoice.create_draft), journal privado, lock por ventana, revisión antes del guardado, recuperación de identidad ante incertidumbre y positivo B antes de denegar A. Sin entrega autorizada no ejecutar --run. Procedencia del deploy sigue atestación externa, no inspección independiente del proveedor. Voz/DBindependiente/modelo se declaran aparte.

Comprobación única de alcance de esta conexión Supabase20/10: projects=[]; no consultaSQL repetida, cambios de permisos o conclusión de DB caída. W0 tiene otra conexión funcional. Solicitud específica de reautorización al proyecto o metadata saneada a W5 permanece abierta; no bloquea revisión local.

## Defectos y propietarios

| Tarea | Responsable | Fuente / dependencia | Siguiente evidencia | Estado |
|---|---|---|---|---|
| QA pequeño consumible | Oier → revisiónAsier | base3b80; PR161 histórico intacto | Controles propios sobre nueva composición y PR DRAFT sin conflictos | EN_CURSO |
| Admisión Edge | Asier revisa propuestaW5e42 | Contrato compartido, no editar en paralelo | Negativos configuración/APP_ENV/origen/proyecto/cohorte/revocación; luego ACK explícito | PENDIENTE |
| Textos «Integración/base local» en hosted | PropuestaOier → Asier | Transporte integrated_local también hospeda | Copia fiel al transporte; no afirmar persistencia por cambiar una etiqueta | PENDIENTE |
| Dashboard «Mi actividad» con ceros | Asier/Oier | Alcance/asignación real; workspace soloowner/admin | Explicitar filtro y selección autorizada; no inventar cifras ni ampliar permisos | PENDIENTE |
| Capturas Customer360 completas | Asier | próxima fuente pertinente | Estado cargado/error antes de capturar; conservar fotos de carga | PENDIENTE |
| Seguridad independiente | Propietarios asignan revisor disponible | No presumir agenteW4 activo | Responsable y alcance exactos; job automático no sustituye revisión | PENDIENTE |

CincoHIGH,escaneo,StorageP0,CI,nativo,backups/restauración y revisión independiente siguen abiertos. F736/CASE_NOTE_CURSOR/a32/137 y fixtures originales conservan causa y alcance; ningún positivo nuevo los repara causalmente por inferencia. IA comercial writesOFF, issue10OPEN, releaseNOT_ACCEPTED.

## Backlog y demostración

Conservar alcance canónico: Clientes/Customer360 → contratos/servicios → cartera/oportunidades → agenda/incidencias → catálogo/SIM/portabilidades → documentos/facturación completa → informes/configuración/equipo → integraciones/IA autorizada. Por aceptación: fuente, entorno, permisos, persistencia, resultado, defecto y responsable. No eliminar módulos para declarar cierre.

Guion privado condicionado: acceso/versión → cliente previo/nuevo y recuperación → texto obligatorio/propuesta/revisión/borrador/recarga → Bpositivo y denegaciones → cierre de sesiones propias. Añadir voz u otro módulo únicamente con evidencia individual en ese deploy; excluir Storage/PDF no aceptados y efectos externos no autorizados.

Historial y evidencias originales permanecen en [353eb86](https://github.com/Asier-Comba/CRM-Telecomunicaciones/blob/353eb862cf7af41f2028cc07a32f004bb0c33e3f/docs/commercial-cloud/DEMO_READINESS.md) y sus checkpoints02/03/04/manifiesto342archivos. Ese historial conserva estados anteriores; no son instrucciones vigentes contradictorias ni motivo para importar producto de nuevo.
