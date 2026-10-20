# Unidad29 — selección21/22 y diagnóstico20

Rama propia existente `codex/demo-cloud-composition-20261020`, PR175.
Checkpoint anterior b9e1eefeea3342b40bdd9584747e9e7ff47bf1cd preservado en historia.
ACK limitado público6300012899. No importación de la rama completa ni172/173 repetidos.

| Entrega | SHA origen | Archivos seleccionados | Prueba propia | SHA integrado |
|---|---|---|---|---|
| CONCEPT21 tests | 7aa8e869fc652f14eee95722c4b804eb97d5b918 | tools/oier_billing_qa/{concept-acceptance.mjs,prompt-interaction.spec.ts} | cinco casos parser y tres anchos UI fallan antes | 41029294 |
| CONCEPT21 fix | 146a5433f28fd22eda0fb96373ffef3b5f2bf5c7 | src/features/billing/parse.ts | 16conceptos/24parser/39UI PASS después | db638940 |
| PAGING22 tests | 6ca6f42cb58470d12699c4adf32e1b636cf7106f | tests/e2e-preview/customer-domain-scope.spec.ts | seis fallos de foco antes,390/768/1440 | e295fe0c |
| PAGING22 fix | d5922d843cac660f6bc954875a289267c5299f2b | src/features/customers/CustomerDomainPages.tsx; banco anterior | nueve PASS después, incluido no robar foco/cursor/ámbito/respuesta tardía | 9851bfe3 |
| caller20 diagnóstico | 3e7f43c043c7f95bd552a7155ffcd14835fb3f4e | scripts/security/supabase-local/product-billing-uncertain-browser.mjs | selección exacta; comprobación sintáctica pendiente con controles globales | e9a98cfc |

Fuente de regresión propia086f5b8c79f903daebf1ea0f19febe13cc19351d,
árbola28a5e11b49834d69a48d9ec8fbd0f9b0cc03df4. Suite propia
tools/integration_qa/oier-selection.config.ts selecciona los bancos existentes sin
alterar assertions, tiempos o reintentos.48/48 Chromium PASS (39facturación+9cliente),
sin retries/skips/flaky. HTTP/SpeechStub controlados: no Auth/DB/cloud/micrófono.
Evidencia local separada qa-selection29/selection-before01,before02,after01.
Lint global, tipos y build por defecto44páginas PASS sobre los mismos blobs de
producto, cierre6300282743. HEAD remoto verificado f315ee7a2b6fce212f8b878be84a64faca9d2e30,
árbol227380533a7230d7967557313085b85dfa80bea2. Su aceptación real-local está en
run39488102448; resultado por SHA en issue67. No desplegar esta copia como candidata
cualificada mientras queden gates abiertos.

## Emisión original — conservación y límites

Run39458747653/job118752349311, checkout5f1eb783d737479abafc78d48e61dd05b72156ad
con árbol6012a6c409733f60282d0ca997d414dd31a11394. Falla únicamente
billing_invalid_receipt_seven_commands_same_intent_single_persisted_effect,
acción billing_invalid_receipt:invoice.issue:first_effect,11037ms,TIMEOUT.
114UI PASS,4042backend; teardown PASS. Es evidencia de esa fuente, no de29.

Artefacto seguro original12282737717 retenido sin alteración,21434bytes,
SHA2564c9fb2e67d58687d0db71407bee496ccc375872b04b11b869be89b8baeaa4522.
Capturas originales12282682770 siguen en GitHub. El resumen tiene dos avisos
INTERNAL_SAFE y transportes invoice.issue200 sin command_id/timestamp correlacionado.
No prueban cuál comando falló, recibo/commit ni efecto único. La fase anterior
agrupaba click, espera del alert y controles de cierre;20 ahora separa esos puntos.
No modifica el producto, las exigencias de negocio ni las esperas.

Causa y efecto originales UNKNOWN. Falta correlación del click y command estable,
solicitud/entradaAPI, Auth/autorización, entrada/salidaRPC, entidad+versión,
ledger+recibo+audit, respuesta y consumoUI/aserción. Un HTTP200 no sustituye la
verificación DB. No se ha repetido el comando original ni creado otro para probarlo.
Docker local no tiene daemon disponible; no se construye otro recurso.
REQUEST6300012899 pide a W5 recurso desechable existente, fuente/config,
fixture nuevo identificado, ventana exclusiva, observación antes/después y limpieza.
La aceptación habitual de CI conserva su recurso aislado/fixtures/teardown; un
resultado nuevo nunca reconstruye retroactivamente la causa original.

W5 mantiene plataforma/deploy, Oier revisión independiente. Sin SQL/lock/permisos,
workflow171 o Storage88 nuevos. Hosted sigue87; IA writes/contenido privado afectado
OFF. CincoHIGH, historia/W4, backups, voz real y acceso privado siguen pendientes.
CORE162 mantiene dos mutaciones; telecom tendrá ventana separada. RELEASE_NOT_ACCEPTED.
