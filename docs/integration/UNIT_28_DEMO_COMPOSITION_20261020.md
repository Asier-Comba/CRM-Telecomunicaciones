# Unidad28 — composición sucesora de demo

Rama exclusiva `codex/demo-cloud-composition-20261020`, desde PR174
`2de857051e9e84aad5e1a1bd088afcee98ba717c`. PR156/a9e y PR174 permanecen
congeladas; esta rama no cancela sus CI. El SHA/árbol final se entrega en issue67.

| Entrega | Selección exacta | Límite |
|---|---|---|
| W5/171 | cherry-pick -x de d38b8b74 y9b3bf619; inventario/uuid_csv y fallback del mismo índice oficial sólo ante rate limit | Sin workflow/runbook171, Storage, migraciones ni configuración alojada |
| Oier/172 | componente IntegratedPortfolio y tres archivos de controles de4bfddd3aa3b7936fe4a61522f8fa11c65dfd9ccd | Dos inserciones de markup; sin reparar causalmente100bf |
| Oier/173 | PromptBuilder y banco prompt-interaction de5f00ab8bf2f1f9cc93ec9a8f88d5a9aaa3842e1e | Conserva corrección humana; SpeechRecognition controlado, no micrófono real |
| Asier/174 | Preparación de factura con contexto conservado | Lecturas; no guardar/emitir automáticamente |

Los dos blobs de producto Oier se verificaron por Git idénticos a sus entregas.
Se preservan sus controles sin modificar expectativas, timeouts ni fixtures.
El selector de suites propio sólo reúne esos controles y regresiones existentes.
No se reimportan161 ni162–169. El diagnóstico170 sigue revisado/separado;
su timeout original conserva causa UNKNOWN, sin atribuirle una reparación.

Contratos comprobados en esta composición: inventario exacto123 nombres/87
migraciones, inventory --check y platform verify PASS. 39 controles dirigidos:
38PASS y1SKIP físico Docker. Esto no sustituye restart/Auth/DB real de esta fuente.
Navegador propio de la composición: **63/63 PASS**, sin reintentos/omisiones/flaky,
390/768/1440; incluye36prompt,9feedback y18regresiones/preparación. Lint global
y build por defecto con TypeScript/44 páginas PASS. Se registran con el SHA final;
no son ejecuciones Auth/DB/hospedadas ni micrófono real.

La nueva evidencia alojada corresponde exclusivamente a **a9e**, no a esta rama:
W5 reporta deploy `6ad78f6c810c781fba4f5880`, árbol
`ac48598bffd8a528919f63f2bcad1d07365c775d`, y QA A/B/roles por API/páginas
en6295242000/6295591477 y docs/w5/CLOUD_HANDOFF.md §11 de15475541.
Adapter efectivo NOT_RECORDED; no recorrido visual B completo ni ejecución Oier.
Las pruebas previas cliente/factura en e42 no se convierten en una creación
textual nueva sobrea9e. CORE162 sigue limitado a dos mutaciones y requiere
acceso/fixtures/ventana independientes; editar cliente/tarifa/contrato/servicio
necesita otra unidad acordada. No usar cuentas re-baneadas ni sesiones compartidas.

Para W5: considerar esta fuente sólo tras sus gates propios, desplegarla como
nueva candidata y devolver app/tree/config/adapter/build/artefacto/deploy/URL.
Conservar el artefacto6ad78f6c para rollback por bytes sin rollbackSQL.
Los dos límites del workflow171 están solicitados en6295767484; no afectan
retroactivamente la evidencia reportada de su despliegue manual.

Sin cambios en los87 SQL, lockfile, admisión Edge, permisos, rutas, dinero,
matriz342 o emisión. Contenido privado afectado e IA writes OFF;
voz real NOT_VERIFIED; W4/cincoHIGH/vendor/backups y aceptación siguen abiertos.
Objetivo: demo privada semana26/10/2026, RELEASE_NOT_ACCEPTED.
