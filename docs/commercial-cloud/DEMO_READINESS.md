# DEMO_READINESS — CRM Telecom

Documento vivo único de aceptación comercial para la semana del 26/10/2026. Actualizado 20/10/2026. **DEMO_NOT_READY; release NOT_ACCEPTED.** No es una autorización de producción.

## Versión y acceso

- Integrador: Asier Work, PR #156, `codex/product-integration-20261019`.
- Checkpoint publicado observado: `3b80c50d13bc0a9a52f6662de46a1e8b9581c62b`, árbol `a8dc2e8d878aef2d0b5eaadbe30ba9dfd9241722`.
- Fuente de producto: `ddf3ef26e6d50cc5bda7d3cb6515d2e8e456014d`, árbol `972ef4edfd204240598a1c7a414f015313c78ead`. Diferencia de `src/tools/tests` frente al checkpoint: ninguna. No se crea una segunda integración.
- Deploy ID/source SHA/build alojados: **NO ENTREGADOS / NO VERIFICADOS**. La referencia Git no identifica por sí misma un despliegue.
- URL restringida: https://crm-telecom-staging-preview.netlify.app/ ; site comunicado `3d75b8b6-701d-4021-8c0e-fec141dbef6f`.
- Lectura HTTP anónima del 20/10 09:38 UTC: **401**, sin seguir redirecciones, iniciar sesión ni cambiar protección. No demuestra estado del login CRM, Auth/DB o plan de Netlify.
- Supabase exclusivamente `crm-telecom-staging` / `zgwotxnyqzfuzcnmgvtn`. 87 migraciones comunicadas/verificadas por W0/W5; este banco no aplica SQL ni las reinicia.
- Cohorte A/B, roles, ventana QA y contexto privado: **PENDIENTES**. No hay credenciales, JWT, cookies ni IDs de usuarios de la cohorte publicados aquí.

## Integración preservada

Revisión de objetos Git sobre el checkpoint publicado: los tres blobs de facturación de la fuente medida `9e3ed4f6331d8756a9fbe6274631297a939af75e` y los diez consumidores comerciales de `49bc242c849a019b4b85fd3da1b3a8c9a45ca179` coinciden exactamente con la candidata. Incluye el parche posterior de archivo; ACK limitado 6289588784. Los ACK previos 6288602043 y 6289164421 conservan sus alcances. Esto acredita incorporación de archivos, **no ejecución ni aceptación hospedada**. [Evidencia de blobs](20261020/evidence/demo-cloud02-source-review.json).

Asier registra sus pruebas por fuente en [handoff 6289865658](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6289865658). La nueva CI de `3b80` estaba activa al recuperar esta unidad; sus resultados no se sustituyen por los 357/96 de Oier ni por el positivo físico local de `1f49`.

## Funcionalidades demostrables en la URL

| Recorrido | Estado alojado actual | Condición para incluirlo en la demo |
|---|---|---|
| Acceso Netlify y login CRM | NOT_RUN; entrada anónima 401 | Acceso normal privado y sesión sintética autorizados |
| Dashboard / workspace / rol | NOT_RUN | Identidad de servidor y rol visibles coincidentes; consultas reales sin fallback |
| Cliente previo y cliente nuevo | NOT_RUN | Recibo explícito, recarga y nueva lectura del mismo ID/versión |
| Customer360 | NOT_RUN | Ficha nueva recuperada desde el backend; no extender aceptación a todas sus áreas |
| Facturación textual | NOT_RUN | Propuesta editable: instalación de fibra, base 300 EUR, IVA 63, total 363, quince días |
| Borrador y recuperación | NOT_RUN | Revisión humana, una creación, sin número/emisión; recarga UI/API en 390/768/1440 |
| Aislamiento entre empresas | NOT_RUN | B con lectura positiva propia; denegación cerrada de cliente/factura A |
| Voz real | NOT_RUN | Micrófono y transcripción españoles reales en dispositivo/ventana autorizados; no SpeechStub |
| PDF / documentos privados | EXCLUIDOS por P0 Storage | Contrato/Storage/W4 independientes antes de incluirlos |
| Otros módulos / asistente | NOT_RUN | Aceptación alojada individual; modelo vivo NOT_RUN, escrituras IA OFF |

Ninguna fila es HOSTED_PASS hoy. La evidencia controlada y el parser determinista no son IA generativa ni persistencia alojada. La comprobación DB independiente de los IDs creados queda separada de la respuesta UI/API y del journal.

## Banco existente, preparado para ejecutar

`tools/oier_cloud_qa` se conserva y amplía; no se regenera. Fuente QA `49a032cfb0f82c850f8fec4f9ae3c150d6394699`: 12 controles locales del runner, lint y TypeScript completos. Preflight real sin manifest: NOT_RUN/código 2 antes de navegador/red/cloud. No son 12 casos alojados. La aplicación permanece en la referencia `49bc`; no se repiten ni reasignan sus 357/96/build.

Manifest consumidor v2 exige fuente/deploy coincidentes, referencias exactas de los responsables, ventana vigente y roles ya existentes owner/admin A/B (facturación exige esos roles). Incluye cliente sintético previo A y cliente/factura propios B. Comprueba workspace/rol de servidor antes de escribir, cliente tras recarga, dos operaciones máximas y primer fallo saneado. Preserva los dos fallos originales de requisitos de rol del banco en 79cc, corregidos en 49a0. No modifica permisos para hacerlos pasar. [Checkpoint QA](20261020/DEMO_CLOUD02.json).

## Riesgos y responsables

- **W5/Cowork:** confirmar team real del site y aviso de operational credits de DuñaTeam, capacidad oficial de despliegue, deploy/source/build y Team Protection. El aviso procede del propietario; no se ha verificado en el proveedor. No se atribuye a Supabase.
- **Propietario:** si Cowork confirma que el team correcto tiene despliegues pausados, resolver el plan/saldo desde la facturación oficial de ese team y autorizar el despliegue privado. No se solicita contraseña o pago en GitHub. No se crean sitios alternativos ni se cambia protección desde Oier.
- **Asier:** designar fuente de demo/condición de entrega y cerrar sus controles sobre el SHA exacto. **W5:** entregar deploy y acceso privado/cohorte/ventana existentes. Solicitud concreta [6289917270](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6289917270).
- P0 Storage, cinco HIGH, escaneo, perfil nativo 87/manifiestos y W4 independientes siguen abiertos; no suprimirlos ni autoaprobar. Los fallos F736, CASE_NOTE_CURSOR, a32/137 y fixture/interrupciones conservan sus evidencias y causas no demostradas.
- La denominación de transporte `integrated_local` no acredita que el destino sea local: revisar la cadena de configuración/SDK antes de corregir textos. No presentar datos mock como alojados ni listas vacías ante errores como ausencia real.

## Guion comercial de 5–10 minutos

**Guion condicionado, todavía no autorizado como demostración probada.** Hoy no existe un recorrido cloud superado que se pueda prometer.

1. 0–1 min: abrir la URL privada legítima e indicar versión/deploy y datos sintéticos persistidos; login A y workspace/rol verificados.
2. 1–3 min: abrir cliente previo, crear Bilbao Telecom Demo SL, confirmar recibo, recargar y recuperar la ficha.
3. 3–6 min: introducir la frase textual obligatoria de fibra por 300 EUR + 21 % IVA y quince días; revisar/editar propuesta, guardar explícitamente un borrador y recargarlo. Sin emisión ni cobro automático.
4. 6–8 min: demostrar B con acceso positivo a sus datos y denegación del registro A; cerrar ambas sesiones. Mostrar únicamente evidencia saneada, nunca cuentas privadas.
5. 8–10 min: solo si hay aceptación propia de voz u otro módulo en ese deploy, añadirlo. Excluir PDF/Storage, funcionalidades desactivadas y cualquier ruta no probada.

Antes de cambiar a DEMO_READY deben cumplirse acceso, identidad de deploy, login, persistencia de cliente/borrador, aislamiento y ausencia de P0 crítico en estas rutas. Release comercial exige además seguridad/W4/CI/backups/restore y aceptación canónica; una demo privada no los sustituye.