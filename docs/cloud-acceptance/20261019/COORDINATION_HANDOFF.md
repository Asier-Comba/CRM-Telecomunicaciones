# COORDINATION_HANDOFF

Fuente inicial PR156 `5332d9899eb1062a7db6b1800e9f0eda1151bac3`; observación posterior `2cbdc4b66315a52720c19c60e5d7ebe4e6adc996`; propuesta y deploy declarado W5/PR159 `bb16afe512be1cb04d6c86ecadb2064966a062aa`. Fecha de corte 2026-10-19T18:59:45.925355+00:00. CLAIM[6274698885](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6274698885). Las fuentes son candidatas, no composición aceptada. No herencia de PASS entre SHAs.

Peticiones dirigidas a propietarios; ninguna es ACK recibido ni permiso implícito:

| Destino | Petición técnica concreta | Prueba de cierre |
|---|---|---|
| Integrador PR156 | Elegir composición revisada que conserve unidades recientes e incorpore contratoP1/guard dePR159; reconciliar fila a fila | NuevoSHA, diff revisado, contratos/CI/QA exactos; no sumar pruebas de5332/2cbd/bb16 |
| Integrador/W5 | Cerrar diferencias23consumidores PT409, pins86 y manifiesto | Versiones+hashes de migraciones, testsCAS/HTTP y --check propios del nuevoSHA |
| W5 | Permitir auditoría mínima de staging o facilitar exportación firmada y saneada de los ocho grupos deSUPABASE_READONLY_PLAN | Identidad deproyecto/fecha/source/versiones/fingerprints; nada de claves ni datos personales |
| W5 | Conservar netlify.toml saneado y procedencia real del deploy | Ruta+SHA, deployID/source/config/build digest y nombres debindings; sinvalores |
| Integrador/W5 | Abrir ventana QA privada cuando corresponda; no facilitar credenciales aquí | Cohorte sintética por canal privado, rolesA/B, origen/pin y acciones autorizadas/cleanup;18casos listos |
| W5/W4 | Mantener P0Storage abierto y revisar corrección/proof por canal privado | MismoJWT/URL tras revocación, caché/bytes y evaluación independiente; no reproducimos aquí |
| W5/propietarios | Identificar plan/coste/backup y prueba de recuperación aislada | InventarioDB/Auth/Storage/offsite, RPO/RTO y acceso corporativo recuperable |
| Asier Work y Cowork | Aportar inventario propio firmado enGitHub con fecha, SHA/ramas, estado limpio/pendientes y configuración manual | No se certifican sus espacios por ausencia de respuesta |

El SYSTEM_STATE de2cbd ya distingue septiembre como histórico, pero todavía cita el estado cloud anterior86/c597; contrastarlo con W5/6274038554 (87/bb16). No reabrimos el problema resuelto de encabezado histórico ni editamos su documento: pedimos reconciliar la observación cloud fechada.

Los negativos locales y el workflow propio sólo validan el auditor. ReleaseNOT_ACCEPTED, IA writesOFF, modeloNOT_RUN, W4 independiente y cincoHIGH visibles. No cambios de src/migraciones/RLS/hosting/pipelines existentes ni recursos/sesiones de Asier.

Petición concreta publicada: [6274944133](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6274944133). ACK pendiente; ningún silencio se interpreta como aprobación.
